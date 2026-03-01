export default class UI {
    setTitle(title) {
        document.title = title;
    }

    createHeading(textContent) {
        let title = document.createElement('h1');
        title.setAttribute('data-testid', 'title');
        title.textContent = textContent;
        document.body.appendChild(title);
    }

    createGrid() {
        let grid = document.createElement('canvas');
        grid.setAttribute('data-testid', 'grid');
        document.body.appendChild(grid);

        this.drawGrid(grid);

        grid.addEventListener('click', () => {
            const ctx = grid.getContext('2d');
            const currentColor = ctx.fillStyle;
            const red = '#ff0000';
            const white = '#ffffff';
            ctx.fillStyle = currentColor === red ? white : red;
            ctx.fillRect(0, 0, grid.width, grid.height);
        });

        const resizeObserver = new ResizeObserver((entries) => {
            this.drawGrid(entries[0].target);
        });

        resizeObserver.observe(grid);
    }

    drawGrid(grid) {
        grid.cellSize = 20;
        grid.width = grid.clientWidth;
        grid.height = grid.clientHeight;
        const ctx = grid.getContext('2d');

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, grid.width, grid.height);

        const lineWidth = 2;
        const effectiveCellSize = grid.cellSize + lineWidth;
        ctx.fillStyle = 'white';

        // Offset the grid so the centre of the middle cell always aligns
        // with the centre of the grid.  The offset is such that a margin
        // of 1 cell is drawn outside the boundary of the grid to avoid
        // any blank space showing when resizing the grid element.
        const offsetX =
            ((grid.width / 2) % effectiveCellSize) -
            effectiveCellSize * (3 / 2);
        const offsetY =
            ((grid.height / 2) % effectiveCellSize) -
            effectiveCellSize * (3 / 2);

        for (let y = offsetY; y < grid.height; y += effectiveCellSize) {
            for (let x = offsetX; x < grid.width; x += effectiveCellSize) {
                ctx.fillRect(x, y, grid.cellSize, grid.cellSize);
            }
        }
    }

    createElement() {}
}
