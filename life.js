function cellsAreEqual(cellA, cellB) {
    return cellA[0] === cellB[0] && cellA[1] === cellB[1];
}

function cellIsAlive(targetCell, cells) {
    return cells.find((cell) => cellsAreEqual(targetCell, cell)) !== undefined;
}

export function next(cells) {
    const cell = [0, 0];
    const potentialNeighbours = [[1, 0], [-1, 0]];
    const condition = potentialNeighbours.every((potentialNeighbour) => cellIsAlive(potentialNeighbour, cells));

    return (condition) ? cells : [];
}
