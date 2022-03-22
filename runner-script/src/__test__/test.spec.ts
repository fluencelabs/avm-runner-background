import { toExpose } from '../index';
import fs from 'fs';

const vmPeerId = '12D3KooWNzutuy8WHXDKFqFsATvCR6j9cj2FijYbnd47geRKaQZS';

const b = (s: string) => {
    return Buffer.from(s);
};

const tryLoadFromFs = async (path: string): Promise<SharedArrayBuffer> => {
    try {
        const fsPromises = fs.promises;
        console.log(__dirname + '/' + path);
        // const buf = await fsPromises.readFile(__dirname + '/' + path);
        const buf = fs.readFileSync(__dirname + '/' + path);
        const sab = new SharedArrayBuffer(buf.length);
        const u8 = new Uint8Array(sab);
        u8.set(buf);
        console.log(sab.byteLength);
        return sab;
        // return buf as any;
    } catch (e: any) {
        throw new Error(`Failed to load ${path}. ${e.toString()}`);
    }
};

describe('Nodejs integration tests', () => {
    it('AvmRunnerBackground should work correctly execute simple script', async () => {
        // arrange
        await toExpose.init({}, await tryLoadFromFs('marine-js.wasm'), await tryLoadFromFs('avm.wasm'));

        const s = `(seq
            (par 
                (call "${vmPeerId}" ("local_service_id" "local_fn_name") [] result_1)
                (call "remote_peer_id" ("service_id" "fn_name") [] g)
            )
            (call "${vmPeerId}" ("local_service_id" "local_fn_name") [] result_2)
        )`;

        // act
        const params = { initPeerId: vmPeerId, currentPeerId: vmPeerId };
        const res = await toExpose.run(s, b(''), b(''), params, []);
        await toExpose.terminate();

        // assert
        expect(res).toMatchObject({
            retCode: 0,
            errorMessage: '',
        });
    });
});
