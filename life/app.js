import { Cell } from './cell.js';

function cellToScreenX(originX, x) {
    return originX + x * Cell.step + Cell.borderWidth / 2;
}

function cellToScreenY(originY, y) {
    return originY - y * Cell.step + Cell.borderWidth / 2;
}

function renderCell(ctx, origin, cell, color) {
    ctx.fillStyle = color;
    ctx.fillRect(
        cellToScreenX(origin.x, cell.x),
        cellToScreenY(origin.y, cell.y),
        Cell.size,
        Cell.size
    );
}

function render(canvas, cells, origin) {
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = Cell.borderColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const minX = Math.floor(-origin.x / Cell.step);
    const maxX = Math.floor((canvas.width - origin.x) / Cell.step);
    const minY = Math.floor(-(canvas.height - origin.y) / Cell.step);
    const maxY = Math.ceil(origin.y / Cell.step);

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const cell = new Cell(x, y);
            renderCell(ctx, origin, cell, Cell.deadColor, origin.x, origin.y);
        }
    }

    for (const cell of [...cells].map(Cell.fromString)) {
        renderCell(ctx, origin, cell, Cell.aliveColor, origin.x, origin.y);
    }
}

export function initApp(ui, cells) {
    const canvas = ui.createElement('canvas');
    const origin = {
        x: canvas.width / 2 - Cell.step / 2,
        y: canvas.height / 2 - Cell.step / 2
    };

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
            (event.offsetX - (origin.x + panX)) / Cell.step
        );
        const cellY = -Math.floor(
            (event.offsetY - (origin.y + panY)) / Cell.step
        );
        const cell = new Cell(cellX, cellY).toString();
        if (cells.has(cell)) {
            cells.delete(cell);
        } else {
            cells.add(cell);
        }
        render(canvas, cells, origin);
    });

    render(canvas, cells, origin);
}
