export default function createApp(ui, game, cellSize) {
    ui.createElement({
        id: 'grid',
        cellSize: cellSize,
        click(x, y) {
            game.toggleCell(Math.floor(x / cellSize), Math.floor(y / cellSize));
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
