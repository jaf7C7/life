import assert from 'node:assert/strict';
import { test } from 'mocha';
import { next } from '../life/rules.js';

test('A lone cell with no neighbours dies', () => {
    const loneCell = [0, 0];
    const cells = [loneCell];

    assert.deepEqual(next(cells), []);
});

test('A cell with one neighbour also dies', () => {
    const cell = [0, 0];
    const neighbour = [1, 1];

    // Both cells have only one neighbour and will both die.
    const cells = [cell, neighbour];

    assert.deepEqual(next(cells), []);
});

test('A cell with two neighbours survives', () => {
    const cell = [0, 0];
    const neighbours = [
        [-1, -1],
        [1, 1]
    ];

    // Cells `[-1, -1]` and `[1, 1]` each have less than two neighbours and so
    // will not survive.
    const cells = [cell, ...neighbours];

    assert.deepEqual(next(cells), [cell]);
});

test('A dead cell with exactly three live neighbours becomes alive', () => {
    const deadCell = [0, 0];
    const liveNeighbours = [
        [-1, 0],
        [-1, -1],
        [0, -1]
    ];

    // The neighbour cells each have two neighbours, and so survive. The dead
    // cell [0, 0] has three neighbours and so comes to life.
    const cells = [...liveNeighbours];

    assert.deepEqual(next(cells), [deadCell, ...cells]);
});
