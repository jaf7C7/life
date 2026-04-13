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
            renderCell(ctx, origin, cell, Cell.deadColor);
        }
    }

    for (const cell of [...cells].map(Cell.fromString)) {
        renderCell(ctx, origin, cell, Cell.aliveColor);
    }
}

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

        if (cells.has(cell)) {
            cells.delete(cell);
        } else {
            cells.add(cell);
        }

        render(canvas, cells, origin);
    });

    render(canvas, cells, origin);
}
