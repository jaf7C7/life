import { equals, next } from './life.js';

export class Game {
    constructor() {
        this.cells = [];
        this._playing = false;
    }

    play() {
        this._playing = true;
    }

    stop() {
        this._playing = false;
    }

    isPlaying() {
        return this._playing;
    }

    tick() {
        this.cells = next(this.cells);
    }

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
