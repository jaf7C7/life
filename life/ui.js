export default class UI {
    setTitle(title) {
        document.title = title;
    }

    createHeading(textContent) {
        const attributes = { 'data-testid': 'title' };
        const properties = { textContent: textContent };
        this.createElement('h1', attributes, properties);
    }

    createGrid(gridWidth, gridHeight, cellSize) {
        const attributes = {
            'data-testid': 'grid',
            height: gridHeight,
            width: gridWidth,
        };
        const grid = this.createElement('canvas', attributes);

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

    createElement(type, attributes, properties) {
        const element = document.createElement(type);
        for (const [key, value] of Object.entries(attributes)) {
            element.setAttribute(key, value);
        }
        Object.assign(element, properties);
        document.body.appendChild(element);

        return element;
    }
}
