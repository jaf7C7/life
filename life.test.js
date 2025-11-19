import { next } from './life.js'

test('a live cell with no neighbours dies', () => {
    cells = [(0, 0)];
    expect(next(cells)).toBe([]);
});
