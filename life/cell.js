export class DisplayCell {
    static size = 20;
    static borderWidth = 2;
    static aliveColor = '#ff0000';
    static deadColor = '#ffffff';
    static borderColor = '#000000';
}

export class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    toString() {
        return `${this.x},${this.y}`;
    }

    static fromString(str) {
        const [x, y] = str.split(',').map(Number);
        return new Cell(x, y);
    }
}
