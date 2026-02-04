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
    const gridWidth = 100;
    const gridHeight = 100;

    createApp(ui, life, cellPixelSize, gridWidth, gridHeight);

    expect(ui.findElement('grid')).not.toBe(undefined);
});

test('Clicking on the grid toggles the corresponding cell', () => {
    const ui = new MockUI();
    const life = new Life();
    const cellPixelSize = 20;
    const gridWidth = 100;
    const gridHeight = 100;

    createApp(ui, life, cellPixelSize, gridWidth, gridHeight);
    const grid = ui.findElement('grid');
    grid.click(50, 50); // Centre of the grid

    expect(life.cells()).toEqual([[0, 0]]);
});

test('Renders a play button', () => {
    const ui = new MockUI();
    const life = new Life();
    const cellPixelSize = 20;
    const gridWidth = 100;
    const gridHeight = 100;

    createApp(ui, life, cellPixelSize, gridWidth, gridHeight);

    expect(ui.findElement('play')).not.toBe(undefined);
});

test('Clicking the play button starts the game', () => {
    const ui = new MockUI();
    const life = new Life();
    const cellPixelSize = 20;
    const gridWidth = 100;
    const gridHeight = 100;

    createApp(ui, life, cellPixelSize, gridWidth, gridHeight);
    ui.findElement('play').click();

    expect(life.isPlaying()).toBe(true);
});

test('Renders a stop button', () => {
    const ui = new MockUI();
    const life = new Life();
    const cellPixelSize = 20;
    const gridWidth = 100;
    const gridHeight = 100;

    createApp(ui, life, cellPixelSize, gridWidth, gridHeight);

    expect(ui.findElement('stop')).not.toBe(undefined);
});

test('Clicking the stop button stops the game', () => {
    const ui = new MockUI();
    const life = new Life();
    const cellPixelSize = 20;
    const gridWidth = 100;
    const gridHeight = 100;

    createApp(ui, life, cellPixelSize, gridWidth, gridHeight);
    ui.findElement('play').click();
    ui.findElement('stop').click();

    expect(life.isPlaying()).toBe(false);
});

test('Grid can be panned by clicking and dragging', () => {
    const ui = new MockUI();
    const life = new Life();
    const cellPixelSize = 20;
    const gridWidth = 100;
    const gridHeight = 100;

    createApp(ui, life, cellPixelSize, gridWidth, gridHeight);
    const grid = ui.findElement('grid');
    // Drag the grid one cell left and one cell up, so the centre of the
    // grid is offset.
    grid.clickAndDrag([50, 50], [30, 70]); // from, to - pixel co-ords
    grid.click(50, 50); // Centre of grid

    expect(life.cells()).toEqual([[1, -1]]);
});
