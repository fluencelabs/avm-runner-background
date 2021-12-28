const fs = require('fs');
const path = require('path');

const wasmName = 'avm.wasm';
const modulePath = require.resolve('@fluencelabs/avm');
const source = path.join(path.dirname(modulePath), wasmName);
const destPath = path.join(__dirname, 'public');
const dest = path.join(destPath, wasmName);

console.log('ensure directory exists: ', destPath);
fs.mkdirSync(destPath, { recursive: true });

console.log('copying AVM wasm');
console.log('from: ', source);
console.log('to: ', dest);
fs.copyFileSync(source, dest);

console.log('done!');
