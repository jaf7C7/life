import { expect } from 'chai';
import { suite, test } from 'mocha';
import { initApp } from '../../life/app.js';
import { UI } from './helpers.js';

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
