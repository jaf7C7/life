import { test, expect } from '@jest/globals';
import createApp from '../life/app.js';

class MockUI {
    constructor() {
        this._elements = [];
    }

    createElement(id) {
        this._elements.push({ id });
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
