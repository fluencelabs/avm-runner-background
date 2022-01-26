import { WASI } from '@wasmer/wasi';
import { WasmFs } from '@wasmer/wasmfs';
import { LogLevel, CallResultsArray, InterpreterResult, CallRequest } from '@fluencelabs/avm-runner-interface';
import { isBrowser, isNode, isWebWorker } from 'browser-or-node';
import { expose } from 'threads';
import { wasmLoadingMethod, RunnerScriptInterface } from './types';
import { init } from '@fluencelabs/marine-js';
// import bindingsNode from '@wasmer/wasi/lib/bindings/node';
import bindings from '@wasmer/wasi/lib/bindings/browser';

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

type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

let marineInstance: Awaited<ReturnType<typeof init>> | 'not-set' | 'terminated' = 'not-set';

const tryLoadFromUrl = async (baseUrl: string, url: string): Promise<WebAssembly.Module> => {
    url = baseUrl + '/' + url;
    try {
        return await WebAssembly.compileStreaming(fetch(url));
    } catch (e) {
        throw new Error(
            `Failed to load ${url}. This usually means that the web server is not serving wasm files correctly. Original error: ${e.toString()}`,
        );
    }
};

const tryLoadFromFs = async (path: string): Promise<WebAssembly.Module> => {
    try {
        // webpack will complain about missing dependencies for web target
        // to fix this we have to use eval('require')
        const fs = eval('require')('fs');
        const file = fs.readFileSync(path);
        return await WebAssembly.compile(file);
    } catch (e) {
        throw new Error(
            `Failed to load ${path}. Did you forget to install @fluencelabs/avm? Original error: ${e.toString()}`,
        );
    }
};

const decoder = new TextDecoder();
const encoder = new TextEncoder();

const toExpose: RunnerScriptInterface = {
    init: async (logLevel: LogLevel, loadMethod: wasmLoadingMethod) => {
        let avmModule: WebAssembly.Module;
        let marineModule: WebAssembly.Module;
        // let bindings;
        if (isBrowser || isWebWorker) {
            if (loadMethod.method !== 'fetch-from-url') {
                throw new Error("Only 'fetch-from-url' is supported for browsers");
            }
            avmModule = await tryLoadFromUrl(loadMethod.baseUrl, loadMethod.filePaths.avm);
            marineModule = await tryLoadFromUrl(loadMethod.baseUrl, loadMethod.filePaths.marine);
            // bindings = bindingsNode;
        } else if (isNode) {
            if (loadMethod.method !== 'read-from-fs') {
                throw new Error("Only 'read-from-fs' is supported for nodejs");
            }

            avmModule = await tryLoadFromFs(loadMethod.filePaths.avm);
            marineModule = await tryLoadFromFs(loadMethod.filePaths.marine);
            // bindings = bindingsBrowser;
        } else {
            throw new Error('Environment not supported');
        }

        const wasmFs = new WasmFs();

        const wasi = new WASI({
            // Arguments passed to the Wasm Module
            // The first argument is usually the filepath to the executable WASI module
            // we want to run.
            args: [],

            // Environment variables that are accesible to the WASI module
            env: {},

            // Bindings that are used by the WASI Instance (fs, path, etc...)
            // bindings: {
            //     hrtime: () => BigInt(0),
            //     exit: (rval: number) => {},
            //     kill: (signal: string) => {},
            //     randomFillSync: <T>(buffer: T, offset: number, size: number) => buffer,
            //     isTTY: (fd: number) => false,
            //     fs: wasmFs.fs,
            //     path: undefined,
            // },
            bindings: {
                ...bindings,
                fs: wasmFs.fs,
            },
        });

        const avmInstance = await WebAssembly.instantiate(avmModule, {
            ...wasi.getImports(avmModule),
            host: {
                log_utf8_string: (level: any, target: any, offset: any, size: any) => {
                    console.log('logging, logging, logging');
                },
            },
        });
        wasi.start(avmInstance);

        marineInstance = await init(marineModule);

        const customSections = WebAssembly.Module.customSections(avmModule, 'interface-types');
        const itcustomSections = new Uint8Array(customSections[0]);
        marineInstance.register_module('avm', itcustomSections, avmInstance);
    },

    terminate: async () => {
        marineInstance = 'not-set';
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
        if (marineInstance === 'not-set') {
            throw new Error('Interpreter is not initialized');
        }

        if (marineInstance === 'terminated') {
            throw new Error('Interpreter is terminated');
        }

        try {
            const callResultsToPass: any = {};
            for (let [k, v] of callResults) {
                callResultsToPass[k] = {
                    ret_code: v.retCode,
                    result: v.result,
                };
            }

            //const paramsToPass = encoder.encode(
            // const paramsToPass = JSON.stringify({
            const paramsToPass = {
                init_peer_id: params.initPeerId,
                current_peer_id: params.currentPeerId,
            };
            //);

            const avmArg = JSON.stringify([
                air,
                Array.from(prevData),
                Array.from(data),
                paramsToPass,
                Array.from(Buffer.from(JSON.stringify(callResultsToPass))),
            ]);

            console.log(avmArg);
            const rawResult = marineInstance.call_module('avm', 'invoke', avmArg);

            let result: any;
            try {
                result = JSON.parse(rawResult);
            } catch (ex) {}

            const callRequestsStr = decoder.decode(new Uint8Array(result.call_requests));
            let parsedCallRequests;
            try {
                if (callRequestsStr.length === 0) {
                    parsedCallRequests = {};
                } else {
                    parsedCallRequests = JSON.parse(callRequestsStr);
                }
            } catch (e) {
                throw "Couldn't parse call requests: " + e + '. Original string is: ' + callRequestsStr;
            }

            let resultCallRequests: Array<[key: number, callRequest: CallRequest]> = [];
            for (const k in parsedCallRequests) {
                const v = parsedCallRequests[k];

                let arguments_;
                let tetraplets;
                try {
                    arguments_ = JSON.parse(v.arguments);
                } catch (e) {
                    throw "Couldn't parse arguments: " + e + '. Original string is: ' + arguments_;
                }

                try {
                    tetraplets = JSON.parse(v.tetraplets);
                } catch (e) {
                    throw "Couldn't parse tetraplets: " + e + '. Original string is: ' + tetraplets;
                }

                resultCallRequests.push([
                    k as any,
                    {
                        serviceId: v.service_id,
                        functionName: v.function_name,
                        arguments: arguments_,
                        tetraplets: tetraplets,
                    },
                ]);
            }
            return {
                retCode: result.ret_code,
                errorMessage: result.error_message,
                data: result.data,
                nextPeerPks: result.next_peer_pks,
                callRequests: resultCallRequests,
            };
        } catch (e) {
            return {
                retCode: -1,
                errorMessage: 'marine-js call failed, ' + e,
                data: undefined,
                nextPeerPks: undefined,
                callRequests: undefined,
            };
        }
    },
};

expose(toExpose);
