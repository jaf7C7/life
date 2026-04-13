import { Cell } from './cell.js';
import { render } from './render.js';

function cellFromScreen(offsetX, offsetY, origin) {
    const cellX = Math.floor((offsetX - origin.x) / Cell.step);
    const cellY = -Math.floor((offsetY - origin.y) / Cell.step);

    return new Cell(cellX, cellY);
}

function toggleCell(cell, cells) {
    if (cells.has(cell)) {
        cells.delete(cell);
    } else {
        cells.add(cell);
    }
}

function createClickHandler(ui, canvas, origin, cells) {
    return ({ offsetX, offsetY }) => {
        const cell = cellFromScreen(offsetX, offsetY, origin).toString();
        toggleCell(cell, cells);
        render(canvas, cells, origin);
    };
}

export function initApp(ui, cells) {
    const canvas = ui.createElement('canvas');
    const origin = {
        x: canvas.width / 2 - Cell.step / 2,
        y: canvas.height / 2 - Cell.step / 2
    };

    const handleClick = createClickHandler(ui, canvas, origin, cells);
    canvas.addEventListener('click', handleClick);

    render(canvas, cells, origin);
}
