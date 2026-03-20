import assert from 'node:assert/strict';
import { test } from 'mocha';
import { next } from '../life/rules.js';

test('A cell with no neighbours dies', () => {
    const cell = '0,0';
    const cells = new Set([cell]);

    assert.deepEqual(next(cells), new Set());
});

test('A cell with one neighbour also dies', () => {
    const cell = '0,0';
    const neighbour = '1,1';

    // Both cells have only one neighbour and will both die.
    const cells = new Set([cell, neighbour]);

    assert.deepEqual(next(cells), new Set());
});

test('A cell with two neighbours survives', () => {
    const cell = '0,0';
    const neighbours = ['-1,-1', '1,1'];

    // Cells `'-1,-1'` and `'1,1'` each have less than two neighbours and so
    // will not survive.
    const cells = new Set([cell, ...neighbours]);

    assert.deepEqual(next(cells), new Set([cell]));
});

test('A dead cell with exactly three live neighbours becomes alive', () => {
    const deadCell = '0,0';
    const liveNeighbours = ['-1,0', '-1,-1', '0,-1'];

    // The neighbour cells each have two neighbours, and so survive. The dead
    // cell '0,0' has three neighbours and so comes to life.
    const cells = new Set(liveNeighbours);

    assert.deepEqual(next(cells), new Set([deadCell, ...cells]));
});
