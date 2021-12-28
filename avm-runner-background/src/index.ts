/*
 * Copyright 2021 Fluence Labs Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AvmRunner, CallResultsArray, LogLevel, InterpreterResult } from '@fluencelabs/avm-runner-interface';
import { isBrowser, isNode } from 'browser-or-node';
import { Thread, ModuleThread, spawn, Worker } from 'threads';
import { RunnerScriptInterface, wasmLoadingMethod } from './types';
export { wasmLoadingMethod } from './types';

const defaultAvmFileName = 'avm.wasm';
const avmPackageName = '@fluencelabs/avm';
const runnerScriptNodePath = './runnerScript.node.js';
const runnerScriptWebPath = './runnerScript.web.js';

export class AvmRunnerBackground implements AvmRunner {
    private _worker?: ModuleThread<RunnerScriptInterface>;
    private _loadingMethod?: wasmLoadingMethod;

    constructor(loadingMethod?: wasmLoadingMethod) {
        this._loadingMethod = loadingMethod;
    }

    async init(logLevel: LogLevel): Promise<void> {
        let workerPath: string;
        let method: wasmLoadingMethod;
        // check if we are running inside the browser and instantiate worker with the corresponding script
        if (isBrowser) {
            method = this._loadingMethod || {
                method: 'fetch-from-url',
                baseUrl: document.baseURI,
                filePath: defaultAvmFileName,
            };
            workerPath = runnerScriptWebPath;
        }
        // check if we are running inside nodejs and instantiate worker with the corresponding script
        else if (isNode) {
            workerPath = runnerScriptNodePath;
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

        this._worker = await spawn<RunnerScriptInterface>(new Worker(workerPath));
        await this._worker.init(logLevel, method);
    }

    async terminate(): Promise<void> {
        if (!this._worker) {
            return;
        }

        await this._worker.terminate();
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
