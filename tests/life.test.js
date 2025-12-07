import { test, expect } from '@jest/globals';
import { Life } from '../life.js';

test('should create a grid of cells', () => {
    const life = new Life();

    expect(life.cells).toEqual([]);
});

test('can toggle a dead cell to alive', () => {
    const life = new Life();

    life.toggleCell(5, 5);

    expect(life.cells).toContainEqual([5, 5]);
});

test('can toggle an alive cell to dead', () => {
    const life = new Life();

    life.toggleCell(5, 5);
    life.toggleCell(5, 5);

    expect(life.cells).not.toContainEqual([5, 5]);
});

test('the game is initially in stopped state', () => {
    const life = new Life();

    expect(life.isPlaying()).toBe(false);
});

test('the game loop can be started', () => {
    const life = new Life();

    life.play();

    expect(life.isPlaying()).toBe(true);
});

test('the game loop can be stopped', () => {
    const life = new Life();

    life.play();
    life.stop();

    expect(life.isPlaying()).toBe(false);
});

test('the game calculates new state of the grid with each tick', () => {
    // A lone cell without neighbours will die after 1 generation.
    const life = new Life();
    life.toggleCell(5, 5);

    life.tick();

    expect(life.cells).toEqual([]);
});
