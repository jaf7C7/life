import { DisplayCell } from '../../life/cell.js';

export class MockUI {
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

            // This clicks the *centre* of cell `cellX,cellY`.
            clickCell(cellX, cellY) {
                this.click({
                    x: this.width / 2 + cellX * DisplayCell.step,
                    y: this.height / 2 - cellY * DisplayCell.step
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
