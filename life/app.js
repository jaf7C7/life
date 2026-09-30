import { Cell } from './cell.js';
import {
    Viewport,
    cellBodyPosition,
    visibleCells,
    cellSize
} from './viewport.js';

export const livingCellColor = '#ff0000';
export const deadCellColor = '#ffffff';
export const cellBorderColor = '#000000';

/**
 * Draws a cell in the viewport.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} canvas - A canvas object
 * @param {Cell} cell
 * @param {string} color - The color to fill the cell with in '#xxxxxx' format
 */
function renderCell(ctx, canvas, cell, color) {
    ctx.fillStyle = color;
    const [posX, posY] = cellBodyPosition(canvas, cell);
    ctx.fillRect(posX, posY, cellSize, cellSize);
}

/**
 * Renders a grid of dead cells, then paints the live cells over the top in a
 * different color.
 *
 * @param {object} canvas
 * @param {Set<string>} cells
 */
function render(canvas, cells) {
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = cellBorderColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const cell of visibleCells(canvas)) {
        renderCell(ctx, canvas, cell, deadCellColor);
    }

    for (const cell of liveCells(cells)) {
        renderCell(ctx, canvas, cell, livingCellColor);
    }
}

// SMELL: primitive obsession
/**
 * Returns the collection of living cells.
 *
 * @param {Set<string>} cells
 * @returns {Cell[]}
 */
function liveCells(cells) {
    return [...cells].map(Cell.fromString);
}

// SMELL: primitive obsession
/**
 * Toggles a given cell between alive/dead state.
 *
 * @param {Set<string>} cells - The set of living cells, necessary to check the
 *   current status of the target cell
 * @param {string} cell - The cell to toggle
 */
function toggleCell(cells, cell) {
    if (cells.has(cell)) {
        cells.delete(cell);
    } else {
        cells.add(cell);
    }
}

/**
 * Converts from CSS pixels (the CSS dimensions of a rendered element) to canvas
 * pixels (the logical pixels used for drawing on the canvas).
 *
 * @param {object} canvas - The canvas object
 * @param {number} xCSS - The x co-ord in CSS pixels
 * @param {number} yCSS - The y co-ord in CSS pixels
 * @returns {number[]} The co-ordinate pair in canvas co-ords
 */
function cssToCanvas(canvas, xCSS, yCSS) {
    const xCanvas = (canvas.width / canvas.clientWidth) * xCSS;
    const yCanvas = (canvas.height / canvas.clientHeight) * yCSS;
    return [xCanvas, yCanvas];
}

// SMELL: primitive obsession
/**
 * Returns a callback function to handle clicks on the canvas.
 *
 * @param {object} canvas
 * @param {Set<string>} cells
 * @returns {(event: MouseEvent) => void}
 */
function createClickHandler(canvas, cells) {
    return ({ offsetX, offsetY }) => {
        const [xCanvas, yCanvas] = cssToCanvas(canvas, offsetX, offsetY);
        const cell = new Viewport(canvas.width, canvas.height)
            .cellAtPosition(xCanvas, yCanvas)
            .toString();

        toggleCell(cells, cell);

        render(canvas, cells);
    };
}

/**
 * @typedef {object} UI
 * @property {(tag: string) => object} createElement
 */

/**
 * Initializes the app: creates a canvas, wires up click handling, and renders
 * the initial state.
 *
 * @param {UI} ui
 * @param {Set<string>} cells
 */
export function initApp(ui, cells) {
    const canvas = ui.createElement('canvas');
    const handleClick = createClickHandler(canvas, cells);

    canvas.addEventListener('click', handleClick);

    render(canvas, cells);
}
