import { Cell } from './cell.js';

export const cellSize = 20;
export const cellBorderWidth = 2;
const step = cellSize + cellBorderWidth;

function render(canvas, cells) {
    const ctx = canvas.getContext('2d');
    const x0 = canvas.width / 2 - step / 2;
    const y0 = canvas.height / 2 - step / 2;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const minX = Math.floor(-x0 / step);
    const maxX = Math.floor((canvas.width - x0) / step);
    const minY = Math.floor(-(canvas.height - y0) / step);
    const maxY = Math.ceil(y0 / step);

    ctx.fillStyle = '#fff';
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            ctx.fillRect(
                x0 + x * step + cellBorderWidth / 2,
                y0 - y * step + cellBorderWidth / 2,
                cellSize,
                cellSize
            );
        }
    }

    ctx.fillStyle = '#f00';
    for (const cell of [...cells].map(Cell.fromString)) {
        ctx.fillRect(
            x0 + cell.x * step + cellBorderWidth / 2,
            y0 - cell.y * step + cellBorderWidth / 2,
            cellSize,
            cellSize
        );
    }
}

export function initApp(ui, cells) {
    const canvas = ui.createElement('canvas');

    let panX = 0,
        panY = 0;
    let dragStart = null;

    canvas.addEventListener('mousedown', (e) => {
        dragStart = { x: e.offsetX, y: e.offsetY };
    });
    canvas.addEventListener('mousemove', (e) => {
        if (dragStart) {
            panX += e.offsetX - dragStart.x;
            panY += e.offsetY - dragStart.y;
            dragStart = { x: e.offsetX, y: e.offsetY };
        }
    });
    canvas.addEventListener('mouseup', () => {
        dragStart = null;
    });

    canvas.addEventListener('click', (event) => {
        const cellX = Math.floor(
            (event.offsetX - (canvas.width / 2 - step / 2) - panX) / step
        );
        const cellY = -Math.floor(
            (event.offsetY - (canvas.height / 2 - step / 2) - panY) / step
        );
        const cell = `${cellX},${cellY}`;
        if (cells.has(cell)) {
            cells.delete(cell);
        } else {
            cells.add(cell);
        }
        render(canvas, cells);
    });

    render(canvas, cells);
}
