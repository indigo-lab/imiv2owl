const parse = require("imiv-parser").parse;

const isDatatype = function(a) {
  return a.indexOf("xsd:") === 0 || a === "ic:電話番号型" || a === "uncefactISO4217:ISO3AlphaCurrencyCodeContentType";
};

module.exports = function(imiv) {
  const json = parse(imiv);

  // 正規化
  json.forEach(a => {
    a.metadata = a.metadata || [];
    a.restriction = a.restriction || [];

    // xsd:anyURI は owl:Thing に変更する必要がある
    a.restriction.forEach(b => {
      if (b.type === "type" && b.prefix === "xsd" && b.name === "anyURI") {
        b.prefix = "owl";
        b.name = "Thing";
      };
    });

    if (a.type === "set") {
      a.p = a.property.prefix + ":" + a.property.name;
      a.c = a.class.prefix + ":" + a.class.name;
    } else if (a.type === "class") {
      a.c = a.prefix + ":" + a.name;
      a.restriction.filter(b => b.type).forEach(b => {
        b.c = b.prefix + ":" + b.name;
      });
    } else if (a.type === "property") {
      a.p = a.prefix + ":" + a.name;
      a.restriction.filter(b => b.type).forEach(b => {
        b.c = b.prefix + ":" + b.name;
      });
    } else if (a.type === "vocabulary" && a.data === "http://imi.go.jp/ns/core/2#") {
      // コア語彙の場合は RDF 用 URI に変換する必要がある
      a.data = "http://imi.go.jp/ns/core/rdf";
    }
  });

  const jsonld = {
    "@context": {
      "owl": "http://www.w3.org/2002/07/owl#",
      "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
      "xsd": "http://www.w3.org/2001/XMLSchema#",
      "schema": "http://schema.org/",
      "dct": "http://purl.org/dc/terms/",
      "foaf": "http://xmlns.com/foaf/0.1/",
      "ic": "http://imi.go.jp/ns/core/rdf#",
      "uncefactISO4217": "urn:un:unece:uncefact:codelist:standard:ISO:ISO3AlphaCurrencyCode:2012-08-31#"
    },
    "@graph": []
  };

  ["foaf:homepage",
    "dct:license",
    "rdfs:range",
    "schema:domainIncludes",
    "owl:onProperty",
    "owl:onDataRange",
    "owl:onClass",
    "owl:allValuesFrom",
    "rdfs:subClassOf",
    "owl:onDatatype"
  ].forEach(a => {
    jsonld["@context"][a] = {
      "@type": "@id"
    };
  });

  const add = function(s, p, o) {
    if (o.data !== undefined)
      o = {
        "@value": o.data,
        "@language": o.language
      };

    // 特定のプロパティでは language tag のデフォルト設定が必要
    if (["rdfs:label", "rdfs:comment", "foaf:name"].indexOf(p) !== -1 && o["@language"] === undefined)
      o["@language"] = "ja";

    if (o["@value"] && !o["@language"] && !o["@id"]) o = o["@value"];
    if (s[p] === undefined) s[p] = o;
    else if (Array.isArray(s[p])) s[p].push(o);
    else s[p] = [s[p], o];
  };

  json.filter(a => a.type === "vocabulary").forEach(a => {
    var ontology = {
      "@id": a.data,
      "@type": "owl:Ontology"
    };

    var creators = {};
    a.metadata.filter(b => b.type === "creator" || b.type === "creator_ref").forEach(b => {
      if (creators[b.group] === undefined) creators[b.group] = {};
      if (b.type === "creator") add(creators[b.group], "foaf:name", b);
      else add(creators[b.group], "foaf:homepage", b.data);
    });
    Object.values(creators).forEach(a => {
      add(ontology, "dct:creator", a);
    });

    a.metadata.forEach(b => {
      if (b.type === "name") add(ontology, "rdfs:label", b);
      if (b.type === "description") add(ontology, "rdfs:comment", b);
      if (b.type === "published_date") add(ontology, "dct:issued", b);
      if (b.type === "version") add(ontology, "owl:versionInfo", b);
      if (b.type === "license_ref") add(ontology, "dct:license", b.data);
    });
    //  jsonld["@graph"].push(a);
    jsonld["@graph"].push(ontology);
  });

  // ic:人型 a owl:Class ;
  // rdfs:label "人"@ja, "Person"@en ;
  // rdfs:comment "人の情報を表現するためのクラス用語"@ja, "A class term to express information of a person."@en ;
  // rdfs:subClassOf ic:実体型

  json.filter(a => a.type === "class").forEach(a => {

    // 電話番号型はイレギュラーなので固定値を返す
    if (a.c === "ic:電話番号型") {
      jsonld["@graph"].push({
        "@id": "ic:電話番号型",
        "@type": "rdfs:Datatype",
        "rdfs:label": [{
          "@value": "電話番号",
          "@language": "ja"
        }, {
          "@value": "Telephone number",
          "@language": "en"
        }],
        "rdfs:comment": [{
          "@value": "電話番号を表現するためのクラス用語 ※0-9 の数字及び + - ( ) , の文字のみを使用",
          "@language": "ja"
        }, {
          "@value": "A class term to express a telephone number. Note: Use '0 to 9' numeric characters and 'plus '+', minus '-', opening parenthesis '(', closing parenthesis ')', and comma ',' 'characters only.",
          "@language": "en"
        }],
        "owl:equivalentClass": {
          "owl:onDatatype": "xsd:string"
        }
      });
      return;
    }

    // Deprecated class の場合は @type が変わることに注意
    var def = {
      "@id": a.c,
      "@type": a.deprecated ? "owl:DeprecatedClass" : "owl:Class"
    };

    a.restriction.forEach(b => {
      if (b.type === "type") add(def, "rdfs:subClassOf", b.c)
    });
    a.metadata.forEach(b => {
      // クラスの場合、TTL/JSOND ではラベル末尾の '型' を削除している運用らしい
      if (b.type === "name") b.data = b.data.replace(/型$/, "");
      if (b.type === "name") add(def, "rdfs:label", b);
      if (b.type === "description") add(def, "rdfs:comment", b);
    });

    //  jsonld["@graph"].push(a);
    jsonld["@graph"].push(def);
  });


  //ic:体系 a owl:ObjectProperty ;
  //        rdfs:label "体系"@ja, "Reference system"@en ;
  //        rdfs:comment "IDの体系を記述するためのプロパティ用語"@ja, "The system for specifying identifiers."@en ;
  //        schema:domainIncludes ic:ID型 ;
  //        rdfs:range ic:ID体系型

  json.filter(a => a.type === "property").forEach(a => {
    var def = {
      "@id": a.p
    };
    a.restriction.forEach(b => {
      // Deprecated/Datatype/Object の使い分けに注意
      if (b.type === "type") {
        if (a.deprecated) {
          def["@type"] = "owl:DeprecatedProperty";
        } else if (isDatatype(b.c)) {
          def["@type"] = "owl:DatatypeProperty";
          add(def, "rdfs:range", b.c);
        } else {
          def["@type"] = "owl:ObjectProperty";
          add(def, "rdfs:range", b.c);
        }
      }
    });

    a.metadata.forEach(b => {
      if (b.type === "name") add(def, "rdfs:label", b);
      if (b.type === "description") add(def, "rdfs:comment", b);
    });

    //  jsonld["@graph"].push(a);
    jsonld["@graph"].push(def);
  });


  const classes = [];
  json.filter(a => a.type === "set" && a.deprecated !== true).forEach(a => {
    jsonld["@graph"].filter(b => b["@id"] === a.p).forEach(b => {
      add(b, "schema:domainIncludes", a.c);
    });
    if (classes.indexOf(a.c) === -1) classes.push(a.c);
  });

  classes.forEach(root => {
    var x = {
      "@id": root,
      "@type": "owl:Class"
    };

    // deprecated set は無視する
    json.filter(a => a.type === "set" && a.c === root && a.deprecated !== true).forEach(a => {
      var propertyDefinition = jsonld["@graph"].find(b => b["@id"] === a.p);
      if (propertyDefinition === undefined) {
        console.error("property" + a.p);
        return;
      }
      var range = propertyDefinition["rdfs:range"];
      var obj = {
        "@type": "owl:Restriction",
        "owl:onProperty": a.p
      };
      a.restriction.forEach(c => {
        // range が owl:Thing の場合には maxCardinality を使うことに注意
        if (c.type === "cardinality" && c.max !== undefined) {
          add(obj, range === "owl:Thing" ? "owl:maxCardinality" : "owl:maxQualifiedCardinality", c.max);
        }
      });

      // cardinality がセットされている場合の条件
      if (obj["owl:maxQualifiedCardinality"] !== undefined) {
        if (isDatatype(range))
          obj["owl:onDataRange"] = range;
        else
          obj["owl:onClass"] = range;
      } else if (obj["owl:maxCardinality"] === undefined) {
        obj["owl:allValuesFrom"] = range;
      }

      // set の name->rdfs:label は採用しない
      a.metadata.forEach(c => {
        if (c.type === "description") add(obj, "rdfs:comment", c);
        //        if (c.type === "name") add(obj, "rdfs:label", c);
      });
      add(x, "rdfs:subClassOf", obj);
    });
    jsonld["@graph"].push(x);

  });
  return jsonld;
}
