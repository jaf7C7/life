import { test, expect } from '@jest/globals';
import createApp from '../life/app.js';
import { Life } from '../life/life.js';

class MockUI {
    constructor() {
        this._elements = [];
    }

    setTitle() {}

    createHeading() {}

    createGrid() {}

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

    createApp(ui, life);

    expect(ui.findElement('grid')).not.toBe(undefined);
});

test('Clicking on the grid toggles the corresponding cell', () => {
    const ui = new MockUI();
    const life = new Life();

    createApp(ui, life);
    const grid = ui.findElement('grid');
    grid.click(grid.width / 2, grid.height / 2); // Grid centre

    expect(life.cells()).toEqual([[0, 0]]);
});

test('Renders a play button', () => {
    const ui = new MockUI();
    const life = new Life();

    createApp(ui, life);

    expect(ui.findElement('play')).not.toBe(undefined);
});

test('Clicking the play button starts the game', () => {
    const ui = new MockUI();
    const life = new Life();

    createApp(ui, life);
    ui.findElement('play').click();

    expect(life.isPlaying()).toBe(true);
});

test('Renders a stop button', () => {
    const ui = new MockUI();
    const life = new Life();

    createApp(ui, life);

    expect(ui.findElement('stop')).not.toBe(undefined);
});

test('Clicking the stop button stops the game', () => {
    const ui = new MockUI();
    const life = new Life();

    createApp(ui, life);
    ui.findElement('play').click();
    ui.findElement('stop').click();

    expect(life.isPlaying()).toBe(false);
});

test('Grid can be panned by clicking and dragging', () => {
    const ui = new MockUI();
    const life = new Life();

    createApp(ui, life);
    const grid = ui.findElement('grid');

    // Drag the grid one cell left and one cell up, so the centre of the
    // grid is offset.
    const [x, y] = [grid.width / 2, grid.height / 2];
    const mouseDownPos = { x, y };
    const mouseUpPos = { x: x - grid.cellSize, y: y + grid.cellSize };
    grid.clickAndDrag(mouseDownPos, mouseUpPos);

    grid.click(x, y);

    expect(life.cells()).toEqual([[1, -1]]);
});

test('Grid can be zoomed out with pinch-to-zoom', () => {
    const ui = new MockUI();
    const life = new Life();

    createApp(ui, life);
    const grid = ui.findElement('grid');
    // Outward pinch scales both x and y by 2 => increases zoom by 100%
    const startTouches = [
        { x: 0, y: 0 },
        { x: 30, y: 40 },
    ];
    const endTouches = [
        { x: 0, y: 0 },
        { x: 60, y: 80 },
    ];
    grid.pinch(startTouches, endTouches);

    expect(grid.cellSize).toBe(40);
});
