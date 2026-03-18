function neighbours(cell) {
    const [x, y] = cell;
    return [
        [x, y + 1],
        [x + 1, y + 1],
        [x + 1, y],
        [x + 1, y - 1],
        [x, y - 1],
        [x - 1, y - 1],
        [x - 1, y],
        [x - 1, y + 1]
    ];
}

function contains(cell, cells) {
    return cells.find(([x, y]) => x === cell[0] && y === cell[1]);
}

export function next(cells) {
    const newCells = [];

    for (const cell of cells) {
        const liveNeighbours = [];

        for (const neighbour of neighbours(cell)) {
            if (contains(neighbour, cells)) {
                liveNeighbours.push(neighbour);
            }
        }

        if (liveNeighbours.length > 1) {
            newCells.push(cell);
        }
    }

    if (!contains([0, 0], cells)) {
        newCells.unshift([0, 0]);
    }

    return newCells;
}
