import { Cell } from './cell.js';
import { DisplayCell } from './cell.js';
import { getOrigin, cellBodyPosition, cellAtPosition } from './viewport.js';

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
function renderCell(ctx, canvas, cell, color) {
    ctx.fillStyle = color;
    const [posX, posY] = cellBodyPosition(canvas, cell);
    ctx.fillRect(posX, posY, DisplayCell.size, DisplayCell.size);
}

/**
 * Renders a grid of dead cells, then paints the live cells over the top in a
 * different color.
 */
function render(canvas, cells) {
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = DisplayCell.borderColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const [originX, originY] = getOrigin(canvas);

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

    const visibleCells = [];
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const cell = new Cell(x, y);
            visibleCells.push(cell);
        }
    }

    for (const cell of visibleCells) {
        renderCell(ctx, canvas, cell, DisplayCell.deadColor);
    }

    for (const cell of liveCells(cells)) {
        renderCell(ctx, canvas, cell, DisplayCell.aliveColor);
    }
}

function liveCells(cells) {
    return [...cells].map(Cell.fromString);
}

/**
 * Toggles a given cell between alive/dead state.
 *
 * @param {Set<Cell>} cells - The set of living cells, necessary to check the
 *   current status of the target cell
 * @param {Cell} cell - The cell to toggle
 */
function toggleCell(cells, cell) {
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
function createClickHandler(canvas, cells) {
    return ({ offsetX, offsetY }) => {
        const cell = cellAtPosition(canvas, offsetX, offsetY).toString();

        toggleCell(cells, cell);

        render(canvas, cells);
    };
}

export function initApp(ui, cells) {
    const canvas = ui.createElement('canvas');
    const handleClick = createClickHandler(canvas, cells);

    canvas.addEventListener('click', handleClick);

    render(canvas, cells);
}
