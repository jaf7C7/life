import { expect } from 'chai';
import { suite, test } from 'mocha';
import { initApp } from '../../life/app.js';
import { Viewport } from '../../life/viewport.js';
import { MockUI, canvasToCssX, canvasToCssY } from './helpers.js';

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
        // ------------------------------------------------------------------
        // NOTE: The `width` and `height` properties of the `canvas` element
        // refer to **logical pixels**, rather than **display pixels**. Using
        // `width/2` and `height/2` does give the centre of the canvas, but it
        // won't work if we're trying to click an aribtrary cell, and the
        // **logical** size of the canvas differs from its **rendered** size.
        // We need to use `Element.clientWidth` and `Element.clientHeight` to
        // get the **rendered** dimensions.
        // ------------------------------------------------------------------
        const canvasCentre = {
            x: canvas.clientWidth / 2,
            y: canvas.clientHeight / 2
        };
        canvas.click(canvasCentre);

        expect(cells).to.deep.equal(new Set(['0,0']));
    });

    test('The cell grid has a y axis that increases vertically upwards', () => {
        const cells = new Set();
        const ui = new MockUI();

        initApp(ui, cells);
        const canvas = ui.findElement('canvas');
        const canvasCentre = {
            x: canvas.clientWidth / 2,
            y: canvas.clientHeight / 2
        };

        // `cellStep` has canvas pixel units, but `click` requires CSS pixel
        // units, so we need to scale cellStep to the CSS pixel equivalent,
        // with each axis having its own transform.
        const cellStepY = canvasToCssY(canvas, Viewport.cellStep);

        // `click`'s `y` position increases *downwards* from the top edge of
        // the canvas. if we expect the cell co-ords to increase in the opposite
        // direction we have to *subtract* one vertical cell-size.
        canvas.click({ x: canvasCentre.x, y: canvasCentre.y - cellStepY });

        expect(cells).to.deep.equal(new Set(['0,1']));
    });

    test('The cell grid has a x axis that increases rightwards', () => {
        const cells = new Set();
        const ui = new MockUI();

        initApp(ui, cells);
        const canvas = ui.findElement('canvas');
        const canvasCentre = {
            x: canvas.clientWidth / 2,
            y: canvas.clientHeight / 2
        };

        // `cellStep` has canvas pixel units, but `click` requires CSS pixel
        // units, so we need to scale cellStep to the CSS pixel equivalent,
        // with each axis having its own transform.
        const cellStepX = canvasToCssX(canvas, Viewport.cellStep);

        canvas.click({ x: canvasCentre.x + cellStepX, y: canvasCentre.y });

        expect(cells).to.deep.equal(new Set(['1,0']));
    });

    test('Clicking cells at negative co-ords toggles them correctly', () => {
        const cells = new Set();
        const ui = new MockUI();

        initApp(ui, cells);

        const canvas = ui.findElement('canvas');
        const canvasCentre = {
            x: canvas.clientWidth / 2,
            y: canvas.clientHeight / 2
        };
        const cellStepX = canvasToCssX(canvas, Viewport.cellStep);
        const cellStepY = canvasToCssY(canvas, Viewport.cellStep);
        const cellPosition = {
            x: canvasCentre.x - cellStepX,
            y: canvasCentre.y + cellStepY
        };

        canvas.click(cellPosition);
        expect(cells).to.deep.equal(new Set(['-1,-1']));

        canvas.click(cellPosition);
        expect(cells).to.deep.equal(new Set());
    });

    test('Clicking on a cell twice leaves it dead', () => {
        const cells = new Set();
        const ui = new MockUI();

        initApp(ui, cells);
        const canvas = ui.findElement('canvas');

        canvas.clickCell(1, 1);
        expect(cells).to.deep.equal(new Set(['1,1']));

        canvas.clickCell(1, 1);
        expect(cells).to.deep.equal(new Set());
    });
});
