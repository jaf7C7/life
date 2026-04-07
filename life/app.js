import { Cell } from './cell.js';

function cellToScreenX(x0, x) {
    return x0 + x * Cell.step + Cell.borderWidth / 2;
}

function cellToScreenY(y0, y) {
    return y0 - y * Cell.step + Cell.borderWidth / 2;
}

function renderCell(ctx, x0, y0, cell, alive) {
    ctx.fillStyle = alive ? Cell.aliveColor : Cell.deadColor;
    ctx.fillRect(
        cellToScreenX(x0, cell.x),
        cellToScreenY(y0, cell.y),
        Cell.size,
        Cell.size
    );
}

function renderDeadCells(canvas, ctx, x0, y0) {
    const minX = Math.floor(-x0 / Cell.step);
    const maxX = Math.floor((canvas.width - x0) / Cell.step);
    const minY = Math.floor(-(canvas.height - y0) / Cell.step);
    const maxY = Math.ceil(y0 / Cell.step);

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const cell = new Cell(x, y);
            renderCell(ctx, x0, y0, cell, false);
        }
    }
}

function renderLiveCells(ctx, x0, y0, cells) {
    for (const cell of [...cells].map(Cell.fromString)) {
        renderCell(ctx, x0, y0, cell, true);
    }
}

function render(canvas, cells) {
    const ctx = canvas.getContext('2d');
    const x0 = canvas.width / 2 - Cell.step / 2;
    const y0 = canvas.height / 2 - Cell.step / 2;

    ctx.fillStyle = Cell.borderColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    renderDeadCells(canvas, ctx, x0, y0);
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
            (event.offsetX - (canvas.width / 2 - Cell.step / 2) - panX) /
                Cell.step
        );
        const cellY = -Math.floor(
            (event.offsetY - (canvas.height / 2 - Cell.step / 2) - panY) /
                Cell.step
        );
        const cell = new Cell(cellX, cellY).toString();
        if (cells.has(cell)) {
            cells.delete(cell);
        } else {
            cells.add(cell);
        }
        render(canvas, cells);
    });

    render(canvas, cells);
}
