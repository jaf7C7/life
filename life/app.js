import { Cell } from './cell.js';

function cellToScreen(originX, originY, x, y) {
    const posX = originX + x * Cell.step + Cell.borderWidth / 2;
    const posY = originY - y * Cell.step + Cell.borderWidth / 2;

    return [posX, posY];
}

function renderCell(ctx, originX, originY, cell, color) {
    ctx.fillStyle = color;
    const [posX, posY] = cellToScreen(originX, originY, cell.x, cell.y);
    ctx.fillRect(posX, posY, Cell.size, Cell.size);
}

function render(canvas, originX, originY, cells) {
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = Cell.borderColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const minX = Math.floor(-originX / Cell.step);
    const maxX = Math.floor((canvas.width - originX) / Cell.step);
    const minY = Math.floor(-(canvas.height - originY) / Cell.step);
    const maxY = Math.ceil(originY / Cell.step);

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const cell = new Cell(x, y);
            renderCell(ctx, originX, originY, cell, Cell.deadColor);
        }
    }

    for (const cell of [...cells].map(Cell.fromString)) {
        renderCell(ctx, originX, originY, cell, Cell.aliveColor);
    }
}

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

        render(canvas, originX, originY, cells);
    };
}

export function initApp(ui, cells) {
    const canvas = ui.createElement('canvas');
    const originX = canvas.width / 2 - Cell.step / 2;
    const originY = canvas.height / 2 - Cell.step / 2;
    const handleClick = createClickHandler(ui, canvas, originX, originY, cells);

    canvas.addEventListener('click', handleClick);

    render(canvas, originX, originY, cells);
}
