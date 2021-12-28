# Tests for `AvmRunnerBackground` usage in browsers

Browser tests are made of two moving parts:

-   Test project which uses WebPack to make a bundle for browsers
-   The test shell which spins a WebPack's dev server and performs the test via puppeteer

## Test project

Test project simulates `AvmRunnerBackground` usage in browser-targeted application. To simulate full development cycle `avm-runner-background` is installed locally as if it was taken from npm. This is possible thanks to [install-local](https://github.com/nicojs/node-install-local) package. The installation can be simulated by the `npm run install:local` command.

To run test project in dev mode:

```bash
npm i
npm run install:local
npm start
```

## Running the tests

First build the `avm-runner-background` package.

In `$repo_root/avm-runner-background` run:

```bash
npm i
./build_runner.sh
npm run build
```

Then in `$repo_root/tests/web` run:

```bash
./build_test_project.sh
npm install
npm run test
```
