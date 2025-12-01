import { test, expect } from '@jest/globals';
import { createGrid, createGame } from '../ui.js';

test('should create a grid of cells', () => {
    const grid = createGrid();

    expect(grid.cells).toEqual([]);
});

test('can toggle a dead cell to alive', () => {
    const grid = createGrid();

    grid.toggleCell(5, 5);

    expect(grid.cells).toContainEqual([5, 5]);
});

test('can toggle an alive cell to dead', () => {
    const grid = createGrid();

    grid.toggleCell(5, 5);
    grid.toggleCell(5, 5);

    expect(grid.cells).not.toContainEqual([5, 5]);
});

test('game starts in stopped state', () => {
    const game = createGame();

    expect(game.isPlaying()).toBe(false);
});

test('can start the game', () => {
    const game = createGame();

    game.play();

    expect(game.isPlaying()).toBe(true);
});

test('can stop the playing game', () => {
    const game = createGame();

    game.play();
    game.stop();

    expect(game.isPlaying()).toBe(false);
});

test('calculates new state of the game with each tick', () => {
    const grid = createGrid();
    // A lone cell without neighbours will die after 1 generation.
    grid.toggleCell(5, 5);
    const game = createGame(grid);

    game.tick();

    expect(grid.cells).not.toContainEqual([5, 5]);
});
