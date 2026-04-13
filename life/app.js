import { Cell } from './cell.js';
import { render } from './render.js';

function cellFromScreen(offsetX, offsetY, originX, originY) {
    const cellX = Math.floor((offsetX - originX) / Cell.step);
    const cellY = -Math.floor((offsetY - originY) / Cell.step);

    return new Cell(cellX, cellY);
}

function toggleCell(cell, cells) {
    if (cells.has(cell)) {
        cells.delete(cell);
    } else {
        cells.add(cell);
    }
}

function createClickHandler(ui, canvas, originX, originY, cells) {
    return ({ offsetX, offsetY }) => {
        const cell = cellFromScreen(
            offsetX,
            offsetY,
            originX,
            originY
        ).toString();
        toggleCell(cell, cells);

        const origin = { x: originX, y: originY };
        render(canvas, cells, origin);
    };
}

export function initApp(ui, cells) {
    const canvas = ui.createElement('canvas');
    const originX = canvas.width / 2 - Cell.step / 2;
    const originY = canvas.height / 2 - Cell.step / 2;

    const handleClick = createClickHandler(ui, canvas, originX, originY, cells);
    canvas.addEventListener('click', handleClick);

    const origin = { x: originX, y: originY };
    render(canvas, cells, origin);
}
