import { test, expect } from '@playwright/test';

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
 * Returns true if the pixel is at the edge of the cell. X and Y co-ordinates
 * are relative to the top-left corner of the cell.
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Object} cell
 * @returns {Boolean}
 */
function isBorderPixel(pixelX, pixelY, cell) {
    return [pixelX, pixelY].some(
        (e) => e === 0 || e === cell.size + cell.borderWidth / 2
    );
}

/**
 * Checks the given pixel and returns a boolean indicating whether it is the
 * correct color given its position. Border pixels should be black, and other
 * pixels should be white. The co-ordinates are relative to the top-left corner
 * of the cell.
 *
 * @param {Number} pixelX
 * @param {Number} pixelY
 * @param {Object} cell
 * @returns {Boolean}
 */
function pixelOK(pixelData, pixelX, pixelY, cell) {
    return isBorderPixel(pixelX, pixelY, cell)
        ? isBlack(pixelData)
        : isWhite(pixelData);
}

/**
 * Grabs a slice of the `cellData` array containing the RGBA color information
 * for the pixel at position `x,y` in the rendered cell.
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Number} cellWidth
 * @param {Number[]} cellData
 * @returns {Number[]}
 */
function getPixelDataFromCellData(pixelX, pixelY, cellWidth, cellData) {
    const pixelDataSize = 4;
    const index = (pixelX + pixelY * cellWidth) * pixelDataSize;
    return cellData.slice(index, index + pixelDataSize);
}

/**
 * Returns the location on the canvas of the top-left corner of the given cell,
 * relative to the top-left corner of the canvas.
 *
 * The cell co-ords have their origin at the centre of the canvas, and y
 * increases in the upwards direction, whereas the canvas drawing co-ords have
 * their origin at the top left corner of the canvas, and y increases in the
 * downwards direction.
 *
 * Cell `0,0` is defined to be at the centre of the canvas.
 *
 * @param {Object} cell
 * @param {Number} canvasWidth
 * @param {Number} canvasHeight
 * @returns {Number[]}
 */
function getCellLocation(cell, canvasWidth, canvasHeight) {
    const x0 =
        canvasWidth / 2 -
        (cell.size + cell.borderWidth) / 2 +
        cell.x * (cell.size + cell.borderWidth);
    const y0 =
        canvasHeight / 2 -
        (cell.size + cell.borderWidth) / 2 -
        cell.y * (cell.size + cell.borderWidth);

    return [x0, y0];
}

/**
 * Checks each pixel in the given cell and returns `true` if all pixels are the
 * correct color, else `false.
 *
 * @param {Object} cell
 * @param {Number[]} cellData
 * @returns {Boolean}
 */
function cellOK(cell, cellData) {
    let result = false;

    for (let pixelX = 0; pixelX < cell.size + cell.borderWidth; pixelX++) {
        for (let pixelY = 0; pixelY < cell.size + cell.borderWidth; pixelY++) {
            const pixelData = getPixelDataFromCellData(
                pixelX,
                pixelY,
                cell.size + cell.borderWidth,
                cellData
            );
            result = pixelOK(pixelData, pixelX, pixelY, cell);

            if (!result) {
                break;
            }
        }
    }

    return result;
}

/**
 * Grabs a cell-sized chunk of image data from the rendered canvas and returns
 * it.
 *
 * The `cellData` array is a 1-dimensional array containing a sequence of 4
 * elements, containing the RGBA color information for each pixel.
 *
 * @param {Object} context
 * @param {Number} context.x0
 * @param {Number} context.y0
 * @param {Object} context.cell
 * @returns {Number[]}
 */
function getCellData({ x0, y0, cell }) {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    return ctx.getImageData(
        x0,
        y0,
        cell.size + cell.borderWidth,
        cell.size + cell.borderWidth
    ).data;
}

test('A canvas element is created', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

test('Cell `0,0` is rendered', async ({ page }) => {
    await page.goto('/');

    const cell = { x: 0, y: 0, borderWidth: 2, size: 20 };

    const canvas = await page.getByTestId('canvas');
    const { width: canvasWidth, height: canvasHeight } =
        await canvas.boundingBox();

    const [x0, y0] = getCellLocation(cell, canvasWidth, canvasHeight);

    const cellData = await page.evaluate(getCellData, {
        x0,
        y0,
        cell
    });

    expect(cellOK(cell, cellData)).toBeTruthy();
});
