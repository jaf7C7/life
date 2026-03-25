import { expect } from 'chai';
import { suite, test } from 'mocha';

function initApp(createElement) {
    createElement('canvas');
}

suite('User Interface', () => {
    test('A canvas element is created', () => {
        let elementCreated;

        function createElement(type) {
            elementCreated = type;
        }

        initApp(createElement);

        expect(elementCreated).to.equal('canvas');
    });

    test('Clicking on the center of the canvas toggles cell "0,0"', () => {
        const cells = new Set();
        const elements = [];

        function createElement(type) {
            elements.push({
                type,
                width: 100,
                height: 100,
                click({ position: { x, y } }) {
                    if (x === 50 && y === 50) {
                        cells.add('0,0');
                    }
                }
            });
        }

        function findElement(type) {
            return elements.find((e) => e.type === type);
        }

        initApp(createElement, cells);
        const canvas = findElement('canvas');
        canvas.click({
            position: { x: canvas.width / 2, y: canvas.height / 2 }
        });

        expect(cells).to.deep.equal(new Set(['0,0']));
    });
});
