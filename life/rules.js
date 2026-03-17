function neighbours(cell, cells) {
    // If cell is [0, 0].
    if (cell.every((e) => e === 0)) {
        return cells;
    } else {
        return [];
    }
}

export function next(cells) {
    const newCells = [];

    for (const cell of cells) {
        if (neighbours(cell, cells).length >= 3) {
            newCells.push(cell);
        }
    }

    return newCells;
}
