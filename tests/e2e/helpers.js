/**
 * Represents a pixel with position and color information.
 *
 * @property {Number} x - The X co-ordinate relative to the cell's top left
 *   corner.
 * @property {Number} y - The X co-ordinate relative to the cell's top left
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
     * Returns true if the given pixel color data represents opaque black, else
     * false.
     *
     * @returns {Boolean}
     */
    isBlack() {
        const [r, g, b, a] = this.data;
        return [r, g, b].every((e) => e === 0) && a === 255;
    }

    /**
     * Returns true if the given pixel color data represents opaque white, else
     * false.
     *
     * @returns {Boolean}
     */
    isWhite() {
        const [r, g, b, a] = this.data;
        return [r, g, b].every((e) => e === 255) && a === 255;
    }
}

/**
 * Represents a cell on the canvas.
 *
 * @param {Number} x - The X co-ordinate of the cell relative to the centre of
 *   the canvas.
 * @param {Number} y - The Y co-ordinate of the cell relative to the centre of
 *   the canvas.
 * @param {Number} borderWidth - The thickness in canvas pixels of the lines
 *   separating each cell.
 * @param {Number} size - The size in canvas pixels of the cell body.
 */
class Cell {
    borderWidth = 2;
    size = 20;

    /**
     * Creates a new cell.
     *
     * @param {Number} x
     * @param {Number} y
     * @returns {Cell}
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Fetches information about a specific pixel of the rendered cell.
     *
     * @param x - The X co-ordinate of the pixel relative to the cell's top left
     *   corner.
     * @param y - The Y co-ordinate of the pixel relative to the cell's top left
     *   corner.
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
        const index =
            (pixel.x + pixel.y * (this.size + this.borderWidth)) *
            pixelDataSize;
        return this.imgData.slice(index, index + pixelDataSize);
    }

    /**
     * Returns true if the pixel is at the edge of the cell.
     *
     * @param {Pixel} pixel
     * @returns {Boolean}
     */
    hasBorderPixel(pixel) {
        return [pixel.x, pixel.y].some(
            (e) => e === 0 || e === this.size + this.borderWidth / 2
        );
    }

    /**
     * Checks each pixel in the given cell and returns `true` if all pixels are
     * the correct color, else `false.
     *
     * @returns {Boolean}
     */
    isRendered() {
        let result = false;

        outerLoop: for (let x = 0; x < this.size + this.borderWidth; x++) {
            for (let y = 0; y < this.size + this.borderWidth; y++) {
                const pixel = this.pixel(x, y);

                result = this.hasBorderPixel(pixel)
                    ? pixel.isBlack()
                    : pixel.isWhite();

                if (!result) {
                    break outerLoop;
                }
            }
        }

        return result;
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
     * Returns a new Cell object containing position and image data about a
     * particular cell on the rendered canvas.
     *
     * @param {Number} x - The X co-ordinate of the cell relative to the centre
     *   of the canvas.
     * @param {Number} y - The Y co-ordinate of the cell relative to the centre
     *   of the canvas.
     * @returns {Cell}
     */
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
     * The cell co-ords have their origin at the centre of the canvas, and Y
     * increases in the upwards direction, whereas the canvas drawing co-ords
     * have their origin at the top left corner of the canvas, and Y increases
     * in the downwards direction.
     *
     * Cell `0,0` is defined to be at the centre of the canvas.
     *
     * @param {Cell} cell
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
     * returns it. The image data array is a 1-dimensional array containing
     * sequences of 4 elements, each containing the RGBA color information for a
     * single pixel.
     *
     * @param {Cell} cell
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
