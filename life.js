/** @type {Array.<number>} Cell */

/**
 * Removes duplicates from an array of cells, returning a new array.
 * @param {Array.<Cell>} cells
 * @returns {Array.<Cell>}
 */
function uniquify(cells) {
    const result = [];

    for (const cell of cells) {
        if (!contains(cell, result)) {
            result.push(cell);
        }
    }

    return result;
}

/**
 * Returns `true` if `cellA` and `cellB` are the same, else `false`.
 * @param {Cell} cellA
 * @param {Cell} cellB
 * @returns {boolean}
 */
export function equals(cellA, cellB) {
    return cellA[0] === cellB[0] && cellA[1] === cellB[1];
}

/**
 * Returns `true` if `targetCell` appears in `cells`, else `false`.
 * @param {Cell} targetCell
 * @param {Array.<Cell>} cells
 * @returns {boolean}
 */
function contains(targetCell, cells) {
    return cells.find((cell) => equals(targetCell, cell)) !== undefined;
}

/**
 * Returns the array of 8 cells which immediately surround the target
 * cell.
 * @param {Cell} targetCell
 * @returns {Array.<Cell>}
 */
function neighbours(targetCell) {
    const [x, y] = targetCell;
    return [
        [x + 1, y],
        [x + 1, y + 1],
        [x, y + 1],
        [x - 1, y + 1],
        [x - 1, y],
        [x - 1, y - 1],
        [x, y - 1],
        [x + 1, y - 1],
    ];
}

/**
 * Checks immediate neighbours of a cell and returns an array of live and dead
 * neighbours.
 * @param {Cell} cell
 * @param {Array.<Cell>} cells
 * @returns {Array.<Array.<Cell>>}
 */
function analyseNeighbours(cell, cells) {
    const liveNeighbours = [];
    const deadNeighbours = [];

    for (const neighbour of neighbours(cell)) {
        if (contains(neighbour, cells)) {
            liveNeighbours.push(neighbour);
        } else {
            deadNeighbours.push(neighbour);
        }
    }

    return [liveNeighbours, deadNeighbours];
}

/**
 * Calculates the next state of a given set of cells according to the
 * rules of the game and returns that new state.
 * @param {Array.<Cell>} cells
 * @returns {Array.<Cell>}
 */
export function next(cells) {
    const result = [];
    const potentialResurrectees = [];

    for (const cell of cells) {
        const [liveNeighbours, deadNeighbours] = analyseNeighbours(cell, cells);

        if (liveNeighbours.length === 2 || liveNeighbours.length === 3) {
            result.push(cell);
        }

        potentialResurrectees.push(...deadNeighbours);
    }

    for (const cell of uniquify(potentialResurrectees)) {
        const occurrences = potentialResurrectees.filter((e) => {
            return equals(e, cell);
        });

        if (occurrences.length === 3) {
            result.push(cell);
        }
    }

    return result;
}
