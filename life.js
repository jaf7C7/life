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
 * Returns `true` if `cellA` and `cellB` are the same, else `false`.
 *
 * @param {Cell} cellA
 * @param {Cell} cellB
 * @returns {boolean}
 */
function equals(cellA, cellB) {
    return cellA[0] === cellB[0] && cellA[1] === cellB[1];
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
 * @param {Cell} targetCell
 * @returns {Cell[]}
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
 *
 * @param {Cell} cell
 * @param {Cell[]} cells
 * @returns {Cell[][]}
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
        this.cells = [];
        this._gameLoop = null;
    }

    /**
     * Changes the state of the game to playing and starts the game loop by
     * calling the `scheduler` function.
     *
     * @param {SchedulerFunction} scheduler
     * @returns {void}
     */
    play(scheduler) {
        if (scheduler) {
            this._gameLoop = scheduler(() => {
                if (!this._stopped) {
                    this.tick();
                }
            });
        }
    }

    /**
     * Changes the state of the game to not playing.
     *
     * @returns {void}
     */
    stop() {
        this._stopped = true;
        if (this._gameLoop) {
            this._gameLoop.cancel();
        }
    }

    /**
     * Returns `true` if there are scheduled ticks, else `false`.
     *
     * @returns {boolean}
     */
    isPlaying() {
        return this._gameLoop !== null;
    }

    /**
     * Calculates the new state of the game after a single time increment and
     * updates the current state.
     *
     * @returns {void}
     */
    tick() {
        this.cells = next(this.cells);
        if (this.cells.length === 0) {
            this.stop();
        }
    }

    /**
     * Toggles a single cell to life, if it's dead, or to death, if it's alive.
     *
     * @param {number} x
     * @param {number} y
     * @returns {void}
     */
    toggleCell(x, y) {
        const targetCell = [x, y];
        const cellIndex = this.cells.findIndex((cell) =>
            equals(cell, targetCell),
        );

        if (cellIndex === -1) {
            this.cells.push([x, y]);
        } else {
            this.cells.splice(cellIndex, 1);
        }
    }
}
