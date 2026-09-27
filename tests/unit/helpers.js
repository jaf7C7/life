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

            /**
             * Invokes the registered click handler with the click location.
             *
             * NOTE: That CSS pixels (the displayed dimensions of the element on
             * screen, as used in CSS) are distinct from bitmap or
             * "backing-store" pixels of the canvas element, which define the
             * "resolution" of the drawing surface of the canvas. These values
             * can vary independently, and are 1:1 equivalent if the canvas has
             * not been given a defined width by CSS rules.
             *
             * The click handler must be responsible for converting from CSS
             * pixels to bitmap pixels
             *
             * @param {object} position - The position **in CSS pixels** of the
             *   click
             * @param {number} position.x - The horizontal distance **in CSS
             *   pixels** of the click from the left edge of the element
             * @param {number} position.y - The vertical distance **in CSS
             *   pixels** of the click from the top edge of the element
             */
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
