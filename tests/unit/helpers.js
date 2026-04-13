import { Cell } from '../../life/cell.js';

const cellStep = Cell.size + Cell.borderWidth;

export class UI {
    constructor() {
        this.elements = [];
    }

    createElement(type) {
        const element = {
            type,
            width: 100,
            height: 100,
            _handlers: {},
            addEventListener(event, handler) {
                this._handlers[event] = handler;
            },
            click({ x, y }) {
                this._handlers['click']?.({ offsetX: x, offsetY: y });
            },
            clickCell(cellX, cellY) {
                this.click({
                    x: this.width / 2 + cellX * cellStep,
                    y: this.height / 2 - cellY * cellStep
                });
            },
            getContext() {
                return { fillRect() {} };
            }
        };
        this.elements.push(element);
        return element;
    }

    findElement(type) {
        return this.elements.find((e) => e.type === type);
    }
}
