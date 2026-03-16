import assert from 'node:assert/strict';
import { test } from 'mocha';
import { next } from '../life.js';

test('A lone cell with no neighbours dies', () => {
    const loneCell = [0, 0];
    const cells = [loneCell];

    assert.deepEqual([], next(cells));
});

test('A cell with one neighbour also dies', () => {
    const loneCell = [0, 0];
    const neighbour = [1, 1];

    // Both cells have only one neighbour and will both die.
    const cells = [loneCell, neighbour];

    assert.deepEqual([], next(cells));
});
