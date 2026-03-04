const CELL_ACTIVE_COLOR = '#ff0000';
const CELL_INACTIVE_COLOR = '#ffffff';
const GRID_BG_COLOR = '#000000';

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

/** Encapsulates all the browser-specific code for rendering the user-interface. */
export default class UI {
    /** Sets the document title. */
    setTitle(title) {
        document.title = title;
    }

    /** Creates a level 1 heading. */
    createHeading(textContent) {
        this.createElement({ type: 'h1', 'data-testid': 'title', textContent });
    }

    /** Creates the game grid and adds the required event listeners. */
    createGrid() {
        const handleResize = this._makeResizeHandler();
        const grid = this.createElement({
            type: 'canvas',
            'data-testid': 'grid',
            /**
             * A click event handler which toggles the colour of the clicked
             * cell.
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
                    this,
                    clickEvent.offsetX,
                    clickEvent.offsetY,
                );
                ctx.fillRect(x, y, this.cellSize, this.cellSize);
            },
            handleResize,
        });
        drawGrid(grid);
    }

    /**
     * Creates a resize event handler for a given UI object.
     *
     * @returns {Function} - The resize event handler.
     */
    _makeResizeHandler() {
        return (entries) => {
            const grid = entries[0].target;
            return drawGrid(grid);
        };
    }

    /**
     * Does the actual DOM manipulation work of creating an element and setting
     * event handlers, attributes and properties.
     *
     * @param {Object} element - A specification object for the element to be
     *   created.
     * @returns {HTMLElement} - The HTML element as returned by
     *   `document.createElement`.
     */
    createElement(element) {
        const e = document.createElement(element.type);
        e.setAttribute('data-testid', element['data-testid']);
        e.textContent = element.textContent;

        if (element.handleClick) {
            e.addEventListener('click', element.handleClick);
        }

        if (element.handleResize) {
            const resizeObserver = new ResizeObserver(element.handleResize);
            resizeObserver.observe(e);
        }

        document.body.appendChild(e);

        return e;
    }
}
