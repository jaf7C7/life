import { Cell } from './cell.js';

const step = Cell.size + Cell.borderWidth;

function renderDeadCells(ctx, x0, y0, canvas) {
    const minX = Math.floor(-x0 / step);
    const maxX = Math.floor((canvas.width - x0) / step);
    const minY = Math.floor(-(canvas.height - y0) / step);
    const maxY = Math.ceil(y0 / step);

    ctx.fillStyle = Cell.deadColor;
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            ctx.fillRect(
                x0 + x * step + Cell.borderWidth / 2,
                y0 - y * step + Cell.borderWidth / 2,
                Cell.size,
                Cell.size
            );
        }
    }
}

function renderLiveCells(ctx, x0, y0, cells) {
    ctx.fillStyle = Cell.aliveColor;
    for (const cell of [...cells].map(Cell.fromString)) {
        ctx.fillRect(
            x0 + cell.x * step + Cell.borderWidth / 2,
            y0 - cell.y * step + Cell.borderWidth / 2,
            Cell.size,
            Cell.size
        );
    }
}

function render(canvas, cells) {
    const ctx = canvas.getContext('2d');
    const x0 = canvas.width / 2 - step / 2;
    const y0 = canvas.height / 2 - step / 2;

    ctx.fillStyle = Cell.borderColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    renderDeadCells(ctx, x0, y0, canvas);
    renderLiveCells(ctx, x0, y0, cells);
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
