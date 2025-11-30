import { test, expect } from '@jest/globals';
import { next } from '../life.js';

test('a live cell with no neighbours dies', () => {
    const liveCell = [0, 0];
    const cells = [liveCell];

    expect(next(cells)).not.toContainEqual(liveCell);
});

test('a live cell with no neighbours dies (redux)', () => {
    const liveCell = [0, 0];
    const notNeighbours = [
        [6, 6],
        [5, 5],
    ];
    const cells = [liveCell, ...notNeighbours];

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

test('a live cell with three live neighbours survives', () => {
    const liveCell = [0, 0];
    const neighbours = [
        [1, 0],
        [-1, 0],
        [0, 1],
    ];
    const cells = [liveCell, ...neighbours];

    expect(next(cells)).toContainEqual(liveCell);
});

test('a live cell with more than three live neighbours dies', () => {
    const liveCell = [0, 0];
    const neighbours = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [1, 1],
    ];
    const cells = [liveCell, ...neighbours];

    expect(next(cells)).not.toContainEqual(liveCell);
});

test('a dead cell with exactly three live neighbours becomes alive', () => {
    const soonToBeAliveCell = [0, 0];
    const neighbours = [
        [1, 0],
        [-1, 0],
        [0, 1],
    ];
    const cells = [...neighbours];

    expect(next(cells)).toContainEqual(soonToBeAliveCell);
});

test('a dead cell with exactly three live neighbours becomes alive (redux)', () => {
    const soonToBeAliveCell = [1, 1];
    const neighbours = [
        [1, 0],
        [0, 0],
        [0, 1],
    ];
    const cells = [...neighbours];

    expect(next(cells)).toContainEqual(soonToBeAliveCell);
});
