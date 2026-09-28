import { expect } from 'chai';
import { suite, test } from 'mocha';
import { visibleCells, cellStep } from '../../life/viewport.js';

suite('visibleCells()', () => {
    test('Should return just the origin cell if the canvas is smaller than a single cell', () => {
        const canvas = { width: cellStep - 1, height: cellStep - 1 };
        const result = visibleCells(canvas).map((c) => c.toString());

        expect(result).to.deep.equal(['0,0']);
    });

    test('Should return 9 cells if the canvas is larger than a single cell', () => {
        const canvas = { width: cellStep + 1, height: cellStep + 1 };
        const result = new Set(visibleCells(canvas).map((c) => c.toString()));

        // prettier-ignore
        expect(result).to.deep.equal(
            new Set([
                '-1,1', '0,1', '1,1',
                '-1,0', '0,0', '1,0',
                '-1,-1', '0,-1', '1,-1'
            ])
        );
    });
});
