import { CallResultsArray, InterpreterResult, LogLevel } from '@fluencelabs/avm-runner-interface';

export type wasmLoadingMethod =
    | {
          method: 'fetch-from-url';
          baseUrl: string;
          filePath: string;
      }
    | {
          method: 'read-from-fs';
          filePath: string;
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
