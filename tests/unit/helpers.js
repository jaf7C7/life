export class UI {
    constructor(cells) {
        this.elements = [];
        this.cells = cells;
    }

    createElement(type) {
        const element = {
            type,
            width: 100,
            height: 100,
            click: ({ position: { x, y } }) => {
                if (x === element.width / 2 && y === element.height / 2) {
                    this.cells.add('0,0');
                }
            }
        };
        this.elements.push(element);
    }

    findElement(type) {
        return this.elements.find((e) => e.type === type);
    }
}
