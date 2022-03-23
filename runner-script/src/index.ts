import { expose } from 'threads';
import { MarineJs } from './marine-js';
import { MarineJsExpose } from './types';

const instance = new MarineJs();

const toExpose: MarineJsExpose = {
    init: instance.init.bind(instance),
    terminate: instance.terminate.bind(instance),
    call: instance.call.bind(instance),
};

expose(toExpose);
