import { expect } from 'chai';
import { suite, test } from 'mocha';
import { initApp } from '../../life/app.js';
import { UI } from './helpers.js';

suite('User Interface', () => {
    test('A canvas element is created', () => {
        const cells = new Set();
        const ui = new UI();

        initApp(ui, cells);

        expect(ui.elements[0].type).to.equal('canvas');
    });

    test('Clicking on the center of the canvas adds cell "0,0"', () => {
        const cells = new Set();
        const ui = new UI();

        initApp(ui, cells);
        const canvas = ui.findElement('canvas');
        canvas.click({
            offsetX: canvas.width / 2,
            offsetY: canvas.height / 2
        });

        expect(cells).to.deep.equal(new Set(['0,0']));
    });
});
