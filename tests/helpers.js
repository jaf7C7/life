/**
 * Grabs a cell-sized chunk of image data from the canvas at the co-ordinates
 * where the specified cell should be, and checks it pixel by pixel. Returns
 * true if the cell is rendered correctly at the given position on the canvas,
 * false if not.
 *
 * @param {Object} cell
 * @param {Number} cell.x
 * @param {Number} cell.y
 * @returns {Boolean}
 */
export function cellIsRendered({ x, y }) {
    const cellBorderWidth = 2;
    const cellSize = 20;
    const canvas = document.querySelector('canvas');
    const { width: canvasWidth, height: canvasHeight } =
        canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    // The cell co-ords have their origin at the centre of the canvas, and y
    // increases in the upwards direction, whereas the canvas drawing co-ords
    // have their origin at the top left corner of the canvas, and y increases
    // in the downwards direction.
    const x0 =
        canvasWidth / 2 -
        (cellSize + cellBorderWidth) / 2 +
        x * (cellSize + cellBorderWidth);
    const y0 =
        canvasHeight / 2 -
        (cellSize + cellBorderWidth) / 2 -
        y * (cellSize + cellBorderWidth);

    /**
     * Returns true if the pixel is at the edge of the cell, x and y
     * co-ordinates are relative to the top-left corner of the cell.
     *
     * @param {Number} x
     * @param {Number} y
     * @returns {Boolean}
     */
    function isBorderPixel(x, y) {
        return [x, y].some(
            (e) => e === 0 || e === cellSize + cellBorderWidth / 2
        );
    }

    /**
     * Returns true if the given pixel color data represents opaque black, else
     * false.
     *
     * @param {Number[]} pixelData
     * @returns {Boolean}
     */
    function isBlack([r, g, b, a]) {
        return [r, g, b].every((e) => e === 0) && a === 255;
    }

    /**
     * Returns true if the given pixel color data represents opaque white, else
     * false.
     *
     * @param {Number[]} pixelData
     * @returns {Boolean}
     */
    function isWhite([r, g, b, a]) {
        return [r, g, b].every((e) => e === 255) && a === 255;
    }

    /**
     * Checks the given pixel and returns a boolean indicating whether it is the
     * correct color given its position. Border pixels should be black, and
     * other pixels should be white. The co-ordinates are relative to the
     * top-left corner of the cell.
     *
     * @param {Number} x
     * @param {Number} y
     */
    function pixelOK(x, y) {
        const pixelColor = ctx.getImageData(x0 + x, y0 + y, 1, 1).data;
        return isBorderPixel(x, y) ? isBlack(pixelColor) : isWhite(pixelColor);
    }

    let cellOK = false;

    for (let x = 0; x < cellSize + cellBorderWidth; x++) {
        for (let y = 0; y < cellSize + cellBorderWidth; y++) {
            cellOK = pixelOK(x, y);
            if (!cellOK) {
                break;
            }
        }
    }

    return cellOK;
}
