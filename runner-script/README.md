# Runner script

Source code for the script which runs the AVM in the background

## Overview

The project relies heavily on [threads.js](https://github.com/andywer/threads.js). It takes advantage of the unified abstraction to run the same script in both web workers and worker threads. The runner script is responsible to instantiate AVM, allocate necessary resources and execute calls to AVM.

The source code is built and minified using WebPack. There are two configurations:

-   webpack.config.node.js for node build target
-   webpack.config.web.js for web build target

To build package locally:

```
npm run build:node
npm run build:web
```

`avm-worker-background` uses both of the build to embed into the host library
