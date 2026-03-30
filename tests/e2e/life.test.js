import { test, expect } from '@playwright/test';
import { cellIsRendered } from '../helpers.js';

test('Has a canvas element', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

function cellCoords(x, y, width, height, cellSize, borderWidth) {
    // Coords of top left corner of cell `1,1`. Slightly confusing because the
    // cell co-ords have their origin at the centre of the canvas, and y
    // increases in the upwards direction, whereas the canvas co-ords have
    // their origin at the top left corner of the canvas, and y increases in
    // the downwards direction.
    const x0 = width / 2 - (cellSize + borderWidth) / 2 + x * (cellSize + borderWidth);
    const y0 = height / 2 - (cellSize + borderWidth) / 2 - y * (cellSize + borderWidth);

    return [x0, y0];
}

test('The central cell is white with a black border', async ({ page }) => {
    await page.goto('/');
    const canvas = await page.getByTestId('canvas');
    const { width, height } = await canvas.boundingBox();
    const cellSize = 20;
    const borderWidth = 2;

    const [x0, y0] = cellCoords(0, 0, width, height, cellSize, borderWidth);

    const result = await page.evaluate(cellIsRendered, {
        x0,
        y0,
        cellSize,
        borderWidth
    });

    expect(result).toBeTruthy();
});

test('Cell `1,1` is white with a black border', async ({ page }) => {
    await page.goto('/');
    const canvas = await page.getByTestId('canvas');
    const { width, height } = await canvas.boundingBox();
    const cellSize = 20;
    const borderWidth = 2;

    const [x0, y0] = cellCoords(1, 1, width, height, cellSize, borderWidth);

    const result = await page.evaluate(cellIsRendered, {
        x0,
        y0,
        cellSize,
        borderWidth
    });

    expect(result).toBeTruthy();
});
