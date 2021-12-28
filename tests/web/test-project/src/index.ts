import { AvmRunnerBackground } from '@fluencelabs/avm-runner-background';
import { toUint8Array } from 'js-base64';

const vmPeerId = '12D3KooWNzutuy8WHXDKFqFsATvCR6j9cj2FijYbnd47geRKaQZS';

const b = (s: string) => {
    return toUint8Array(s);
};

const main = async () => {
    const runner = new AvmRunnerBackground();
    await runner.init('off');

    const s = `(seq
            (par 
                (call "${vmPeerId}" ("local_service_id" "local_fn_name") [] result_1)
                (call "remote_peer_id" ("service_id" "fn_name") [] g)
            )
            (call "${vmPeerId}" ("local_service_id" "local_fn_name") [] result_2)
        )`;

    // act
    const params = { initPeerId: vmPeerId, currentPeerId: vmPeerId };
    const res = await runner.run(s, b(''), b(''), params, []);
    await runner.terminate();

    return res;
};

// @ts-ignore
window.MAIN = main;
