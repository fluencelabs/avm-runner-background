#!/bin/sh

# set current working directory to script directory to run script from everywhere
cd "$(dirname "$0")"

(
    cd ../runner-script
    npm i
    npm run build:web
    npm run build:node
)

mkdir -p dist
cp ../runner-script/dist/web.js dist/runnerScript.web.js
cp ../runner-script/dist/node.js dist/runnerScript.node.js