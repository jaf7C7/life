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
 * Grabs a slice of the `cellImgData` array containing the RGBA color
 * information for the pixel at position `x,y` in the rendered cell.
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Number} cellWidth
 * @param {Number[]} cellImgData
 * @returns {Number[]}
 */
function getPixelDataFromCellImgData(pixelX, pixelY, cellWidth, cellImgData) {
    const pixelDataSize = 4;
    const index = (pixelX + pixelY * cellWidth) * pixelDataSize;
    return cellImgData.slice(index, index + pixelDataSize);
}

class Cell {
    borderWidth = 2;
    size = 20;

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Checks each pixel in the given cell and returns `true` if all pixels are
     * the correct color, else `false.
     *
     * @returns {Boolean}
     */
    isRendered() {
        let result = false;

        for (let pixelX = 0; pixelX < this.size + this.borderWidth; pixelX++) {
            for (
                let pixelY = 0;
                pixelY < this.size + this.borderWidth;
                pixelY++
            ) {
                const pixelData = getPixelDataFromCellImgData(
                    pixelX,
                    pixelY,
                    this.size + this.borderWidth,
                    this.imgData
                );
                result = pixelOK(pixelData, pixelX, pixelY, this);

                if (!result) {
                    break;
                }
            }
        }

        return result;
    }
}

class Canvas {
    static async fromPage(page) {
        const locator = await page.getByTestId('canvas');
        const { width, height } = await locator.boundingBox();

        return new this(width, height, locator);
    }

    constructor(width, height, locator) {
        this.width = width;
        this.height = height;
        if (locator) {
            this.locator = locator;
        }
    }

    async cell(x, y) {
        const cell = new Cell(x, y);

        const [posX, posY] = this.cellPosition(cell);
        cell.posX = posX;
        cell.posY = posY;

        cell.imgData = await this.cellImgData(cell);

        return cell;
    }

    /**
     * Returns the location on the canvas of the top-left corner of the given
     * cell, relative to the top-left corner of the canvas.
     *
     * The cell co-ords have their origin at the centre of the canvas, and y
     * increases in the upwards direction, whereas the canvas drawing co-ords
     * have their origin at the top left corner of the canvas, and y increases
     * in the downwards direction.
     *
     * Cell `0,0` is defined to be at the centre of the canvas.
     *
     * @param {Object} cell
     * @returns {Number[]}
     */
    cellPosition(cell) {
        const posX =
            this.width / 2 -
            (cell.size + cell.borderWidth) / 2 +
            cell.x * (cell.size + cell.borderWidth);
        const posY =
            this.height / 2 -
            (cell.size + cell.borderWidth) / 2 -
            cell.y * (cell.size + cell.borderWidth);

        return [posX, posY];
    }

    /**
     * Grabs a cell-sized chunk of image data from the rendered canvas and
     * returns it. The `cellImgData` array is a 1-dimensional array containing a
     * sequence of 4 elements, containing the RGBA color information for each
     * pixel.
     *
     * @param {Object} canvas
     * @param {Object} cell
     * @returns {Number[]}
     */
    async cellImgData(cell) {
        return await this.locator.evaluate((element, cell) => {
            const ctx = element.getContext('2d');
            return ctx.getImageData(
                cell.posX,
                cell.posY,
                cell.size + cell.borderWidth,
                cell.size + cell.borderWidth
            ).data;
        }, cell);
    }
}

test('A canvas element is created', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

test('Cell `0,0` is rendered', async ({ page }) => {
    await page.goto('/');
    const canvas = await Canvas.fromPage(page);

    expect((await canvas.cell(0, 0)).isRendered()).toBe(true);
});
