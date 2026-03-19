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
    return cells.find(([x, y]) => x === cell[0] && y === cell[1]) !== undefined;
}

function equals(cell, otherCell) {
    return cell[0] === otherCell[0] && cell[1] === otherCell[1];
}

function count(cell, cells) {
    return cells.reduce((counter, c) => counter + (equals(cell, c) ? 1 : 0), 0);
}

function resurrectees(deadNeighbours) {
    const resurrectees = [];
    for (const cell of deadNeighbours) {
        if (
            count(cell, deadNeighbours) === 3 &&
            !contains(cell, resurrectees)
        ) {
            resurrectees.push(cell);
        }
    }
    return resurrectees;
}

export function next(cells) {
    let newCells = [];
    const deadNeighbours = [];

    for (const cell of cells) {
        const liveNeighbours = [];

        for (const neighbour of neighbours(cell)) {
            if (contains(neighbour, cells)) {
                liveNeighbours.push(neighbour);
            } else {
                deadNeighbours.push(neighbour);
            }
        }

        if (liveNeighbours.length > 1) {
            newCells.push(cell);
        }
    }

    newCells = resurrectees(deadNeighbours).concat(newCells);

    return newCells;
}
