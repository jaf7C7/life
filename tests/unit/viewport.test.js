import { expect } from 'chai';
import { suite, test } from 'mocha';
import { Viewport } from '../../life/viewport.js';

suite('visibleCells()', () => {
    test('Should return just the origin cell if the canvas is smaller than a single cell', () => {
        const canvas = {
            width: Viewport.cellStep - 1,
            height: Viewport.cellStep - 1
        };
        const result = new Viewport(canvas.width, canvas.height)
            .visibleCells()
            .map((c) => c.toString());

        expect(result).to.deep.equal(['0,0']);
    });

    test('Should return just the origin cell if the canvas is exactly equal to a single cell', () => {
        const canvas = {
            width: Viewport.cellStep,
            height: Viewport.cellStep
        };
        const result = new Viewport(canvas.width, canvas.height)
            .visibleCells()
            .map((c) => c.toString());

        expect(result).to.deep.equal(['0,0']);
    });

    test('Should return 9 cells if a square canvas is larger than a single cell', () => {
        const canvas = {
            width: Viewport.cellStep + 1,
            height: Viewport.cellStep + 1
        };
        const result = new Viewport(canvas.width, canvas.height)
            .visibleCells()
            .map((c) => c.toString())
            .sort();

        expect(result).to.deep.equal(
            [
                '-1,1',
                '0,1',
                '1,1',
                '-1,0',
                '0,0',
                '1,0',
                '-1,-1',
                '0,-1',
                '1,-1'
            ].sort()
        );
    });

    test('Should handle non-square canvases', () => {
        const testData = [
            {
                width: Viewport.cellStep,
                height: 2 * Viewport.cellStep,
                expectedResult: ['0,1', '0,0', '0,-1']
            },
            {
                width: 2 * Viewport.cellStep,
                height: Viewport.cellStep,
                expectedResult: ['-1,0', '0,0', '1,0']
            },

            {
                width: Viewport.cellStep,
                height: Viewport.cellStep + 1,
                expectedResult: ['0,1', '0,0', '0,-1']
            },
            {
                width: Viewport.cellStep + 1,
                height: Viewport.cellStep,
                expectedResult: ['-1,0', '0,0', '1,0']
            },

            {
                width: Viewport.cellStep - 1,
                height: Viewport.cellStep + 1,
                expectedResult: ['0,1', '0,0', '0,-1']
            },
            {
                width: Viewport.cellStep + 1,
                height: Viewport.cellStep - 1,
                expectedResult: ['-1,0', '0,0', '1,0']
            }
        ];

        for (const { width, height, expectedResult } of testData) {
            const canvas = { width, height };
            const result = new Viewport(canvas.width, canvas.height)
                .visibleCells()
                .map((c) => c.toString())
                .sort();

            expect(result).to.deep.equal(expectedResult.sort());
        }
    });
});
