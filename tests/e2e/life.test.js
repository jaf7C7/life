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
 * @param {Number} cellSize
 * @param {Number} cellBorderWidth
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
 * @param {Number} x
 * @param {Number} y
 * @param {Number} cellSize
 * @param {Number} cellBorderWidth
 * @returns {Boolean}
 */
function pixelOK(pixelData, x, y, cell) {
    return isBorderPixel(x, y, cell) ? isBlack(pixelData) : isWhite(pixelData);
}

/**
 * Grabs a slice of the `cellData` array containing the RGBA color information
 * for the pixel at position `x,y` in the rendered cell.
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Number} width
 * @param {Number[]} cellData
 * @returns {Number[]}
 */
function getPixelDataFromCellData(x, y, width, cellData) {
    const pixelDataSize = 4;
    const index = (x + y * width) * pixelDataSize;
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
 * @param {String} cell
 * @param {Number} cellSize
 * @param {Number} canvasWidth
 * @param {Number} canvasHeight
 * @returns {Number[]}
 */
function getCellLocation(
    cell,
    cellSize,
    cellBorderWidth,
    canvasWidth,
    canvasHeight
) {
    const [cellX, cellY] = cell.split(',');

    const x0 =
        canvasWidth / 2 -
        (cellSize + cellBorderWidth) / 2 +
        cellX * (cellSize + cellBorderWidth);
    const y0 =
        canvasHeight / 2 -
        (cellSize + cellBorderWidth) / 2 -
        cellY * (cellSize + cellBorderWidth);

    return [x0, y0];
}

/**
 * Checks each pixel in the given cell and returns `true` if all pixels are the
 * correct color, else `false.
 *
 * @param {Number} cellSize
 * @param {Number} cellBorderWidth
 * @param {Number[]} cellData
 * @returns {Boolean}
 */
function cellOK(cellSize, cellBorderWidth, cellData) {
    let result = false;

    for (let x = 0; x < cellSize + cellBorderWidth; x++) {
        for (let y = 0; y < cellSize + cellBorderWidth; y++) {
            const pixelData = getPixelDataFromCellData(
                x,
                y,
                cellSize + cellBorderWidth,
                cellData
            );
            const cell = { size: cellSize, borderWidth: cellBorderWidth };
            result = pixelOK(pixelData, x, y, cell);

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
 * @param {Number} context.cellSize
 * @param {Number} context.cellBorderWidth
 * @returns {Number[]}
 */
function getCellData({ x0, y0, cellSize, cellBorderWidth }) {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    return ctx.getImageData(
        x0,
        y0,
        cellSize + cellBorderWidth,
        cellSize + cellBorderWidth
    ).data;
}

test('A canvas element is created', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

test('Cell `0,0` is rendered', async ({ page }) => {
    await page.goto('/');

    const cell = '0,0';
    const cellBorderWidth = 2;
    const cellSize = 20;

    const canvas = await page.getByTestId('canvas');
    const { width: canvasWidth, height: canvasHeight } =
        await canvas.boundingBox();

    const [x0, y0] = getCellLocation(
        cell,
        cellSize,
        cellBorderWidth,
        canvasWidth,
        canvasHeight
    );

    const cellData = await page.evaluate(getCellData, {
        x0,
        y0,
        cellSize,
        cellBorderWidth
    });

    expect(cellOK(cellSize, cellBorderWidth, cellData)).toBeTruthy();
});
