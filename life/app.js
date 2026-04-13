import { Cell } from './cell.js';
import { render } from './render.js';

function cellFromScreen(offsetX, offsetY, origin) {
    const cellX = Math.floor((offsetX - origin.x) / Cell.step);
    const cellY = -Math.floor((offsetY - origin.y) / Cell.step);

    return new Cell(cellX, cellY);
}

export function initApp(ui, cells) {
    const canvas = ui.createElement('canvas');
    const origin = {
        x: canvas.width / 2 - Cell.step / 2,
        y: canvas.height / 2 - Cell.step / 2
    };

    canvas.addEventListener('click', ({ offsetX, offsetY }) => {
        const cell = cellFromScreen(offsetX, offsetY, origin).toString();

        function toggleCell(cell, cells) {
            if (cells.has(cell)) {
                cells.delete(cell);
            } else {
                cells.add(cell);
            }
        }

        toggleCell(cell, cells);
        render(canvas, cells, origin);
    });

    render(canvas, cells, origin);
}
