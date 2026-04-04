import { expect } from 'chai';
import { suite, test } from 'mocha';
import { initApp } from '../../life/app.js';

class UI {
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

suite('User Interface', () => {
    test('A canvas element is created', () => {
        const ui = new UI(new Set());

        initApp(ui);

        expect(ui.elements[0].type).to.equal('canvas');
    });

    test('Clicking on the center of the canvas toggles cell "0,0"', () => {
        const cells = new Set();
        const ui = new UI(cells);

        initApp(ui);
        const canvas = ui.findElement('canvas');
        canvas.click({
            position: { x: canvas.width / 2, y: canvas.height / 2 }
        });

        expect(cells).to.deep.equal(new Set(['0,0']));
    });
});
