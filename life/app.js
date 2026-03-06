const CELL_ACTIVE_COLOR = '#ff0000';
const CELL_INACTIVE_COLOR = '#ffffff';
const GRID_BG_COLOR = '#000000';

/** Creates a level 1 heading. */
function createHeading(ui, textContent) {
    ui.createElement({ type: 'h1', 'data-testid': 'title', textContent });
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

/**
 * Returns the offset of the top-left corner of the clicked cell relative to the
 * top-left corner of the top-left cell in the grid.
 *
 * @param {PointerEvent} clickEvent
 * @returns {Number[]}
 */
function getClickedCellOffset(grid, offsetX, offsetY) {
    const effectiveCellSize = grid.cellSize + grid.lineWidth;
    const [x0, y0] = getOffset(grid);
    return [
        x0 + floorToMultiple(effectiveCellSize, offsetX - x0),
        y0 + floorToMultiple(effectiveCellSize, offsetY - y0),
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

/**
 * Calculates the offset of the grid to ensure that the centre of the middle
 * cell always aligns with the centre of the grid.
 *
 * @param {Object} grid
 * @returns {Number[]}
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
 * Draws the grid.
 *
 * @param {HTMLElement} grid
 */
function drawGrid(grid) {
    grid.cellSize = 20;
    grid.lineWidth = 2;

    // Fix drawing resolution equal to display resolution to make
    // calculations simpler.
    grid.width = grid.clientWidth;
    grid.height = grid.clientHeight;

    const ctx = grid.getContext('2d');
    ctx.fillStyle = GRID_BG_COLOR;
    ctx.fillRect(0, 0, grid.width, grid.height);

    const [offsetX, offsetY] = getOffset(grid);
    const effectiveCellSize = grid.cellSize + grid.lineWidth;

    // The offset will cause the edge of the grid to become visible,
    // so the padding serves to plug the visual gap.
    const gridPadding = 2;
    const gridCellWidth = grid.width / effectiveCellSize + gridPadding;
    const gridCellHeight = grid.height / effectiveCellSize + gridPadding;

    ctx.fillStyle = CELL_INACTIVE_COLOR;

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

/** Creates the game grid and adds the required event listeners. */
function createGrid(ui) {
    const grid = ui.createElement({
        type: 'canvas',
        'data-testid': 'grid',

        getContext() {
            return {
                fillRect() {},
            };
        },

        /**
         * A click event handler which toggles the colour of the clicked cell.
         *
         * @param {PointerEvent} - The mouse click event.
         */
        handleClick(clickEvent) {
            const ctx = this.getContext('2d');
            ctx.fillStyle =
                colorAtPoint(clickEvent.offsetX, clickEvent.offsetY) ===
                CELL_ACTIVE_COLOR
                    ? CELL_INACTIVE_COLOR
                    : CELL_ACTIVE_COLOR;
            const [x, y] = getClickedCellOffset(
                clickEvent.currentTarget,
                clickEvent.offsetX,
                clickEvent.offsetY,
            );
            ctx.fillRect(
                x,
                y,
                clickEvent.currentTarget.cellSize,
                clickEvent.currentTarget.cellSize,
            );
        },

        handleResize(entries) {
            drawGrid(entries[0].target);
        },
    });
    drawGrid(grid);
}

export default function createApp(ui, game) {
    ui.setTitle('Life');
    createHeading(ui, 'Life');
    createGrid(ui);

    ui.createElement({
        id: 'grid',
        height: 100,
        width: 100,
        cellSize: 20,
        offset: { x: 0, y: 0 },

        click(x, y) {
            const [cellX, cellY] = [
                Math.floor(
                    (x - this.offset.x - this.width / 2) / this.cellSize,
                ),
                Math.floor(
                    (y - this.offset.y - this.height / 2) / this.cellSize,
                ),
            ];
            game.toggleCell(cellX, cellY);
        },

        clickAndDrag(mouseDownPos, mouseUpPos) {
            this.offset = {
                x: mouseUpPos.x - mouseDownPos.x,
                y: mouseUpPos.y - mouseDownPos.y,
            };
        },

        pinch(startTouches, endTouches) {
            const separation = (touches) => {
                const dx = touches[1].x - touches[0].x;
                const dy = touches[1].y - touches[0].y;

                return Math.sqrt(dx ** 2 + dy ** 2);
            };

            const scale = separation(endTouches) / separation(startTouches);

            this.cellSize *= scale;
        },
    });

    ui.createElement({
        id: 'stop',

        click() {
            game.stop();
        },
    });

    ui.createElement({
        id: 'play',

        click() {
            // XXX: This will not work in production.
            const dummyScheduledTask = { cancel: () => undefined };
            const dummyScheduler = () => dummyScheduledTask;
            game.play(dummyScheduler);
        },
    });
}
