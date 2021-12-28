#!/bin/sh

# set current working directory to script directory to run script from everywhere
cd "$(dirname "$0")"

(
    cd test-project
    npm i
    npm run install:local
    npm run build
)
