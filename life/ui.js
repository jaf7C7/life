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

        const gridHeight = 100;
        const gridWidth = 100;
        const cellSize = 20;

        grid.setAttribute('height', gridHeight);
        grid.setAttribute('width', gridWidth);

        const ctx = grid.getContext('2d');
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;

        ctx.beginPath();

        // Vertical lines.
        for (let i = 0; i <= gridWidth; i++) {
            const x = i * cellSize;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, gridHeight);
        }

        // Horizontal lines.
        for (let j = 0; j <= gridHeight; j++) {
            const y = j * cellSize;
            ctx.moveTo(0, y);
            ctx.lineTo(gridWidth, y);
        }

        ctx.stroke();

        grid.addEventListener('click', (event) => {
            const rect = grid.getBoundingClientRect();

            // Get pixel coordinates relative to canvas
            const pixelX = event.clientX - rect.left;
            const pixelY = event.clientY - rect.top;

            // Convert to grid coordinates
            const [gridX, gridY] = [
                Math.round((pixelX - gridWidth / 2) / cellSize),
                Math.round((pixelY - gridHeight / 2) / cellSize) * -1, // positive Y is upwards.
            ];

            // Colour the cell
            ctx.fillStyle = 'rgb(255, 0, 0)';
            ctx.fillRect(
                Math.floor(pixelX / cellSize) * cellSize,
                Math.floor(pixelY / cellSize) * cellSize,
                cellSize,
                cellSize,
            );
        });
    }

    createElement() {}
}
