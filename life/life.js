/** @typedef {[number, number]} Cell */

/**
 * @typedef {Object} ScheduledTask
 * @property {function(): void} cancel - Cancels execution of the scheduled task
 */

/**
 * @callback SchedulerFunction
 * @param {function(): void} callback - The function to repeatedly execute
 * @returns {ScheduledTask}
 */

/**
 * Removes duplicates from an array of cells, returning a new array.
 *
 * @param {Cell[]} cells
 * @returns {Cell[]}
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
 * Returns `true` if `cell` and `otherCell` are the same, else `false`.
 *
 * @param {Cell} cell
 * @param {Cell} otherCell
 * @returns {boolean}
 */
function equals(cell, otherCell) {
    return cell[0] === otherCell[0] && cell[1] === otherCell[1];
}

/**
 * Returns `true` if `targetCell` appears in `cells`, else `false`.
 *
 * @param {Cell} targetCell
 * @param {Cell[]} cells
 * @returns {boolean}
 */
function contains(targetCell, cells) {
    return cells.find((cell) => equals(targetCell, cell)) !== undefined;
}

/**
 * Returns the array of 8 cells which immediately surround the target cell.
 *
 * @param {Cell} cell
 * @returns {Cell[]}
 */
function neighbours(cell) {
    const [x, y] = cell;
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
 * Checks immediate neighbours of a cell and returns a tuple containing arrays
 * of all live and dead neighbours.
 *
 * @param {Cell} targetCell
 * @param {Cell[]} cells
 * @returns {Cell[][]}
 */
function analyseNeighbours(targetCell, cells) {
    const liveNeighbours = [];
    const deadNeighbours = [];

    for (const neighbour of neighbours(targetCell)) {
        if (contains(neighbour, cells)) {
            liveNeighbours.push(neighbour);
        } else {
            deadNeighbours.push(neighbour);
        }
    }

    return [liveNeighbours, deadNeighbours];
}

/**
 * Calculates the next state of a given set of cells according to the rules of
 * the game and returns that new state.
 *
 * @param {Cell[]} cells
 * @returns {Cell[]}
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

/** Class representing the state of the game. */
export class Life {
    /** Create a new instance of `Life`. */
    constructor() {
        this._cells = [];
        this._gameLoop = null;
    }

    /**
     * Getter which returns the array of live cells.
     *
     * @returns {Cell[]}
     */
    cells() {
        return this._cells;
    }

    /**
     * Starts the game loop by calling the `scheduler` function to execute
     * ticks. Stops the game if there are no more living cells.
     *
     * See the comments in `tests/life.test.js` for a more detailed explanation
     * of the scheduler pattern.
     *
     * @param {SchedulerFunction} scheduler
     */
    play(scheduler) {
        this._gameLoop = scheduler(() => {
            if (this.isPlaying()) {
                this.tick();
                if (this._cells.length === 0) {
                    this.stop();
                }
            }
        });
    }

    /** Stops the game loop from executing ticks. */
    stop() {
        if (this._gameLoop) {
            this._gameLoop.cancel();
            this._gameLoop = null;
        }
    }

    /**
     * Returns `true` if the game loop is executing ticks, else `false`.
     *
     * @returns {boolean}
     */
    isPlaying() {
        return this._gameLoop !== null;
    }

    /**
     * Calculates the new state of the game after a single time increment and
     * updates the current state.
     */
    tick() {
        this._cells = next(this._cells);
    }

    /**
     * Toggles a single cell to life, if it's dead, or to death, if it's alive.
     *
     * @param {number} x
     * @param {number} y
     */
    toggleCell(x, y) {
        const targetCell = [x, y];
        const cellIndex = this._cells.findIndex((cell) =>
            equals(cell, targetCell),
        );

        if (cellIndex === -1) {
            this._cells.push([x, y]);
        } else {
            this._cells.splice(cellIndex, 1);
        }
    }
}
