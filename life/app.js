export default function createApp(ui, game, cellSize, gridWidth, gridHeight) {
    ui.createElement({
        id: 'grid',
        cellSize: cellSize,
        click(x, y) {
            const [cellX, cellY] = [
                Math.floor(x - gridWidth / 2),
                Math.floor(y - gridHeight / 2),
            ];
            game.toggleCell(cellX, cellY);
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
