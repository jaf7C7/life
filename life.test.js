import { next } from './life.js'


test('a live cell with no neighbours dies', () => {
    liveCell = [0, 0];
    cells = [liveCell];

    expect(next(cells)).not.toContainEqual(liveCell);
});


test('a live cell with two live neighbours survives', () => {
    liveCell = [0, 0];
    neighbours = [[1, 0], [-1, 0]];
    cells = [liveCell, ...neighbours];

    expect(next(cells)).toContainEqual(liveCell);
});
