#! /usr/bin/env node

import fs from 'fs';
import path from 'path';

const firstArgument = process.argv[2];

if (!firstArgument) {
    console.log('Specify destination directory');
    process.exit(1);
}

let destPath = firstArgument;
if (!path.isAbsolute(destPath)) {
    destPath = path.join(process.cwd(), destPath);
}

const scriptName = 'runnerScript.web.js';
const packageName = '@fluencelabs/avm-runner-background';

const modulePath = require.resolve(packageName);
const source = path.join(path.dirname(modulePath), scriptName);
const dest = path.join(destPath, scriptName);

console.log('ensure directory exists: ', destPath);
fs.mkdirSync(destPath, { recursive: true });

console.log('copying avm runner script');
console.log('from: ', source);
console.log('to: ', dest);
fs.copyFileSync(source, dest);

console.log('done!');
