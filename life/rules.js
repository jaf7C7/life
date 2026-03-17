export function next(cells) {
    const newCells = [];

    if (!(cells.length < 3)) {
        newCells.push([0, 0]);
    }

    return newCells;
}
