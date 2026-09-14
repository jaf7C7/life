import { Cell } from '../../life/cell.js';
import { cellCentre } from '../../life/viewport.js';

/** A minimal fake of the DOM `document` object, for use in unit tests. */
export class MockUI {
    constructor() {
        this.elements = [];
    }

    /**
     * @param {string} type
     * @returns {object}
     */
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
                const cell = new Cell(cellX, cellY);
                const [x, y] = cellCentre(this, cell);
                this.click({ x, y });
            },

            getContext() {
                return { fillRect() {} };
            }
        };

        this.elements.push(element);

        return element;
    }

    /**
     * @param {string} type
     * @returns {object}
     */
    findElement(type) {
        return this.elements.find((e) => e.type === type);
    }
}
