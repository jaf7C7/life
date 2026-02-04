export default function createApp(ui, game, cellSize, gridWidth, gridHeight) {
    ui.createElement({
        id: 'grid',
        cellSize: cellSize,
        offsetX: 0,
        offsetY: 0,

        click(x, y) {
            const [cellX, cellY] = [
                Math.floor((x - this.offsetX - gridWidth / 2) / cellSize),
                Math.floor((y - this.offsetY - gridHeight / 2) / cellSize),
            ];
            game.toggleCell(cellX, cellY);
        },

        clickAndDrag(from, to) {
            this.offsetX = to[0] - from[0];
            this.offsetY = to[1] - from[1];
        },
    });

    ui.createElement({
        id: 'stop',

        click() {
            game.stop();
        },
    });

    ui.createElement({
        id: 'play',

        click() {
            // XXX: This will not work in production.
            const dummyScheduledTask = { cancel: () => undefined };
            const dummyScheduler = () => dummyScheduledTask;
            game.play(dummyScheduler);
        },
    });
}
