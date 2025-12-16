import { test, expect } from '@jest/globals';
import { Life } from '../life/life.js';

test('should have an array of live cells', () => {
    const life = new Life();

    expect(life.cells()).toEqual([]);
});

test('can toggle a dead cell to alive', () => {
    const life = new Life();

    life.toggleCell(5, 5);

    expect(life.cells()).toContainEqual([5, 5]);
});

test('can toggle an alive cell to dead', () => {
    const life = new Life();

    life.toggleCell(5, 5);
    life.toggleCell(5, 5);

    expect(life.cells()).toEqual([]);
});

test('calculates new state of the grid with each tick', () => {
    const life = new Life();
    // A lone cell without neighbours will die after 1 tick.
    life.toggleCell(5, 5);

    life.tick();

    expect(life.cells()).toEqual([]);
});

test('starts in a stopped state', () => {
    const life = new Life();

    expect(life.isPlaying()).toBe(false);
});

test('can be started playing', () => {
    const life = new Life();

    // An injectable scheduling function is used to avoid having to deal with
    // `setInterval` in tests - we can just inject a useful mock instead of
    // messing around with async tests.
    //
    // The scheduler accepts a callback function to be executed, in production
    // this will be the callback passed to `setInterval`.
    //
    // The scheduler returns an object with a `cancel()` method, which is used
    // by the `life` class to cancel the repeated execution of the task. In
    // production this will be a thin wrapper around `clearInterval`.
    //
    // The `mockScheduler` in this test is just a placeholder which does
    // nothing but is the right "shape" that `play()` expects.
    const mockScheduler = (/* callback */) => {
        // Schedule `callback` to be executed somehow.
        // e.g. const id = setInterval(callback, 1000);

        // Return scheduled task object with `cancel` method.
        return {
            cancel: () => {
                // Cancel the execution of scheduled callback.
                // e.g. clearInterval(id)
            },
        };
    };

    life.play(mockScheduler);

    expect(life.isPlaying()).toBe(true);
});

test('schedules game ticks while playing', () => {
    const life = new Life();
    let tickCallback = null;

    const mockScheduler = (callback) => {
        tickCallback = callback;
    };

    life.toggleCell(0, 0); // Lone cell will die after 1 tick.
    life.play(mockScheduler);
    tickCallback(); // Manually execute a scheduled tick.

    expect(life.cells()).toEqual([]); // Cell has died.
});

test('cancels scheduled ticks when stopped', () => {
    const life = new Life();
    let ticksCancelled = false;

    const mockScheduler = () => {
        return {
            cancel: () => {
                ticksCancelled = true;
            },
        };
    };

    life.play(mockScheduler);
    life.stop();

    expect(ticksCancelled).toBe(true);
});

// This guards against stray ticks which might get executed after the game has
// been stopped, due to async timing effects.
test('ticks executed when stopped have no effect', () => {
    const life = new Life();
    let tickCallback = null;

    const mockScheduler = (callback) => {
        tickCallback = callback;
        return {
            cancel: () => {},
        };
    };

    life.toggleCell(0, 0); // Lone cell will die after 1 tick.
    life.play(mockScheduler);
    life.stop();
    tickCallback(); // Tick should have no effect on stopped game.

    expect(life.cells()).toEqual([[0, 0]]); // Cell still alive.
});

test('stops playing automatically when all cells are dead', () => {
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

    life.toggleCell(5, 5); // Lone cell will die after 1 tick.
    life.play(mockScheduler);
    tickCallback(); // Manually execute a scheduled tick => lone cell dies.

    expect(life.isPlaying()).toBe(false);
});
