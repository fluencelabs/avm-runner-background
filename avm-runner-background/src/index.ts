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

import { CallRequest, CallResultsArray, InterpreterResult } from '@fluencelabs/avm-runner-interface';
import { isBrowser, isNode } from 'browser-or-node';
import { Thread, ModuleThread, spawn, Worker } from 'threads';
import { InitConfig } from './config';
import { MarineJsExpose } from './types';

const decoder = new TextDecoder();

export class MarineJs implements MarineJsExpose {
    private _worker?: ModuleThread<MarineJsExpose>;
    private _workerPath: string;

    constructor(workerPath?: string) {
        if (workerPath) {
            this._workerPath = workerPath;
        } else if (isBrowser) {
            this._workerPath = './runnerScript.web.js';
        } else if (isNode) {
            this._workerPath = './runnerScript.node.js';
        } else {
            throw new Error('path not set');
        }
    }

    async init(config: InitConfig): Promise<void> {
        this._worker = await spawn<MarineJsExpose>(new Worker(this._workerPath));
        await this._worker.init(config);
    }

    async terminate(): Promise<void> {
        if (!this._worker) {
            return;
        }

        await this._worker.terminate();
        await Thread.terminate(this._worker);
    }

    async call(function_name: string, args: string, callParams: any): Promise<string> {
        if (!this._worker) {
            throw 'Worker is not initialized';
        }

        return this._worker.call(function_name, args, callParams);
    }

    async runAsAvm(
        air: string,
        prevData: Uint8Array,
        data: Uint8Array,
        params: {
            initPeerId: string;
            currentPeerId: string;
        },
        callResults: CallResultsArray,
    ): Promise<InterpreterResult> {
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

            const rawResult = await this.call('invoke', avmArg, undefined);

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
            } as any;
        }
    }
}
