import { LogLevel, CallResultsArray, InterpreterResult } from '@fluencelabs/avm-runner-interface';
import { AirInterpreter } from '@fluencelabs/avm';
import { isBrowser, isNode, isWebWorker } from 'browser-or-node';
import { expose } from 'threads';
import { wasmLoadingMethod, RunnerScriptInterface } from './types';

const logFunction = (level: LogLevel, message: string) => {
    switch (level) {
        case 'error':
            console.error(message);
            break;
        case 'warn':
            console.warn(message);
            break;
        case 'info':
            console.info(message);
            break;
        case 'debug':
        case 'trace':
            console.log(message);
            break;
    }
};

let airInterpreter: AirInterpreter | null = null;

const toExpose: RunnerScriptInterface = {
    init: async (logLevel: LogLevel, loadMethod: wasmLoadingMethod) => {
        console.log('RUNNER: inside init function');
        let module: WebAssembly.Module;
        if (isBrowser || isWebWorker) {
            if (loadMethod.method !== 'fetch-from-url') {
                throw new Error("Only 'fetch-from-url' is supported for browsers");
            }

            const url = loadMethod.baseUrl + loadMethod.filePath;

            try {
                module = await WebAssembly.compileStreaming(fetch(url));
            } catch (e) {
                throw new Error(
                    `Failed to load ${
                        loadMethod.filePath
                    }. This usually means that the web server is not serving avm file correctly. Original error: ${e.toString()}`,
                );
            }
        } else if (isNode) {
            if (loadMethod.method !== 'read-from-fs') {
                throw new Error("Only 'read-from-fs' is supported for nodejs");
            }

            try {
                // webpack will complain about missing dependencies for web target
                // to fix this we have to use eval('require')
                const fs = eval('require')('fs');
                const file = fs.readFileSync(loadMethod.filePath);
                module = await WebAssembly.compile(file);
            } catch (e) {
                throw new Error(
                    `Failed to load ${
                        loadMethod.filePath
                    }. Did you forget to install @fluencelabs/avm? Original error: ${e.toString()}`,
                );
            }
        } else {
            throw new Error('Environment not supported');
        }
        console.log('RUNNER: creating interpreter');
        airInterpreter = await AirInterpreter.create(module, logLevel, logFunction);
        console.log('RUNNER: created interpreter');
    },

    terminate: async () => {
        console.log('RUNNER: terminating');
        airInterpreter = null;
        console.log('RUNNER: terminated');
    },

    run: async (
        air: string,
        prevData: Uint8Array,
        data: Uint8Array,
        params: {
            initPeerId: string;
            currentPeerId: string;
        },
        callResults: CallResultsArray,
    ): Promise<InterpreterResult> => {
        console.log('RUNNER: running interpreter');
        if (airInterpreter === null) {
            throw new Error('Interpreter is not initialized');
        }
        return airInterpreter.invoke(air, prevData, data, params, callResults);
    },
};

expose(toExpose);
