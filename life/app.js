export default function createApp(ui, game, cellSize, gridWidth, gridHeight) {
    ui.createElement({
        id: 'grid',
        cellPixelSize: cellSize,
        offset: { x: 0, y: 0 },

        click(x, y) {
            const [cellX, cellY] = [
                Math.floor(
                    (x - this.offset.x - gridWidth / 2) / this.cellPixelSize,
                ),
                Math.floor(
                    (y - this.offset.y - gridHeight / 2) / this.cellPixelSize,
                ),
            ];
            game.toggleCell(cellX, cellY);
        },

        clickAndDrag(mouseDownPos, mouseUpPos) {
            this.offset = {
                x: mouseUpPos.x - mouseDownPos.x,
                y: mouseUpPos.y - mouseDownPos.y,
            };
        },

        pinch(startTouches, endTouches) {
            this.cellPixelSize *= endTouches[1].x / startTouches[1].x;
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
