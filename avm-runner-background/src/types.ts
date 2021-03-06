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

import { CallResultsArray, InterpreterResult, LogLevel } from '@fluencelabs/avm-runner-interface';

interface FilePaths {
    avm: string;
    marine: string;
}

export type wasmLoadingMethod =
    | {
          method: 'fetch-from-url';
          baseUrl: string;
          filePaths: FilePaths;
      }
    | {
          method: 'read-from-fs';
          filePaths: FilePaths;
      };

export type RunnerScriptInterface = {
    init: (logLevel: LogLevel, loadMethod: wasmLoadingMethod) => Promise<void>;
    terminate: () => Promise<void>;
    run: (
        air: string,
        prevData: Uint8Array,
        data: Uint8Array,
        params: {
            initPeerId: string;
            currentPeerId: string;
        },
        callResults: CallResultsArray,
    ) => Promise<InterpreterResult>;
};
