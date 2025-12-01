export function createGrid() {
    return {
        cells: [],
        toggleCell(x, y) {
            this.cells.push([x, y]);
        },
    };
}
