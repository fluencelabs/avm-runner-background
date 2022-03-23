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

import { Thread, ModuleThread, spawn, Worker } from 'threads';
import { InitConfig } from './config';
import { MarineJsExpose } from './types';

export class MarineJs implements MarineJsExpose {
    private _worker?: ModuleThread<MarineJsExpose>;
    private _workerPath: string;

    constructor(workerPath: string) {
        this._workerPath = workerPath;
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
}
