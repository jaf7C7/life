export const cellSize = 20;
export const cellBorderWidth = 2;

function render(canvas, cells) {
    const ctx = canvas.getContext('2d');
    const step = cellSize + cellBorderWidth;
    const x0 = canvas.width / 2 - step / 2;
    const y0 = canvas.height / 2 - step / 2;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    for (const cell of cells) {
        const [cellX, cellY] = cell.split(',').map(Number);
        ctx.fillRect(
            x0 + cellX * step + cellBorderWidth / 2,
            y0 - cellY * step + cellBorderWidth / 2,
            cellSize,
            cellSize
        );
    }
}

export function initApp(ui, cells) {
    const canvas = ui.createElement('canvas');
    const step = cellSize + cellBorderWidth;

    canvas.addEventListener('click', (event) => {
        const cellX = Math.floor(
            (event.offsetX - (canvas.width / 2 - step / 2)) / step
        );
        const cellY = -Math.floor(
            (event.offsetY - (canvas.height / 2 - step / 2)) / step
        );
        cells.add(`${cellX},${cellY}`);
        render(canvas, cells);
    });

    render(canvas, cells);
}
