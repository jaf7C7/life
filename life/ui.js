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
function getOffset(width, height, cellSize) {
    return [width, height].map(
        (e) => ((e / 2) % cellSize) - cellSize * (3 / 2),
    );
}

function getClickOffset(offsetX, offsetY, e, effectiveCellSize) {
    return [
        offsetX +
            Math.floor((e.offsetX - offsetX) / effectiveCellSize) *
                effectiveCellSize,
        offsetY +
            Math.floor((e.offsetY - offsetY) / effectiveCellSize) *
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
            const { width, height, cellSize, lineWidth } = e.currentTarget;
            const effectiveCellSize = cellSize + lineWidth;
            const ctx = e.currentTarget.getContext('2d');
            const currentColor = ctx.fillStyle;
            ctx.fillStyle = currentColor === RED ? WHITE : RED;
            const [offsetX, offsetY] = getOffset(
                width,
                height,
                cellSize + lineWidth,
            );
            const [x, y] = getClickOffset(
                offsetX,
                offsetY,
                e,
                effectiveCellSize,
            );
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

        const [offsetX, offsetY] = getOffset(
            grid.width,
            grid.height,
            effectiveCellSize,
        );

        for (let y = offsetY; y < grid.height; y += effectiveCellSize) {
            for (let x = offsetX; x < grid.width; x += effectiveCellSize) {
                ctx.fillRect(x, y, grid.cellSize, grid.cellSize);
            }
        }
    }

    createElement() {}
}
