import assert from 'node:assert';
import { test } from 'mocha';
import { next } from '../life.js';

test('A lone cell with no neighbours dies', () => {
    const cells = [[0, 0]];
    assert.deepEqual([], next(cells));
});
