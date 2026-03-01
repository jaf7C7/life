const RED = '#ff0000';
const WHITE = '#ffffff';
const BLACK = '#000000';

/**
 * Calculates the offset of the grid to ensure that the centre of the middle
 * cell always aligns with the centre of the grid. The offset is such that a
 * margin of approximately 1 cell is drawn outside the boundary of the grid to
 * avoid any blank space showing when resizing the grid element.
 *
 * @param {Number} width - Width of the grid.
 * @param {Number} height - Height of the grid.
 * @param {Number} cellSize - Effective (including borders) cell size.
 * @returns {Number[]} Offset - A tuple of x and y offset values.
 */
function getOffset(grid) {
    // The calculation explained:
    //
    // `(e / 2) % grid.cellSize`
    //     Offsets the cells so top left corner of a grid cell aligns with
    //     the central point of the grid element.
    //
    // `- grid.cellSize / 2`
    //     Offsets that point up and left by half a cell, so the midpoint
    //     of the cell aligns with the centre of the grid.
    //
    // `- grid.cellSize`
    //     Offsets that point further up and left by a whole cell so cells
    //     are drawn outside the boundary of the grid element, which prevents
    //     blank spaces being visible if the grid is being resized.
    return [grid.width, grid.height].map(
        (e) => ((e / 2) % grid.cellSize) - grid.cellSize / 2 - grid.cellSize,
    );
}

/**
 * Rounds `number` down to the nearest multiple of `baseNumber`.
 *
 * @param {Number} baseNumber
 * @param {Number} number
 * @returns {Number}
 */
function floorToMultiple(baseNumber, number) {
    return Math.floor(number / baseNumber) * baseNumber;
}

function getClickedCellLocation(clickEvent) {
    const { cellSize, lineWidth } = clickEvent.currentTarget;
    const effectiveCellSize = cellSize + lineWidth;
    const [offsetX, offsetY] = getOffset(clickEvent.currentTarget);
    return [
        offsetX +
            floorToMultiple(effectiveCellSize, clickEvent.offsetX - offsetX),
        offsetY +
            floorToMultiple(effectiveCellSize, clickEvent.offsetY - offsetY),
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
            const [x, y] = getClickedCellLocation(e);
            const ctx = e.currentTarget.getContext('2d');
            ctx.fillStyle = ctx.fillStyle === RED ? WHITE : RED;
            ctx.fillRect(
                x,
                y,
                e.currentTarget.cellSize,
                e.currentTarget.cellSize,
            );
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
