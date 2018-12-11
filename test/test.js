const expect = require('chai').expect;
const jsonld = require('jsonld');
const fs = require('fs');
const imiv2owl = require("../imiv2owl");

const imiv = fs.readFileSync(__dirname + "/imicore241.imiv", "UTF-8");
const json = JSON.parse(fs.readFileSync(__dirname + "/imicore241.jsonld", "UTF-8"));

const tree = function(target, id) {
  const x = target.find(a => a["@id"] === id);
  Object.keys(x).filter(k => Array.isArray(x[k])).forEach(k => {
    x[k] = x[k].map(a => (!a["@id"] || !a["@id"].match(/^_/)) ? a : tree(target, a["@id"]));
    x[k].sort((o1, o2) => {
      const s1 = JSON.stringify(o1);
      const s2 = JSON.stringify(o2);
      return s1 < s2 ? -1 : (s1 > s2 ? 1 : 0);
    });
  });
  if (id.match(/^_/)) delete x["@id"];
  return x;
};

(async function() {
  const actual = await jsonld.flatten(imiv2owl(imiv));
  const expected = await jsonld.flatten(json);

  describe('IMIV2OWL', function() {

    describe('simple', function() {
      it(`simple.imiv の変換結果が simple.jsonld と一致すること`, function() {
        const ac = imiv2owl(fs.readFileSync(__dirname + "/simple.imiv", "UTF-8"));
        const ex = JSON.parse(fs.readFileSync(__dirname + "/simple.jsonld", "UTF-8"));
        expect(ac).to.deep.equal(ex);
      });
    });


    describe('トリプル数', function() {
      it(`主語の総数が ${expected.length} であること`, function() {
        expect(actual).to.have.lengthOf(expected.length);
      });
      const p = [actual, expected].map(a => a.reduce((s, c) => s + Object.keys(c).length, 0));
      it(`述語の総数が ${p[1]} であること`, function() {
        expect(p[0]).to.equal(p[1]);
      });
      const o = [actual, expected].map(a => a.reduce((s, c) => s + Object.keys(c).reduce((t, k) => t + c[k].length, 0), 0));
      it(`目的語の総数が ${o[1]} であること`, function() {
        expect(o[0]).to.equal(o[1]);
      });
    });

    describe('主語・述語', function() {

      it('主語の URI のセットが一致すること', function() {
        const x = [actual, expected].map(a => {
          const b = {};
          a.map(c => c["@id"]).filter(c => !c.match(/^_/)).forEach(c => {
            b[c] = b[c] ? b[c] + 1 : 1;
          });
          return b;
        });
        expect(Object.keys(x[0])).to.have.members(Object.keys(x[1]));
      });
      it('主語の URI の登場回数が一致すること', function() {
        const x = [actual, expected].map(a => {
          const b = {};
          a.map(c => c["@id"]).filter(c => !c.match(/^_/)).forEach(c => {
            b[c] = b[c] ? b[c] + 1 : 1;
          });
          return b;
        });
        expect(x[0]).to.deep.equal(x[1]);
      });
      it('述語の URI のセットが一致すること', function() {
        const x = [actual, expected].map(a => {
          const b = {};
          a.forEach(s => {
            Object.keys(s).forEach(c => {
              b[c] = b[c] ? b[c] + 1 : 1;
            });
          });
          return b;
        });
        expect(Object.keys(x[0])).to.have.members(Object.keys(x[1]));
      });

      it('述語の URI の登場回数が一致すること', function() {
        const x = [actual, expected].map(a => {
          const b = {};
          a.forEach(s => {
            Object.keys(s).forEach(c => {
              b[c] = b[c] ? b[c] + 1 : 1;
            });
          });
          return b;
        });
        expect(x[0]).to.deep.equal(x[1]);
      });
    });

    describe('個別の定義の完全一致', function() {
      actual.filter(a => !a["@id"].match(/^_/)).forEach(a => {
        it(`deep equal <${a["@id"]}>`, function() {
          const x = tree(actual, a["@id"]);
          const y = tree(expected, a["@id"]);
          expect(x).to.deep.equal(y);
        });
      });
    });
  });
  run();
})();
