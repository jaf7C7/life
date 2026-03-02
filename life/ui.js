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
    //    Offsets the grid up and left by another whole cell, to avoid
    //    blank space showing at certain sizes.
    //
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
    const grid = clickEvent.currentTarget;
    const effectiveCellSize = grid.cellSize + grid.lineWidth;
    const [offsetX, offsetY] = getOffset(grid);
    return [
        offsetX +
            floorToMultiple(effectiveCellSize, clickEvent.offsetX - offsetX),
        offsetY +
            floorToMultiple(effectiveCellSize, clickEvent.offsetY - offsetY),
    ];
}

/**
 * Takes an RGB color and converts it to a hexcode.
 *
 * @param {Number[]} rgb - An RGB color in the form [r, g, b]
 * @returns {String} - A hexcode in the form #abcdef
 */
function rgb2hex(rgb) {
    return `#${rgb.map((e) => e.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Returns the color of the pixel at the given point. Co-ordinates are relative
 * to the top left corner of the canvas element.
 *
 * @param {Number} x
 * @param {Number} y
 * @returns {String}
 */
function colorAtPoint(x, y) {
    const grid = document.querySelector('canvas');
    const [r, g, b] = grid.getContext('2d').getImageData(x, y, 1, 1).data;
    return rgb2hex([r, g, b]);
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
            ctx.fillStyle =
                colorAtPoint(e.offsetX, e.offsetY) === RED ? WHITE : RED;
            ctx.fillRect(
                x,
                y,
                e.currentTarget.cellSize,
                e.currentTarget.cellSize,
            );
        });

        const resizeObserver = new ResizeObserver((entries) => {
            const grid = entries[0].target;
            this.drawGrid(grid);
        });

        resizeObserver.observe(grid);
    }

    drawGrid(grid) {
        grid.cellSize = 20;
        grid.lineWidth = 2;

        // Fix drawing resolution equal to display resolution to make
        // calculations simpler.
        grid.width = grid.clientWidth;
        grid.height = grid.clientHeight;

        const ctx = grid.getContext('2d');
        ctx.fillStyle = BLACK;
        ctx.fillRect(0, 0, grid.width, grid.height);

        const [offsetX, offsetY] = getOffset(grid);
        const effectiveCellSize = grid.cellSize + grid.lineWidth;

        // `+ 2` because the offset will cause the edge of the grid to
        // become visible, so we just paint an couple of extra rows and
        // columns to plug the visual gap.
        const gridCellWidth = grid.width / effectiveCellSize + 2;
        const gridCellHeight = grid.height / effectiveCellSize + 2;

        ctx.fillStyle = WHITE;

        for (let y = 0; y < gridCellHeight; y++) {
            for (let x = 0; x < gridCellWidth; x++) {
                ctx.fillRect(
                    offsetX + x * effectiveCellSize,
                    offsetY + y * effectiveCellSize,
                    grid.cellSize,
                    grid.cellSize,
                );
            }
        }
    }

    createElement() {}
}
