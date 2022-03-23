import { MarineJs } from '@fluencelabs/avm-runner-background';
import fs from 'fs';
import path from 'path';

const vmPeerId = '12D3KooWNzutuy8WHXDKFqFsATvCR6j9cj2FijYbnd47geRKaQZS';

const b = (s: string) => {
    return Buffer.from(s);
};

const tryLoadFromFs = async (path: string): Promise<SharedArrayBuffer> => {
    try {
        const fsPromises = fs.promises;
        const buf: Buffer = await fsPromises.readFile(path);
        const sab = new SharedArrayBuffer(buf.length);
        const u8 = new Uint8Array(sab);
        u8.set(buf);
        return sab;
    } catch (e: any) {
        throw new Error(`Failed to load ${path}. ${e.toString()}`);
    }
};

const defaultAvmFileName = 'avm.wasm';
const defaultMarineFileName = 'marine-js.wasm';
const avmPackageName = '@fluencelabs/avm';
const marinePackageName = '@fluencelabs/marine-js';

describe('Nodejs integration tests', () => {
    it('AvmRunnerBackground should work correctly execute simple script', async () => {
        // arrange
        const testRunner = new MarineJs();
        const avmPackagePath = require.resolve(avmPackageName);
        const avmFilePath = path.join(path.dirname(avmPackagePath), defaultAvmFileName);

        const marinePackagePath = require.resolve(marinePackageName);
        const marineFilePath = path.join(path.dirname(marinePackagePath), defaultMarineFileName);
        await testRunner.init({
            serviceId: 'avm',
            marine: await tryLoadFromFs(marineFilePath),
            service: await tryLoadFromFs(avmFilePath),
        });

        const s = `(seq
            (par 
                (call "${vmPeerId}" ("local_service_id" "local_fn_name") [] result_1)
                (call "remote_peer_id" ("service_id" "fn_name") [] g)
            )
            (call "${vmPeerId}" ("local_service_id" "local_fn_name") [] result_2)
        )`;

        // act
        const params = { initPeerId: vmPeerId, currentPeerId: vmPeerId };
        const res = await testRunner.runAsAvm(s, b(''), b(''), params, []);
        await testRunner.terminate();

        // assert
        expect(res).toMatchObject({
            retCode: 0,
            errorMessage: '',
        });
    });
});
