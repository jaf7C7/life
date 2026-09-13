import { Cell } from './cell.js';

export const cellSize = 20;
const cellBorderWidth = 2;
export const cellStep = cellSize + cellBorderWidth;

export function visibleCells(canvas) {
    const [originX, originY] = getOrigin(canvas);

    // `minX`: How many cells does it take to totally fill the space from the
    // centre of the viewport (canvas) to the left edge of the viewport?
    // Negative as viewport centre is the origin of the cell co-ords.
    const minX = Math.floor(-originX / cellStep);

    // `maxX`: How many cells does is take to totally fill the space from the
    // centre of the viewport (canvas) to the right edge of the viewport?
    const maxX = Math.floor((canvas.width - originX) / cellStep);

    // `minY`, `maxY` analagous to `minX`/`maxX` but in the vertical direction.
    // Note that the Y-axes of the viewport/canvas and of the cell grid are in
    // opposite directions -- The viewport/canvas origin is in the top-left
    // corner of the canvas element and Y increases downwards, while the origin
    // of the cell grid is centred in the canvas and Y increases upwards. This
    // is shown in by the `-(...)` expression in the calculation of `minY`.
    const minY = Math.floor(-(canvas.height - originY) / cellStep);
    const maxY = Math.ceil(originY / cellStep);

    const result = [];
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const cell = new Cell(x, y);
            result.push(cell);
        }
    }

    return result;
}

export function cellCentre(canvas, cell) {
    const [cornerX, cornerY] = cellPosition(canvas, cell);
    const [centreX, centreY] = [cornerX + cellStep / 2, cornerY + cellStep / 2];
    return [centreX, centreY];
}

export function getOrigin(canvas) {
    // This sets the centre of cell 0,0 at the centre of the canvas.
    const originX = canvas.width / 2 - cellStep / 2;
    const originY = canvas.height / 2 - cellStep / 2;
    return [originX, originY];
}

/**
 * Returns the location on the canvas of the top-left corner of the given cell,
 * relative to the top-left corner of the canvas.
 *
 * The cell co-ords have their origin at the centre of the canvas, and Y
 * increases in the upwards direction, whereas the canvas drawing co-ords have
 * their origin at the top left corner of the canvas, and Y increases in the
 * downwards direction.
 *
 * Cell `0,0` is defined to be at the centre of the canvas.
 *
 * @param {RenderedCell} cell
 * @returns {Number[]}
 */
export function cellPosition(canvas, cell) {
    const [originX, originY] = getOrigin(canvas);
    const posX = originX + cell.x * cellStep;
    const posY = originY - cell.y * cellStep;

    return [posX, posY];
}

/**
 * Converts from cell co-ords to viewport pixel offset.
 *
 * @param {Number} originX - Horizontal distance in canvas pixels of the centre
 *   of the canvas from the top left corner
 * @param {Number} originY - Vertical distance in canvas pixels of the centre of
 *   the canvas from the top left corner
 * @param {Number} x - X co-ord of cell
 * @param {Number} y - Y co-ord of cell
 * @returns {Number[]} The co-ordinates in canvas pixels of the top-left corner
 *   of the cell body (not the cell's border). This is intended to be consumed
 *   by `ctx.fillRect` to draw the cell.
 */
export function cellBodyPosition(canvas, cell) {
    const [posX, posY] = cellPosition(canvas, cell);

    // `posX` and `posY` are the canvas pixel co-ords for the top left corner
    // `of the cell inclusive of its border. cellBorderWidth / 2` is
    // `added to each co-ord to give the position of the top-left corner of the
    // `*body* of the cell, which is needed by `ctx.fillRect` to paint the
    // `cell. the background is painted first then each cell painted onto the
    // `background (see `render()`).
    return [posX + cellBorderWidth / 2, posY + cellBorderWidth / 2];
}

/**
 * Converts from viewport/canvas co-ordinates to cell co-ordinates (see
 * documentation for `cellBodyPosition`).
 *
 * @param {Number} offsetX - The distance in canvas pixels of the click location
 *   from the left edge of the canvas
 * @param {Number} offsetY - The distance in canvas pixels of the click location
 *   from the top edge of the canvas
 * @param {Number} originX - Horizontal distance in canvas pixels of the centre
 *   of the canvas from the top left corner
 * @param {Number} originY - Vertical distance in canvas pixels of the centre of
 *   the canvas from the top left corner
 * @returns {Cell}
 */
export function cellAtPosition(canvas, offsetX, offsetY) {
    const [originX, originY] = getOrigin(canvas);

    const cellX = Math.floor((offsetX - originX) / cellStep);
    const cellY = -Math.floor((offsetY - originY) / cellStep);

    return new Cell(cellX, cellY);
}

export function isBorderPixel(pixel) {
    return [pixel.x, pixel.y].some(
        (e) => e === 0 || e === cellSize + cellBorderWidth / 2
    );
}
