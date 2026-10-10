import { expect } from 'chai';
import { suite, test } from 'mocha';
import { Viewport } from '../../life/viewport.js';

suite('visibleCells()', () => {
    test('Should return just the origin cell if the canvas is smaller than a single cell', () => {
        const result = new Viewport(
            Viewport.cellStep - 1,
            Viewport.cellStep - 1
        )
            .visibleCells()
            .map((c) => c.toString());

        expect(result).to.deep.equal(['0,0']);
    });

    test('Should return just the origin cell if the canvas is exactly equal to a single cell', () => {
        const result = new Viewport(Viewport.cellStep, Viewport.cellStep)
            .visibleCells()
            .map((c) => c.toString());

        expect(result).to.deep.equal(['0,0']);
    });

    // To keep the rendering sharp, the origin will be rounded to the nearest
    // whole pixel. So in the case that the viewport is 1 pixel larger than the
    // grid size (`Viewport.cellStep`) instead of there being 0.5px displayed
    // each side of cell '0,0', there will be 0px on the left/bottom, and 1px
    // on the top/right. In this case, this means that 3 extra cells will be
    // rendered.
    //
    // Without rounding (not to scale):
    //
    //                       | 0.5px|
    //   +------+------------+------+ -----
    //   | -1,1 |    0,1     |  1,1 | 0.5px
    //   +------+------------+------+ -----
    //   |      |            |      |
    //   | -1,0 |    0,0     |  1,0 |
    //   |      |            |      |
    //   +------+------------+------+
    //   |-1,-1 |    0,-1    | 1,-1 |
    //   +------+------------+------+
    //
    // With rounding (not to scale):
    //
    //                  | 1px |
    //   +--------------+-----+ ---
    //   |   0,1        | 1,1 | 1px
    //   +--------------+-----+ ---
    //   |              |     |
    //   |   0,0        | 1,0 |
    //   |              |     |
    //   +--------------+-----+
    //
    test('Should return 4 cells if a square canvas is 1px larger than a single cell', () => {
        const result = new Viewport(
            Viewport.cellStep + 1,
            Viewport.cellStep + 1
        )
            .visibleCells()
            .map((c) => c.toString())
            .sort();

        expect(result).to.deep.equal(['0,0', '1,0', '1,1', '0,1'].sort());
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
                expectedResult: ['0,1', '0,0']
            },
            {
                width: Viewport.cellStep + 1,
                height: Viewport.cellStep,
                expectedResult: ['0,0', '1,0']
            },

            {
                width: Viewport.cellStep - 1,
                height: Viewport.cellStep + 1,
                expectedResult: ['0,1', '0,0']
            },
            {
                width: Viewport.cellStep + 1,
                height: Viewport.cellStep - 1,
                expectedResult: ['0,0', '1,0']
            }
        ];

        for (const { width, height, expectedResult } of testData) {
            const result = new Viewport(width, height)
                .visibleCells()
                .map((c) => c.toString())
                .sort();

            expect(result).to.deep.equal(expectedResult.sort());
        }
    });
});
