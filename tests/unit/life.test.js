import { expect } from 'chai';
import { suite, test } from 'mocha';
import { initApp } from '../../life/app.js';
import { MockUI } from './helpers.js';

suite('User Interface', () => {
    test('A canvas element is created', () => {
        const cells = new Set();
        const ui = new MockUI();

        initApp(ui, cells);

        expect(ui.findElement('canvas')).to.not.be.undefined;
    });

    test('Clicking on the center of the canvas adds cell "0,0"', () => {
        const cells = new Set();
        const ui = new MockUI();

        initApp(ui, cells);
        const canvas = ui.findElement('canvas');
        canvas.click({
            x: canvas.width / 2,
            y: canvas.height / 2
        });

        expect(cells).to.deep.equal(new Set(['0,0']));
    });

    test('Clicking on a cell twice leaves it dead', () => {
        const cells = new Set();
        const ui = new MockUI();

        initApp(ui, cells);
        const canvas = ui.findElement('canvas');

        canvas.clickCell(1, 1);
        expect(cells).not.to.deep.equal(new Set());

        canvas.clickCell(1, 1);
        expect(cells).to.deep.equal(new Set());
    });
});
