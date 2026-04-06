import { Cell } from '../../life/cell.js';

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
            drag({ from, to }) {
                this._handlers['mousedown']?.({
                    offsetX: from.x,
                    offsetY: from.y
                });
                this._handlers['mousemove']?.({ offsetX: to.x, offsetY: to.y });
                this._handlers['mouseup']?.();
            },
            clickCell(cellX, cellY) {
                const step = Cell.size + Cell.borderWidth;
                this.click({
                    x: this.width / 2 + cellX * step,
                    y: this.height / 2 - cellY * step
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
