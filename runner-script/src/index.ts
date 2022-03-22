import { WASI } from '@wasmer/wasi';
import { WasmFs } from '@wasmer/wasmfs';
import bindings from '@wasmer/wasi/lib/bindings/browser';
import { LogLevel, CallResultsArray, InterpreterResult, CallRequest } from '@fluencelabs/avm-runner-interface';
import { expose } from 'threads';
import { Config, RunnerScriptInterface } from './types';
import { init } from '@fluencelabs/marine-js';

type LogImport = {
    log_utf8_string: (level: any, target: any, offset: any, size: any) => void;
};

type ImportObject = {
    host: LogImport;
};

type HostImportsConfig = {
    exports: any;
};

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

let cachegetUint8Memory0 = null;

function getUint8Memory0(wasm) {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(wasm, ptr, len) {
    return decoder.decode(getUint8Memory0(wasm).subarray(ptr, ptr + len));
}

/// Returns import object that describes host functions called by AIR interpreter
function newImportObject(cfg: HostImportsConfig): ImportObject {
    return {
        host: log_import(cfg),
    };
}

function log_import(cfg: HostImportsConfig): LogImport {
    return {
        log_utf8_string: (level: any, target: any, offset: any, size: any) => {
            let wasm = cfg.exports;

            try {
                let str = getStringFromWasm0(wasm, offset, size);
                let levelStr: LogLevel;
                switch (level) {
                    case 1:
                        levelStr = 'error';
                        break;
                    case 2:
                        levelStr = 'warn';
                        break;
                    case 3:
                        levelStr = 'info';
                        break;
                    case 4:
                        levelStr = 'debug';
                        break;
                    case 6:
                        levelStr = 'trace';
                        break;
                    default:
                        return;
                }
                logFunction(levelStr, str);
            } finally {
            }
        },
    };
}

type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

let marineInstance: Awaited<ReturnType<typeof init>> | 'not-set' | 'terminated' = 'not-set';

const decoder = new TextDecoder();

export const toExpose: RunnerScriptInterface = {
    init: async (config: Config, marine: SharedArrayBuffer, module: SharedArrayBuffer) => {
        const marineModule = await WebAssembly.compile(new Uint8Array(marine));
        const avmModule = await WebAssembly.compile(new Uint8Array(module));

        // wasi is needed to run AVM with marine-js
        const wasmFs = new WasmFs();
        const wasi = new WASI({
            args: [],
            env: {},
            bindings: {
                ...bindings,
                fs: wasmFs.fs,
            },
        });

        const cfg = {
            exports: undefined,
        };

        const avmInstance = await WebAssembly.instantiate(avmModule, {
            ...wasi.getImports(avmModule),
            ...newImportObject(cfg),
        });
        wasi.start(avmInstance);
        cfg.exports = avmInstance.exports;

        marineInstance = await init(marineModule);

        const customSections = WebAssembly.Module.customSections(avmModule, 'interface-types');
        const itCustomSections = new Uint8Array(customSections[0]);
        let rawResult = marineInstance.register_module('avm', itCustomSections, avmInstance);

        let result: any;
        try {
            result = JSON.parse(rawResult);
        } catch (ex) {
            throw 'register_module result parsing error: ' + ex + ', original text: ' + rawResult;
        }
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

            const paramsToPass = {
                init_peer_id: params.initPeerId,
                current_peer_id: params.currentPeerId,
            };

            const avmArg = JSON.stringify([
                air,
                Array.from(prevData),
                Array.from(data),
                paramsToPass,
                Array.from(Buffer.from(JSON.stringify(callResultsToPass))),
            ]);

            const rawResult = marineInstance.call_module('avm', 'invoke', avmArg);

            let result: any;
            try {
                result = JSON.parse(rawResult);
            } catch (ex) {
                throw 'call_module result parsing error: ' + ex + ', original text: ' + rawResult;
            }

            if (result.error !== '') {
                throw 'call_module returned error: ' + result.error;
            }

            result = result.result;

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

// expose(toExpose);
