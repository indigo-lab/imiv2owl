#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const imiv2owl = require('../imiv2owl');

const rl = readline.createInterface({
  input: process.argv.length < 3 ? process.stdin : fs.createReadStream(process.argv[2], 'UTF-8'),
  crlfDelay: Infinity
});

const lines = [];

rl.on('line', (line) => {
  lines.push(line);
}).on('close', () => {
  const result = imiv2owl(lines.join('\n'));
  console.log(JSON.stringify(result, null, 2));
});
