const cellSize = 20;
const cellBorderWidth = 2;

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
        const key = `${cellX},${cellY}`;
        if (cells.has(key)) {
            cells.delete(key);
        } else {
            cells.add(key);
        }
    });
}
