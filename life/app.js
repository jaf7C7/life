import { Cell } from './cell.js';

function cellToScreenX(originX, x) {
    return originX + x * Cell.step + Cell.borderWidth / 2;
}

function cellToScreenY(originY, y) {
    return originY - y * Cell.step + Cell.borderWidth / 2;
}

function renderCell(ctx, { originX, originY }, cell, alive) {
    ctx.fillStyle = alive ? Cell.aliveColor : Cell.deadColor;
    ctx.fillRect(
        cellToScreenX(originX, cell.x),
        cellToScreenY(originY, cell.y),
        Cell.size,
        Cell.size
    );
}

function render(canvas, cells) {
    const ctx = canvas.getContext('2d');
    const originX = canvas.width / 2 - Cell.step / 2;
    const originY = canvas.height / 2 - Cell.step / 2;

    ctx.fillStyle = Cell.borderColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const minX = Math.floor(-originX / Cell.step);
    const maxX = Math.floor((canvas.width - originX) / Cell.step);
    const minY = Math.floor(-(canvas.height - originY) / Cell.step);
    const maxY = Math.ceil(originY / Cell.step);

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const cell = new Cell(x, y);
            const origin = { originX, originY };
            renderCell(ctx, origin, cell, false);
        }
    }

    for (const cell of [...cells].map(Cell.fromString)) {
        const origin = { originX, originY };
        renderCell(ctx, origin, cell, true);
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
