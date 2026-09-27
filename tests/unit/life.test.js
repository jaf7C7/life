import { expect } from 'chai';
import { suite, test } from 'mocha';
import { initApp } from '../../life/app.js';
import { cellSize } from '../../life/viewport.js';
import { MockUI } from './helpers.js';

/**
 * Converts from canvas pixels to CSS pixels in the vertical direction
 *
 * @param {object} canvas - The canvas object
 * @param {number} yCanvas - Vertical length in canvas pixels
 * @returns {number} YCss - The equivalent length in CSS pixels
 */
function canvasToCssY(canvas, yCanvas) {
    const yCss = (canvas.clientHeight / canvas.height) * yCanvas;
    return yCss;
}

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

        // `cellSize` has canvas pixel units, but `click` requires CSS pixel
        // units, so we need to scale cellSize to the CSS pixel equivalent,
        // with each axis having its own transform.
        const cellSizeY = canvasToCssY(canvas, cellSize);

        // `click`'s `y` position increases *downwards* from the top edge of
        // the canvas. if we expect the cell co-ords to increase in the opposite
        // direction we have to *subtract* one vertical cell-size.
        canvas.click({ x: canvasCentre.x, y: canvasCentre.y - cellSizeY });

        expect(cells).to.deep.equal(new Set(['0,1']));
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
