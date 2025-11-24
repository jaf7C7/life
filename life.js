function cellsAreEqual(cellA, cellB) {
    return cellA[0] === cellB[0] && cellA[1] === cellB[1];
}

function cellIsAlive(targetCell, cells) {
    return cells.find((cell) => cellsAreEqual(targetCell, cell)) !== undefined;
}

export function next(cells) {
    const potentialNeighbours = [
        [1, 0],
        [-1, 0],
    ];
    const liveNeighbours = potentialNeighbours.filter((potentialNeighbour) =>
        cellIsAlive(potentialNeighbour, cells),
    );

    return liveNeighbours.length == 2 ? cells : [];
}
