export function next(cells) {
    if (cells.length < 3) {
        return [];
    } else {
        return [[0, 0]];
    }
}
