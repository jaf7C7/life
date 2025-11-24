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
 * Removes `targetCell` from `cells` and returns the new state of `cells`.
 * @param {Cell} targetCell
 * @param {Array<Cell>} cells
 * @returns {Array<Cell>}
 */
function killCell(targetCell, cells) {
    return cells.filter((cell) => !cellsAreEqual(cell, targetCell));
}

/**
 * Calculates the next state of a given set of cells according to the
 * rules of the game and returns that new state.
 * @param {Array<Cell>} cells
 * @returns {Array<Cell>}
 */
export function next(cells) {
    let newCells = [...cells];
    const counter = [];

    for (let cell of newCells) {
        const liveNeighbours = getNeighbours(cell).filter((neighbour) => {
            return cellIsAlive(neighbour, newCells);
        });

        if (liveNeighbours.length < 2 || liveNeighbours.length > 3) {
            newCells = killCell(cell, newCells);
        }

        const deadNeighbours = getNeighbours(cell).filter((neighbour) => {
            return !cellIsAlive(neighbour, newCells);
        });

        deadNeighbours.forEach((neighbour) => {
            counter.push(neighbour);
        });
    }

    if (counter.filter((e) => cellsAreEqual(e, [0, 0])).length === 3) {
        newCells.push([0, 0]);
    }

    return newCells;
}
