import UI from './ui.js';

export default function createApp(
    ui = new UI(),
    game,
    cellSize,
    gridWidth,
    gridHeight,
) {
    ui.setTitle('Life');
    ui.createHeading('Life');
    ui.createGrid();

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
            const separation = (touches) => {
                const dx = touches[1].x - touches[0].x;
                const dy = touches[1].y - touches[0].y;

                return Math.sqrt(dx ** 2 + dy ** 2);
            };

            const scale = separation(endTouches) / separation(startTouches);

            this.cellPixelSize *= scale;
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
