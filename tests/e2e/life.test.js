import { test, expect } from '@playwright/test';

test('Has a canvas element', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

/**
 * Grabs a cell-sized chunk of image data from the canvas and checks it pixel by
 * pixel. Returns true if the cell is rendered correctly at the given position
 * on the canvas, false if not.
 *
 * @param {Object} params - The single parameter object required by
 *   `page.evaluate()`.
 * @param {Number} params.x0 - X coord of the top-left corner of the cell.
 * @param {Number} params.y0 - Y coord of the top-left corner of the cell.
 * @param {Number} params.cellSize - Size of the cell in pixels excluding its
 *   border.
 * @param {Number} params.borderWidth - Width of the cell border in pixels.
 * @returns {Boolean}
 */
function cellIsAlive({ x0, y0, cellSize, borderWidth }) {
    /**
     * Returns true if the pixel is at the edge of the cell, x and y
     * co-ordinates are relative to the top-left corner of the cell.
     *
     * @param {Number} x
     * @param {Number} y
     * @returns {Boolean}
     */
    function isBorderPixel(x, y) {
        return [x, y].some((e) => e === 0 || e === cellSize + borderWidth / 2);
    }

    /**
     * Returns true if the given pixel color data represents opaque black, else
     * false.
     *
     * @param {Number[]} pixelData
     * @returns {Boolean}
     */
    function isBlack([r, g, b, a]) {
        return [r, g, b].every((e) => e === 0) && a === 255;
    }

    /**
     * Returns true if the given pixel color data represents opaque white, else
     * false.
     *
     * @param {Number[]} pixelData
     * @returns {Boolean}
     */
    function isWhite([r, g, b, a]) {
        return [r, g, b].every((e) => e === 255) && a === 255;
    }

    /**
     * Checks the given pixel and returns a boolean indicating whether it is the
     * correct color given its position. Border pixels should be black, and
     * other pixels should be white. The co-ordinates are relative to the
     * top-left corner of the cell.
     *
     * @param {Number} x
     * @param {Number} y
     */
    function pixelOK(x, y) {
        const pixelColor = ctx.getImageData(x0 + x, y0 + y, 1, 1).data;
        return isBorderPixel(x, y) ? isBlack(pixelColor) : isWhite(pixelColor);
    }

    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    let cellOK = false;

    for (let x = 0; x < cellSize + borderWidth; x++) {
        for (let y = 0; y < cellSize + borderWidth; y++) {
            cellOK = pixelOK(x, y);
            if (!cellOK) {
                break;
            }
        }
    }

    return cellOK;
}

test('The central cell is white with a black border', async ({ page }) => {
    await page.goto('/');
    const canvas = await page.getByTestId('canvas');
    const { width, height } = await canvas.boundingBox();
    const cellSize = 20;
    const borderWidth = 2;

    // `x0` and `y0` are the coords of the top-left corner of the central cell.
    const x0 = width / 2 - (cellSize + borderWidth) / 2;
    const y0 = height / 2 - (cellSize + borderWidth) / 2;

    expect(
        await page.evaluate(cellIsAlive, { x0, y0, cellSize, borderWidth })
    ).toBeTruthy();
});
