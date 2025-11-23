import { test, expect } from '@jest/globals';
import { next } from './life.js';

test('a live cell with no neighbours dies', () => {
    const liveCell = [0, 0];
    const cells = [liveCell];

    expect(next(cells)).not.toContainEqual(liveCell);
});

test('a live cell with two live neighbours survives', () => {
    const liveCell = [0, 0];
    const neighbours = [
        [1, 0],
        [-1, 0],
    ];
    const cells = [liveCell, ...neighbours];

    expect(next(cells)).toContainEqual(liveCell);
});
