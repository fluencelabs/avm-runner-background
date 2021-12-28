import { AvmRunnerBackground } from '@fluencelabs/avm-runner-background';

const vmPeerId = '12D3KooWNzutuy8WHXDKFqFsATvCR6j9cj2FijYbnd47geRKaQZS';

const b = (s: string) => {
    return Buffer.from(s);
};

describe('NodeJS negative tests', () => {
    it('Should display correct error message if wasm is not served', async () => {
        // arrange
        const testRunner = new AvmRunnerBackground();

        // act
        const res = await testRunner.init('off').catch((e) => e.message);
        await testRunner.terminate();

        // assert
        expect(res).toMatch('Failed to load avm.wasm. Did you forget to install @fluencelabs/avm?');
    });
});
