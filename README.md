# imiv2owl
Generate OWL ontology from imiv

# Usage

## install

```sh
$ npm i indigo-lab/imiv2owl
```

## CLI


from file:

```sh
$ wget https://imi.go.jp/ns/core/241/imicore241.imiv
$ imiv2owl imicore241.imiv > imicore241.jsonld
```

from stdin:

```sh
$ curl -s https://imi.go.jp/ns/core/241/imicore241.imiv | imiv2owl > imicore241.jsonld
```

## API

```js
const imiv2owl = require('imiv2owl');

const jsonld = imiv2owl(`
#prefix ex: "http://example.org/"
#prefix xsd: "http://www.w3.org/2001/XMLSchema#"
vocabulary "http://example.org/" ;

class ex:Animal;
class ex:Cat{@ex:Animal};
property ex:say{@xsd:string};
set ex:Animal>ex:say;

`);

```
