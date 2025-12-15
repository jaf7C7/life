import { test, expect } from '@jest/globals';
import { Life } from '../life/life.js';
import createApp from '../life/app.js';

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

    createApp(ui);

    expect(ui.findElement('grid')).not.toBe(undefined);
});

test('Clicking on the grid toggles the corresponding cell', () => {
    const life = new Life();
    const ui = new MockUI();
    const cellSize = 20; // size in pixels.

    createApp(ui, life, cellSize);
    const grid = ui.findElement('grid');
    grid.click(45, 65); // pixel co-ords.

    // (45 / 20 = 2.25 -> floor to 2, 65 / 20 = 3.25 -> floor to 3).
    expect(life.cells).toEqual([[2, 3]]);
});
