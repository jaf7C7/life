import { Cell } from '../../life/cell.js';

const cellStep = Cell.size + Cell.borderWidth;

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
class RenderedCell extends Cell {
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
        const { size, borderWidth } = this.constructor;
        return [pixel.x, pixel.y].some(
            (e) => e === 0 || e === size + borderWidth / 2
        );
    }

    /**
     * Returns true if the cell's border pixels are black and its body pixels
     * are the alive color, else false.
     *
     * @returns {Boolean}
     */
    isAlive() {
        const { borderColor, aliveColor } = this.constructor;
        return Array.from({ length: cellStep }, (_, x) =>
            Array.from({ length: cellStep }, (_, y) => {
                const pixel = this.pixel(x, y);
                return this.hasBorderPixel(pixel)
                    ? pixel.color === borderColor
                    : pixel.color === aliveColor;
            })
        ).every((row) => row.every(Boolean));
    }

    /**
     * Returns true if all pixels in the cell match the dead cell color, else
     * false.
     *
     * @returns {Boolean}
     */
    isDead() {
        const { borderColor, deadColor } = this.constructor;
        return Array.from({ length: cellStep }, (_, x) =>
            Array.from({ length: cellStep }, (_, y) => {
                const pixel = this.pixel(x, y);
                return this.hasBorderPixel(pixel)
                    ? pixel.color === borderColor
                    : pixel.color === deadColor;
            })
        ).every((row) => row.every(Boolean));
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
export class Canvas {
    /**
     * Alternative constructor to create a Canvas from a rendered page.
     *
     * @param {Object} page - A Playwright `Page` object.
     */
    static async fromPage(page) {
        const locator = await page.getByTestId('canvas');
        const { width, height } = await locator.boundingBox();

        return new this(width, height, locator);
    }

    /**
     * Creates a new Canvas.
     *
     * @param {Number} width
     * @param {Number} height
     * @param {Object} locator
     */
    constructor(width, height, locator) {
        this.width = width;
        this.height = height;
        if (locator) {
            this.locator = locator;
        }
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
        await this.click({
            x: this.width / 2 + cellX * cellStep,
            y: this.height / 2 - cellY * cellStep
        });
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
     * The cell co-ords have their origin at the centre of the canvas, and Y
     * increases in the upwards direction, whereas the canvas drawing co-ords
     * have their origin at the top left corner of the canvas, and Y increases
     * in the downwards direction.
     *
     * Cell `0,0` is defined to be at the centre of the canvas.
     *
     * @param {RenderedCell} cell
     * @returns {Number[]}
     */
    cellPosition(cell) {
        const originX = this.width / 2 - cellStep / 2;
        const originY = this.height / 2 - cellStep / 2;
        const posX = originX + cell.x * cellStep;
        const posY = originY - cell.y * cellStep;

        return [posX, posY];
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
