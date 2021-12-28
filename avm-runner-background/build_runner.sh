#!/bin/sh

# set current working directory to script directory to run script from everywhere
cd "$(dirname "$0")"

(
    cd ../runner-script
    npm i
    npm run build:web
    npm run build:node
)

## base64 on MacOS doesn't have -w option
if echo | base64 -w0 > /dev/null 2>&1;
then
  web=$(base64 -w0 ../runner-script/dist/web.js)
  node=$(base64 -w0 ../runner-script/dist/node.js)
else
  web=$(base64 ../runner-script/dist/web.js)
  node=$(base64 ../runner-script/dist/node.js)
fi

cat << EOF > ./src/runnerBase64.ts
// auto-generated
export const web = "${web}"
export const node = "${node}"
EOF
