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

        grid.height = 2000;
        grid.width = 2000;
        grid.cellSize = 20;
        const ctx = grid.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, grid.width, grid.height);

        grid.addEventListener('click', () => {
            const ctx = grid.getContext('2d');
            const currentColor = ctx.fillStyle;
            const red = '#ff0000';
            const white = '#ffffff';
            ctx.fillStyle = currentColor === red ? white : red;
            ctx.fillRect(0, 0, grid.width, grid.height);
        });
    }

    createElement() {}
}
