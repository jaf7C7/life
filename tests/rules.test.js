import assert from 'node:assert/strict';
import { test } from 'mocha';
import { next } from '../life/rules.js';

test('A cell with no neighbours dies', () => {
    const cells = new Set();
    const cell = [0, 0];
    cells.add(cell);

    assert.deepEqual(next(cells), new Set());
});

test('A cell with one neighbour also dies', () => {
    const cells = new Set();
    const cell = [0, 0];
    const neighbour = [1, 1];

    // Both cells have only one neighbour and will both die.
    cells.add(cell);
    cells.add(neighbour);

    assert.deepEqual(next(cells), new Set());
});

test('A cell with two neighbours survives', () => {
    const cells = new Set();
    const cell = [0, 0];
    const neighbours = [
        [-1, -1],
        [1, 1]
    ];

    // Cells `[-1, -1]` and `[1, 1]` each have less than two neighbours and so
    // will not survive.
    cells.add(cell);
    for (const n of neighbours) {
        cells.add(n);
    }

    assert.deepEqual(next(cells), new Set([cell]));
});

test('A dead cell with exactly three live neighbours becomes alive', () => {
    const cells = new Set();
    const deadCell = [0, 0];
    const liveNeighbours = [
        [-1, 0],
        [-1, -1],
        [0, -1]
    ];

    // The neighbour cells each have two neighbours, and so survive. The dead
    // cell [0, 0] has three neighbours and so comes to life.
    for (const n of liveNeighbours) {
        cells.add(n);
    }

    assert.deepEqual(next(cells), new Set([deadCell, ...cells]));
});
