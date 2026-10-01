import { Cell } from './cell.js';

export class Viewport {
    static cellSize = 20;
    static cellBorderWidth = 2;
    static cellStep = Viewport.cellSize + Viewport.cellBorderWidth;

    /**
     * Returns a new `Viewport` instance.
     *
     * @param {number} width - The width of the viewport in canvas pixels
     * @param {number} height - The height of the viewport in canvas pixels
     * @returns {Viewport}
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }

    get cellStep() {
        return Viewport.cellStep;
    }

    /**
     * Returns the canvas pixel co-ords of the cell grid's origin (the top-left
     * corner of cell `0,0`), relative to the top-left corner of the canvas.
     *
     * @returns {number[]}
     */
    get origin() {
        // This sets the centre of cell 0,0 at the centre of the canvas.
        const originX = this.width / 2 - this.cellStep / 2;
        const originY = this.height / 2 - this.cellStep / 2;
        return [originX, originY];
    }

    /**
     * Returns true if the given pixel lies on a cell's border.
     *
     * @param {{ x: number; y: number }} pixel - Position of the pixel relative
     *   to the cell's top-left corner.
     * @returns {boolean}
     */
    isBorderPixel(pixel) {
        return [pixel.x, pixel.y].some(
            (e) =>
                e === 0 ||
                e === Viewport.cellSize + Viewport.cellBorderWidth / 2
        );
    }

    /**
     * Converts from viewport/canvas co-ordinates to cell co-ordinates (see
     * documentation for `cellBodyPosition`).
     *
     * @param {number} x - The distance in canvas pixels of the click location
     *   from the left edge of the canvas
     * @param {number} y - The distance in canvas pixels of the click location
     *   from the top edge of the canvas
     * @returns {Cell}
     */
    cellAtPosition(x, y) {
        const [originX, originY] = this.origin;

        const cellX = Math.floor((x - originX) / this.cellStep);
        const cellY = -Math.floor((y - originY) / this.cellStep);

        return new Cell(cellX, cellY);
    }

    /**
     * Returns the location in the viewport of the top-left corner of the given
     * cell, relative to the top-left corner of the viewport.
     *
     * The cell co-ords have their origin at the centre of the viewport, and Y
     * increases in the upwards direction, whereas the canvas drawing co-ords
     * have their origin at the top left corner of the viewport, and Y increases
     * in the downwards direction.
     *
     * Cell `0,0` is defined to be at the centre of the viewport.
     *
     * @param {Cell} cell
     * @returns {number[]}
     */
    cellPosition(cell) {
        const [originX, originY] = this.origin;
        const posX = originX + cell.x * this.cellStep;
        const posY = originY - cell.y * this.cellStep;

        return [posX, posY];
    }

    /**
     * Converts from cell co-ords to viewport pixel offset.
     *
     * @param {Cell} cell
     * @returns {number[]} The co-ordinates in canvas pixels of the top-left
     *   corner of the cell body (not the cell's border). This is intended to be
     *   consumed by `ctx.fillRect` to draw the cell.
     */
    cellBodyPosition(cell) {
        const [posX, posY] = this.cellPosition(cell);

        // `posX` and `posY` are the canvas pixel co-ords for the top left corner
        // of the cell inclusive of its border. `cellBorderWidth / 2` is added to
        // each co-ord to give the position of the top-left corner of the *body* of
        // the cell, which is needed by `ctx.fillRect` to paint the cell. the
        // background is painted first then each cell painted onto the background
        // (see `render`).
        return [
            posX + Viewport.cellBorderWidth / 2,
            posY + Viewport.cellBorderWidth / 2
        ];
    }

    /**
     * Returns the canvas pixel co-ords of the centre of the given cell.
     *
     * @param {Cell} cell
     * @returns {number[]} The co-ordinates of the cell's centre **in canvas
     *   pixels**
     */
    cellCentre(cell) {
        const [cornerX, cornerY] = this.cellPosition(cell);
        const [centreX, centreY] = [
            cornerX + this.cellStep / 2,
            cornerY + this.cellStep / 2
        ];
        return [centreX, centreY];
    }
}

/**
 * Returns every cell currently visible within the canvas viewport.
 *
 * @param {object} canvas
 * @returns {Cell[]}
 */
export function visibleCells(canvas) {
    const [originX, originY] = new Viewport(canvas.width, canvas.height).origin;

    const minX = Math.floor(-originX / Viewport.cellStep);
    const maxX = Math.ceil((canvas.width - originX) / Viewport.cellStep) - 1;

    const minY = Math.floor(-(canvas.height - originY) / Viewport.cellStep) + 1;
    const maxY = Math.ceil(originY / Viewport.cellStep);

    const result = [];
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const cell = new Cell(x, y);
            result.push(cell);
        }
    }

    return result;
}
