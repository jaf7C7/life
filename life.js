/** @type {Array<number>} Cell */

/**
 * Returns `true` if `cellA` and `cellB` are the same, else `false`.
 * @param {Cell} cellA
 * @param {Cell} cellB
 * @returns {boolean}
 */
function cellsAreEqual(cellA, cellB) {
    return cellA[0] === cellB[0] && cellA[1] === cellB[1];
}

/**
 * Returns `true` if `targetCell` appears in `cells`, else `false`.
 * @param {Cell} targetCell
 * @param {Array<Cell>} cells
 * @returns {boolean}
 */
function cellIsAlive(targetCell, cells) {
    return cells.find((cell) => cellsAreEqual(targetCell, cell)) !== undefined;
}

/**
 * Returns the array of 8 cells which immediately surround the target
 * cell.
 * @param {Cell} targetCell
 * @returns {Array<Cell>}
 */
function getNeighbours(targetCell) {
    const [x, y] = targetCell;
    const neighbours = [
        [x + 1, y],
        [x + 1, y + 1],
        [x, y + 1],
        [x - 1, y + 1],
        [x - 1, y],
        [x - 1, y - 1],
        [x, y - 1],
        [x + 1, y - 1],
    ];

    return neighbours;
}

/**
 * Calculates the next state of a given set of cells according to the
 * rules of the game and returns that new state.
 * @param {Array<Cell>} cells
 * @returns {Array<Cell>}
 */
export function next(cells) {
    const neighbours = getNeighbours([0, 0]);
    const liveNeighbours = neighbours.filter((neighbour) =>
        cellIsAlive(neighbour, cells),
    );

    return liveNeighbours.length == 2 ? cells : [];
}
