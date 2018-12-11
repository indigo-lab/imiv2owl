#!/usr/bin/env node

if (process.argv.length < 3) {
  console.error("usage: imiv2owl [path_to_imiv]");
  process.exit(1);
}

const fs = require('fs');
const imiv2owl = require('../imiv2owl');
const result = imiv2owl(fs.readFileSync(process.argv[2], "UTF-8"));
console.log(JSON.stringify(result, null, 2));
