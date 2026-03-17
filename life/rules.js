function neighbours(cell, cells) {
    return cells;
}

export function next(cells) {
    const cell = [0, 0];
    const newCells = [];

    if (neighbours(cell, cells).length >= 3) {
        newCells.push(cell);
    }

    return newCells;
}
