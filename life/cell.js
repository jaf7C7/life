/**
 * A single cell's position in the grid.
 *
 * @property {number} x
 * @property {number} y
 */
export class Cell {
    /**
     * @param {number} x
     * @param {number} y
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Returns the cell's `x,y` co-ords as a string, e.g. `"1,-2"`.
     *
     * @returns {string}
     */
    toString() {
        return `${this.x},${this.y}`;
    }

    /**
     * Constructs a Cell from a string in the format produced by `toString`.
     *
     * @param {string} str
     * @returns {Cell}
     */
    static fromString(str) {
        const [x, y] = str.split(',').map(Number);
        return new Cell(x, y);
    }
}
