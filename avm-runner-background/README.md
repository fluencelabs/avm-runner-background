# AVM runner implementation which executes in the background.

`AvmRunnerBackground` is the implementation of AVM Runner which doesn't block main thread and runs in the background.

AVM Runner is the abstraction over Aqua Virtual Machine (AVM). It is allows to run AVM in different contexts, e.g. web workers in browsers or worker threads on nodejs.

## Getting started

To use `AvmRunnerBackground` with Fluence JS refer to the [documentation](https://doc.fluence.dev/docs/fluence-js)

## Overview

The project relies heavily on [threads.js](https://github.com/andywer/threads.js). It takes advantage of the unified abstraction to run the same script in both web workers and worker threads. Two script versions (one for nodejs and one for web) are embedded as base64 in code. The hosts pick one corresponding to the environment and loads it as blob URLs.

The worker script source can be found in the [runner-script](../runner-script/README.md) directory

AVM wasm file is required to run worker. It is not bundled and provided by `@fluencelabs/avm` package. The loading methods are different for nodejs and web environments:

-   node: wasm file is loaded from the filesystem. By default the runner locates in the node_modules.
-   web: wasm file is loaded from the server via http request. The end-user is responsible for web server configuration. `@fluencelabs/avm` provides `copyAvm` binary which helps distributing the wasm file.

## Building

First you need to build the runner script:

```
./build_runner.sh
```

Then build the npm package:

```
npm install
npm run build
```

## License

[Apache 2.0](LICENSE)
