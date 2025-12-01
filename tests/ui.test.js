import { test, expect } from '@jest/globals';
import { createGrid } from '../ui.js';

test('should create a grid of cells', () => {
    const grid = createGrid();

    expect(grid.cells).toEqual([]);
});

test('can toggle a dead cell to alive', () => {
    const grid = createGrid();

    grid.toggleCell(5, 5);

    expect(grid.cells).toContainEqual([5, 5]);
});
