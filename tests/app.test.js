import { test, expect } from '@jest/globals';
import createApp from '../life/app.js';
import { Life } from '../life/life.js';

class MockUI {
    constructor() {
        this._elements = [];
    }

    createElement(element) {
        this._elements.push(element);
    }

    findElement(id) {
        return this._elements.find((e) => e.id === id);
    }
}

test('Renders a grid of cells', () => {
    const ui = new MockUI();
    const life = new Life();
    const cellPixelSize = 20;

    createApp(ui, life, cellPixelSize);

    expect(ui.findElement('grid')).not.toBe(undefined);
});

test('Clicking on the grid toggles the corresponding cell', () => {
    const ui = new MockUI();
    const life = new Life();
    const cellPixelSize = 20;

    createApp(ui, life, cellPixelSize);
    const grid = ui.findElement('grid');
    grid.click(45, 65);

    // (45 / 20 = 2.25 -> floor to 2, 65 / 20 = 3.25 -> floor to 3).
    expect(life.cells).toEqual([[2, 3]]);
});

test('Renders a play button', () => {
    const ui = new MockUI();
    const life = new Life();
    const cellPixelSize = 20;

    createApp(ui, life, cellPixelSize);

    expect(ui.findElement('play')).not.toBe(undefined);
});

test('Clicking the play button starts the game', () => {
    const ui = new MockUI();
    const life = new Life();
    const cellPixelSize = 20;

    createApp(ui, life, cellPixelSize);
    ui.findElement('play').click();

    expect(life.isPlaying()).toBe(true);
});

test('Renders a stop button', () => {
    const ui = new MockUI();
    const life = new Life();
    const cellPixelSize = 20;

    createApp(ui, life, cellPixelSize);

    expect(ui.findElement('stop')).not.toBe(undefined);
});

test('Clicking the stop button stops the game', () => {
    const ui = new MockUI();
    const life = new Life();
    const cellPixelSize = 20;

    createApp(ui, life, cellPixelSize);
    ui.findElement('play').click();
    ui.findElement('stop').click();

    expect(life.isPlaying()).toBe(false);
});
