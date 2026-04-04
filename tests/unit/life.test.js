import { expect } from 'chai';
import { suite, test } from 'mocha';

function initApp(createElement) {
    createElement('canvas');
}

suite('User Interface', () => {
    let cells;
    let elements;

    function createElement(type) {
        elements.push({
            type,
            width: 100,
            height: 100,
            click({ position: { x, y } }) {
                if (x === this.width / 2 && y === this.height / 2) {
                    cells.add('0,0');
                }
            }
        });
    }

    function findElement(type) {
        return elements.find((e) => e.type === type);
    }

    test('A canvas element is created', () => {
        cells = new Set();
        elements = [];

        initApp(createElement);

        expect(elements[0].type).to.equal('canvas');
    });

    test('Clicking on the center of the canvas toggles cell "0,0"', () => {
        cells = new Set();
        elements = [];

        initApp(createElement, cells);
        const canvas = findElement('canvas');
        canvas.click({
            position: { x: canvas.width / 2, y: canvas.height / 2 }
        });

        expect(cells).to.deep.equal(new Set(['0,0']));
    });
});
