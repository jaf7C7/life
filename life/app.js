import { Cell } from './cell.js';
import { DisplayCell } from './cell.js';

function getOrigin(canvas) {
    // This sets the centre of cell 0,0 at the centre of the canvas.
    const originX = canvas.width / 2 - DisplayCell.step / 2;
    const originY = canvas.height / 2 - DisplayCell.step / 2;
    return [originX, originY];
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
function cellToScreen(originX, originY, x, y) {
    const posX = originX + x * DisplayCell.step;
    const posY = originY - y * DisplayCell.step;

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
 * documentation for `cellToScreen`). **NOTE**: This gives the co-ords of the
 * _top-left_ corner of the _body_ of the cell, excluding the cell border)
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
function cellFromScreen(offsetX, offsetY, originX, originY) {
    const cellX = Math.floor((offsetX - originX) / DisplayCell.step);
    const cellY = -Math.floor((offsetY - originY) / DisplayCell.step);

    return new Cell(cellX, cellY);
}

/**
 * Draws a cell in the viewport.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} originX - Horizontal distance in canvas pixels of the centre
 *   of the canvas from the top left corner
 * @param {Number} originY - Vertical distance in canvas pixels of the centre of
 *   the canvas from the top left corner
 * @param {Cell} cell
 * @param {String} color - The color to fill the cell with in '#xxxxxx' format
 */
function renderCell(ctx, originX, originY, cell, color) {
    ctx.fillStyle = color;
    const [posX, posY] = cellToScreen(originX, originY, cell.x, cell.y);
    ctx.fillRect(posX, posY, DisplayCell.size, DisplayCell.size);
}

/**
 * Renders a grid of dead cells, then paints the live cells over the top in a
 * different color.
 */
function render(canvas, originX, originY, cells) {
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = DisplayCell.borderColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // `minX`: How many cells does it take to totally fill the space from the
    // centre of the viewport (canvas) to the left edge of the viewport?
    // Negative as viewport centre is the origin of the cell co-ords.
    const minX = Math.floor(-originX / DisplayCell.step);

    // `maxX`: How many cells does is take to totally fill the space from the
    // centre of the viewport (canvas) to the right edge of the viewport?
    const maxX = Math.floor((canvas.width - originX) / DisplayCell.step);

    // `minY`, `maxY` analagous to `minX`/`maxX` but in the vertical direction.
    // Note that the Y-axes of the viewport/canvas and of the cell grid are in
    // opposite directions -- The viewport/canvas origin is in the top-left
    // corner of the canvas element and Y increases downwards, while the origin
    // of the cell grid is centred in the canvas and Y increases upwards. This
    // is shown in by the `-(...)` expression in the calculation of `minY`.
    const minY = Math.floor(-(canvas.height - originY) / DisplayCell.step);
    const maxY = Math.ceil(originY / DisplayCell.step);

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const cell = new Cell(x, y);
            renderCell(ctx, originX, originY, cell, DisplayCell.deadColor);
        }
    }

    for (const cell of [...cells].map(Cell.fromString)) {
        renderCell(ctx, originX, originY, cell, DisplayCell.aliveColor);
    }
}

/**
 * Toggles a given cell between alive/dead state.
 *
 * @param {Cell} cell - The cell to toggle
 * @param {Set<Cell>} cells - The set of living cells, necessary to check the
 *   current status of the target cell
 */
function toggleCell(cell, cells) {
    if (cells.has(cell)) {
        cells.delete(cell);
    } else {
        cells.add(cell);
    }
}

/**
 * Returns a callback function to handle clicks on the canvas. The function
 * translates the click co-ords into cell co-ords, toggles the corresponding
 * cell and repaints the canvas.
 */
function createClickHandler(ui, canvas, originX, originY, cells) {
    return ({ offsetX, offsetY }) => {
        const cell = cellFromScreen(
            offsetX,
            offsetY,
            originX,
            originY
        ).toString();

        toggleCell(cell, cells);

        render(canvas, originX, originY, cells);
    };
}

export function initApp(ui, cells) {
    const canvas = ui.createElement('canvas');

    const [originX, originY] = getOrigin(canvas);
    const handleClick = createClickHandler(ui, canvas, originX, originY, cells);

    canvas.addEventListener('click', handleClick);

    render(canvas, originX, originY, cells);
}
