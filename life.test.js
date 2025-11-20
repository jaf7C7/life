import { next } from './life.js'


test('a live cell with no neighbours dies', () => {
    liveCell = [0, 0];
    cells = [liveCell];

    expect(next(cells)).not.toContain(liveCell);
});
