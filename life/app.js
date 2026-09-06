import { Cell } from './cell.js';

/**
 * Converts from cell co-ords to viewport pixel offset.
 *
 * @param {Number} originX - Horizontal offset of viewport origin
 * @param {Number} originY - Vertical offset of viewport origin
 * @param {Number} x - X co-ord of cell
 * @param {Number} y - Y co-ord of cell
 */
function cellToScreen(originX, originY, x, y) {
    const posX = originX + x * Cell.step + Cell.borderWidth / 2;
    const posY = originY - y * Cell.step + Cell.borderWidth / 2;

    return [posX, posY];
}

/**
 * Draws a cell in the viewport.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} originX - Horizontal offset of viewport origin
 * @param {Number} originY - Vertical offset of viewport origin
 * @param {Cell} cell
 * @param {String} color - The color to fill the cell with in '#xxxxxx' format
 */
function renderCell(ctx, originX, originY, cell, color) {
    ctx.fillStyle = color;
    const [posX, posY] = cellToScreen(originX, originY, cell.x, cell.y);
    ctx.fillRect(posX, posY, Cell.size, Cell.size);
}

/**
 * Renders a grid of dead cells, then paints the live cells over the top in a
 * different color.
 */
function render(canvas, originX, originY, cells) {
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = Cell.borderColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // `minX`: How many cells does it take to totally fill the space from the
    // centre of the viewport (canvas) to the left edge of the viewport?
    // Negative as viewport centre is the origin of the cell co-ords.
    const minX = Math.floor(-originX / Cell.step);

    // `maxX`: How many cells does is take to totally fill the space from the
    // centre of the viewport (canvas) to the right edge of the viewport?
    const maxX = Math.floor((canvas.width - originX) / Cell.step);

    // `minY`, `maxY` analagous to `minX`/`maxX` but in the vertical direction.
    // Note that the Y-axes of the viewport/canvas and of the cell grid are in
    // opposite directions -- The viewport/canvas origin is in the top-left
    // corner of the canvas element and Y increases downwards, while the origin
    // of the cell grid is centred in the canvas and Y increases upwards. This
    // is shown in by the `-(...)` expression in the calculation of `minY`.
    const minY = Math.floor(-(canvas.height - originY) / Cell.step);
    const maxY = Math.ceil(originY / Cell.step);

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const cell = new Cell(x, y);
            renderCell(ctx, originX, originY, cell, Cell.deadColor);
        }
    }

    for (const cell of [...cells].map(Cell.fromString)) {
        renderCell(ctx, originX, originY, cell, Cell.aliveColor);
    }
}

/** Converts from viewport/canvas co-ordinates to cell co-ordinates. */
function cellFromScreen(offsetX, offsetY, originX, originY) {
    const cellX = Math.floor((offsetX - originX) / Cell.step);
    const cellY = -Math.floor((offsetY - originY) / Cell.step);

    return new Cell(cellX, cellY);
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
    const originX = canvas.width / 2 - Cell.step / 2;
    const originY = canvas.height / 2 - Cell.step / 2;
    const handleClick = createClickHandler(ui, canvas, originX, originY, cells);

    canvas.addEventListener('click', handleClick);

    render(canvas, originX, originY, cells);
}
