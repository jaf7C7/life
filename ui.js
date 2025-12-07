import { equals, next } from './life.js';

export function createGrid() {
    return {
        cells: [],
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
        },
    };
}

export function createGame() {
    let cells = [];
    let playing = false;

    return {
        cells: cells,

        play() {
            playing = true;
        },

        stop() {
            playing = false;
        },

        isPlaying() {
            return playing;
        },

        tick() {
            this.cells = next(this.cells);
        },

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
        },
    };
}
