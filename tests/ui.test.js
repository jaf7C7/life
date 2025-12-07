import { test, expect } from '@jest/globals';
import { createGame } from '../ui.js';

test('should create a grid of cells', () => {
    const game = createGame();

    expect(game.cells).toEqual([]);
});

test('can toggle a dead cell to alive', () => {
    const game = createGame();

    game.toggleCell(5, 5);

    expect(game.cells).toContainEqual([5, 5]);
});

test('can toggle an alive cell to dead', () => {
    const game = createGame();

    game.toggleCell(5, 5);
    game.toggleCell(5, 5);

    expect(game.cells).not.toContainEqual([5, 5]);
});

test('the game is initially in stopped state', () => {
    const game = createGame();

    expect(game.isPlaying()).toBe(false);
});

test('the game loop can be started', () => {
    const game = createGame();

    game.play();

    expect(game.isPlaying()).toBe(true);
});

test('the game loop can be stopped', () => {
    const game = createGame();

    game.play();
    game.stop();

    expect(game.isPlaying()).toBe(false);
});

test('the game calculates new state of the grid with each tick', () => {
    // A lone cell without neighbours will die after 1 generation.
    const game = createGame();
    game.toggleCell(5, 5);

    game.tick();

    expect(game.cells).toEqual([]);
});
