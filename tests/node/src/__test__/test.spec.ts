import { AvmRunnerBackground } from '@fluencelabs/avm-runner-background';

const vmPeerId = '12D3KooWNzutuy8WHXDKFqFsATvCR6j9cj2FijYbnd47geRKaQZS';

const b = (s: string) => {
    return Buffer.from(s);
};

describe('Nodejs integration tests', () => {
    it('AvmRunnerBackground should work correctly execute simple script', async () => {
        // arrange
        const testRunner = new AvmRunnerBackground();
        await testRunner.init('off');

        const s = `(seq
            (par 
                (call "${vmPeerId}" ("local_service_id" "local_fn_name") [] result_1)
                (call "remote_peer_id" ("service_id" "fn_name") [] g)
            )
            (call "${vmPeerId}" ("local_service_id" "local_fn_name") [] result_2)
        )`;

        // act
        const params = { initPeerId: vmPeerId, currentPeerId: vmPeerId };
        const res = await testRunner.run(s, b(''), b(''), params, []);
        await testRunner.terminate();

        // assert
        expect(res).not.toBeUndefined();
    });
});
