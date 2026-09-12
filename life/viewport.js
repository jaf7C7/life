import { Cell, DisplayCell } from './cell.js';

export function cellCentre(canvas, cell) {
    const [cornerX, cornerY] = cellPosition(canvas, cell);
    const [centreX, centreY] = [
        cornerX + DisplayCell.step / 2,
        cornerY + DisplayCell.step / 2
    ];
    return [centreX, centreY];
}

export function getOrigin(canvas) {
    // This sets the centre of cell 0,0 at the centre of the canvas.
    const originX = canvas.width / 2 - DisplayCell.step / 2;
    const originY = canvas.height / 2 - DisplayCell.step / 2;
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
    const posX = originX + cell.x * DisplayCell.step;
    const posY = originY - cell.y * DisplayCell.step;

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
    // `of the cell inclusive of its border. DisplayCell.borderWidth / 2` is
    // `added to each co-ord to give the position of the top-left corner of the
    // `*body* of the cell, which is needed by `ctx.fillRect` to paint the
    // `cell. the background is painted first then each cell painted onto the
    // `background (see `render()`).
    return [
        posX + DisplayCell.borderWidth / 2,
        posY + DisplayCell.borderWidth / 2
    ];
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

    const cellX = Math.floor((offsetX - originX) / DisplayCell.step);
    const cellY = -Math.floor((offsetY - originY) / DisplayCell.step);

    return new Cell(cellX, cellY);
}

export function isBorderPixel(pixel) {
    return [pixel.x, pixel.y].some(
        (e) => e === 0 || e === DisplayCell.size + DisplayCell.borderWidth / 2
    );
}
