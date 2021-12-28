# Background implementations for AVM Runner

`AvmRunnerBackground` is the implementation of AVM Runner which doesn't block main thread and runs in the background.

AVM Runner is the abstraction over Aqua Virtual Machine (AVM). It is allows to run AVM in different contexts, e.g. web workers in browsers or worker threads on nodejs.

## Project structure

- [avm-runner-background](avm-runner-background/README.md): the main package published to npm. Provides `AvmRunnerBackground` class.
- [runner-script](runner-script/README.md): web workers and worker threads script which runs AVM
- [tests/node](tests/node/README.md): testing usage of `avm-worker-background` in nodejs
- [tests/node-negative](tests/node-negative/README.md): web workers and worker threads script which runs AVM.
- [tests/web](tests/web/R:EADME.md): testing usage of `avm-worker-background` in web.

## Contributing

While the project is still in the early stages of development, you are welcome to track progress and contribute. As the project is undergoing rapid changes, interested contributors should contact the team before embarking on larger pieces of work. All contributors should consult with and agree to our [basic contributing rules](CONTRIBUTING.md).

## License

[Apache 2.0](LICENSE)
