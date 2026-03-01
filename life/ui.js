const RED = '#ff0000';
const WHITE = '#ffffff';
const BLACK = '#000000';

/**
 * Calculates the offset of the grid to ensure that the centre of the middle
 * cell always aligns with the centre of the grid. The offset is such that a
 * margin of 1 cell is drawn outside the boundary of the grid to avoid any blank
 * space showing when resizing the grid element.
 *
 * @param {Number} width - Width of the grid.
 * @param {Number} height - Height of the grid.
 * @param {Number} cellSize - Effective (including borders) cell size.
 * @returns {Number[]} Offset - A tuple of x and y offset values.
 */
function getOffset(grid) {
    return [grid.width, grid.height].map(
        (e) => ((e / 2) % grid.cellSize) - grid.cellSize * (3 / 2),
    );
}

function getClickOffset(clickEvent) {
    const { cellSize, lineWidth } = clickEvent.currentTarget;
    const effectiveCellSize = cellSize + lineWidth;
    const [offsetX, offsetY] = getOffset(clickEvent.currentTarget);
    return [
        offsetX +
            Math.floor((clickEvent.offsetX - offsetX) / effectiveCellSize) *
                effectiveCellSize,
        offsetY +
            Math.floor((clickEvent.offsetY - offsetY) / effectiveCellSize) *
                effectiveCellSize,
    ];
}

export default class UI {
    setTitle(title) {
        document.title = title;
    }

    createHeading(textContent) {
        let title = document.createElement('h1');
        title.setAttribute('data-testid', 'title');
        title.textContent = textContent;
        document.body.appendChild(title);
    }

    createGrid() {
        let grid = document.createElement('canvas');
        grid.setAttribute('data-testid', 'grid');
        document.body.appendChild(grid);

        this.drawGrid(grid);

        grid.addEventListener('click', (e) => {
            const { cellSize } = e.currentTarget;
            const ctx = e.currentTarget.getContext('2d');
            const currentColor = ctx.fillStyle;
            ctx.fillStyle = currentColor === RED ? WHITE : RED;
            const [x, y] = getClickOffset(e);
            ctx.fillRect(x, y, cellSize, cellSize);
        });

        const resizeObserver = new ResizeObserver((entries) => {
            this.drawGrid(entries[0].target);
        });

        resizeObserver.observe(grid);
    }

    drawGrid(grid) {
        grid.cellSize = 20;
        grid.lineWidth = 2;

        // Fix drawing resolution equal to screen resolution to make calculations simpler.
        grid.width = grid.clientWidth;
        grid.height = grid.clientHeight;

        const ctx = grid.getContext('2d');
        ctx.fillStyle = BLACK;
        ctx.fillRect(0, 0, grid.width, grid.height);

        const effectiveCellSize = grid.cellSize + grid.lineWidth;
        ctx.fillStyle = WHITE;

        const [offsetX, offsetY] = getOffset(grid);

        for (let y = offsetY; y < grid.height; y += effectiveCellSize) {
            for (let x = offsetX; x < grid.width; x += effectiveCellSize) {
                ctx.fillRect(x, y, grid.cellSize, grid.cellSize);
            }
        }
    }

    createElement() {}
}
