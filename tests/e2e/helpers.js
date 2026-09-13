import { Cell } from '../../life/cell.js';
import {
    livingCellColor,
    deadCellColor,
    cellBorderColor
} from '../../life/app.js';
import {
    cellPosition,
    isBorderPixel,
    cellCentre,
    cellStep
} from '../../life/viewport.js';

/**
 * Converts RGB channel values to a CSS hex color string.
 *
 * @param {Number} r - Red channel (0-255).
 * @param {Number} g - Green channel (0-255).
 * @param {Number} b - Blue channel (0-255).
 * @returns {String}
 */
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

/**
 * Represents a pixel with position and color information.
 *
 * @property {Number} x - The X co-ordinate relative to the cell's top left
 *   corner.
 * @property {Number} y - The Y co-ordinate relative to the cell's top left
 *   corner.
 * @property {Number[]} data - An array containing the pixel's RGBA color
 *   information.
 */
class Pixel {
    data;

    /**
     * Creates a new pixel.
     *
     * @param {Number} x
     * @param {Number} y
     * @returns {Pixel}
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Returns the pixel's color as a CSS hex color string.
     *
     * @returns {String}
     */
    get color() {
        const [r, g, b] = this.data;
        return rgbToHex(r, g, b);
    }
}

/**
 * Represents a cell on the canvas, with methods for asserting on its rendered
 * pixel data.
 *
 * @param {Number} x - The X co-ordinate of the cell relative to the centre of
 *   the canvas.
 * @param {Number} y - The Y co-ordinate of the cell relative to the centre of
 *   the canvas.
 */
class RenderedCell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Fetches information about a specific pixel of the rendered cell.
     *
     * @param {Number} x - The X co-ordinate of the pixel relative to the cell's
     *   top left corner.
     * @param {Number} y - The Y co-ordinate of the pixel relative to the cell's
     *   top left corner.
     * @returns {Pixel}
     */
    pixel(x, y) {
        const pixel = new Pixel(x, y);
        pixel.data = this.pixelData(pixel);
        return pixel;
    }

    /**
     * Returns a slice of the cell's image data containing the RGBA color
     * information for the specified pixel.
     *
     * @param {Pixel} pixel
     * @returns {Number[]}
     */
    pixelData(pixel) {
        const pixelDataSize = 4;
        // imgData is a 1D array of the form [r, g, b, a, r, g, b, a, ...]
        // containing the color information of each pixel going in rows from
        // top left to bottom right. I can't understand this calculation any
        // more but it finds the [r, g, b, a] slice of the pixel we want to
        // target.
        // TODO: Work out what's going on here
        const index = (pixel.x + pixel.y * cellStep) * pixelDataSize;
        return this.imgData.slice(index, index + pixelDataSize);
    }

    /**
     * Returns true if the pixel is at the edge of the cell.
     *
     * @param {Pixel} pixel
     * @returns {Boolean}
     */
    hasBorderPixel(pixel) {
        return isBorderPixel(pixel);
    }

    cellIsColor(color) {
        return Array.from({ length: cellStep }, (_, x) =>
            Array.from({ length: cellStep }, (_, y) => {
                const pixel = this.pixel(x, y);
                return this.hasBorderPixel(pixel)
                    ? pixel.color === cellBorderColor
                    : pixel.color === color;
            })
        ).every((row) => row.every(Boolean));
    }

    /**
     * Returns true if the cell's border pixels are black and its body pixels
     * are the alive color, else false.
     *
     * @returns {Boolean}
     */
    isAlive() {
        return this.cellIsColor(livingCellColor);
    }

    /**
     * Returns true if all pixels in the cell match the dead cell color, else
     * false.
     *
     * @returns {Boolean}
     */
    isDead() {
        return this.cellIsColor(deadCellColor);
    }
}

/**
 * Represents the canvas of cells where the game state is displayed.
 *
 * @param {Number} width - The width of the rendered canvas in pixels.
 * @param {Number} height - The height of the rendered canvas in pixels.
 * @param {Object} locator - The Playwright `Locator` object for the rendered
 *   canvas.
 */
export class RenderedCanvas {
    constructor(width, height, locator) {
        this.width = width;
        this.height = height;
        this.locator = locator;
    }

    /**
     * Alternative constructor to create a RenderedCanvas from a rendered page.
     *
     * @param {Object} page - A Playwright `Page` object.
     */
    static async fromPage(page) {
        const locator = await page.getByTestId('canvas');
        const { width, height } = await locator.boundingBox();

        return new this(width, height, locator);
    }

    /**
     * Clicks the canvas at the given position.
     *
     * @param {Number} x - The X co-ordinate relative to the canvas top-left
     *   corner.
     * @param {Number} y - The Y co-ordinate relative to the canvas top-left
     *   corner.
     */
    async click({ x, y }) {
        await this.locator.click({ position: { x, y } });
    }

    /**
     * Clicks the centre of the cell at the given cell co-ordinates.
     *
     * @param {Number} cellX - The X co-ordinate of the cell.
     * @param {Number} cellY - The Y co-ordinate of the cell.
     */
    async clickCell(cellX, cellY) {
        const cell = new Cell(cellX, cellY);
        const [centreX, centreY] = cellCentre(this, cell);
        await this.click({ x: centreX, y: centreY });
    }

    /**
     * Returns a new RenderedCell object containing position and image data
     * about a particular cell on the rendered canvas.
     *
     * @param {Number} x - The X co-ordinate of the cell relative to the centre
     *   of the canvas.
     * @param {Number} y - The Y co-ordinate of the cell relative to the centre
     *   of the canvas.
     * @returns {RenderedCell}
     */
    async cell(x, y) {
        const cell = new RenderedCell(x, y);

        const [posX, posY] = cellPosition(this, cell);
        cell.posX = posX;
        cell.posY = posY;

        cell.imgData = await this.cellImgData(cell);

        return cell;
    }

    /**
     * Grabs a cell-sized chunk of image data from the rendered canvas and
     * returns it. The image data array is a 1-dimensional array containing
     * sequences of 4 elements, each containing the RGBA color information for a
     * single pixel.
     *
     * @param {RenderedCell} cell
     * @returns {Number[]}
     */
    async cellImgData(cell) {
        return await this.locator.evaluate(
            (element, { posX, posY, step }) => {
                const ctx = element.getContext('2d');
                return ctx.getImageData(posX, posY, step, step).data;
            },
            { posX: cell.posX, posY: cell.posY, step: cellStep }
        );
    }
}
