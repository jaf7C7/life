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

test('the game calculates new state of the grid with each tick', () => {
    const life = new Life();
    // A lone cell without neighbours will die after 1 generation.
    life.toggleCell(5, 5);

    life.tick();

    expect(life.cells).toEqual([]);
});

test('the game starts in a stopped state', () => {
    const life = new Life();

    expect(life.isPlaying()).toBe(false);
});

test('the game loop schedules game ticks', () => {
    const life = new Life();
    let tickCallback = null;

    const mockScheduler = (callback) => {
        tickCallback = callback;
    };

    life.toggleCell(0, 0); // Lone cell will die.
    life.play(mockScheduler);
    tickCallback(); // Manually execute a scheduled tick.

    expect(life.cells).toEqual([]); // Cell has died.
});

test('the game loop does not execute ticks when stopped', () => {
    const life = new Life();
    let tickCallback = null;
    let tickCancelled = false;

    const mockScheduler = (callback) => {
        tickCallback = callback;
        return {
            cancel: () => {
                tickCancelled = true;
            },
        };
    };

    life.toggleCell(0, 0); // Lone cell will die.
    life.play(mockScheduler);
    life.stop();
    tickCallback(); // Tick should have no effect on stopped game.

    expect(tickCancelled).toBe(true);
    expect(life.cells).toEqual([[0, 0]]);
});

test('game stops automatically when all cells are dead', () => {
    const life = new Life();
    let tickCallback = null;

    const mockScheduler = (callback) => {
        tickCallback = callback;
        return {
            cancel: () => {
                tickCallback = null;
            },
        };
    };

    life.toggleCell(5, 5); // Lone cell will die
    life.play(mockScheduler);
    tickCallback(); // Manually execute a scheduled tick => lone cell dies.

    expect(tickCallback).toBe(null); // No ticks scheduled => game stopped.
});
