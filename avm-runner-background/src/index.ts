import { AvmRunner, CallResultsArray, LogLevel, InterpreterResult } from '@fluencelabs/avm-runner-interface';
import { isBrowser, isNode } from 'browser-or-node';
import { Thread, ModuleThread, BlobWorker, spawn } from 'threads';
import { web, node } from './runnerBase64';
import { RunnerScriptInterface, wasmLoadingMethod } from './types';
export { wasmLoadingMethod } from './types';

const defaultAvmFileName = 'avm.wasm';
const avmPackageName = '@fluencelabs/avm';

export class AvmRunnerBackground implements AvmRunner {
    private _worker?: ModuleThread<RunnerScriptInterface>;
    private _loadingMethod?: wasmLoadingMethod;

    constructor(loadingMethod?: wasmLoadingMethod) {
        this._loadingMethod = loadingMethod;
    }

    async init(logLevel: LogLevel): Promise<void> {
        let scriptText: string;
        let method: wasmLoadingMethod;
        if (isBrowser) {
            scriptText = window.atob(web);
            method = this._loadingMethod || {
                method: 'fetch-from-url',
                baseUrl: document.baseURI,
            };
        } else if (isNode) {
            scriptText = Buffer.from(node, 'base64').toString();
            if (this._loadingMethod) {
                method = this._loadingMethod;
            } else {
                try {
                    // webpack will complain about missing dependencies for web target
                    // to fix this we have to use eval('require')
                    const path = eval('require')('path');
                    const fluencePath = eval('require').resolve(avmPackageName);
                    const filePath = path.join(path.dirname(fluencePath), defaultAvmFileName);

                    method = {
                        method: 'read-from-fs',
                        filePath: filePath,
                    };
                } catch (e: any) {
                    throw new Error(
                        'Failed to load avm.wasm. Did you forget to install @fluencelabs/avm? Original error: ' +
                            e.toString(),
                    );
                }
            }
        } else {
            throw new Error('Unknown environment');
        }

        this._worker = await spawn<RunnerScriptInterface>(BlobWorker.fromText(scriptText));
        await this._worker.init(logLevel, method);
    }

    async terminate(): Promise<void> {
        if (!this._worker) {
            return;
        }

        await this._worker?.terminate();
        await Thread.terminate(this._worker);
    }

    async run(
        air: string,
        prevData: Uint8Array,
        data: Uint8Array,
        params: { initPeerId: string; currentPeerId: string },
        callResults: CallResultsArray,
    ): Promise<InterpreterResult> {
        if (!this._worker) {
            throw 'Worker is not initialized';
        }

        return this._worker.run(air, prevData, data, params, callResults);
    }
}
