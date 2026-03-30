import { test, expect } from '@playwright/test';
import { cellIsRendered } from '../helpers.js';

test('Has a canvas element', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

test('The central cell is white with a black border', async ({ page }) => {
    await page.goto('/');
    const canvas = await page.getByTestId('canvas');
    const { width, height } = await canvas.boundingBox();
    const cellSize = 20;
    const borderWidth = 2;

    // `x0` and `y0` are the coords of the top-left corner of the central cell.
    const [x0, y0] = [width, height].map(
        (e) => (e - cellSize - borderWidth) / 2
    );

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

    // Coords of top left corner of cell `1,1`. Slightly confusing because the
    // cell co-ords have their origin at the centre of the canvas, and y
    // increases in the upwards direction, whereas the canvas co-ords have
    // their origin at the top left corner of the canvas, and y increases in
    // the downwards direction.
    const x0 = (width - cellSize - borderWidth) / 2 + (cellSize + borderWidth);
    const y0 = (height - cellSize - borderWidth) / 2 - (cellSize + borderWidth);

    const result = await page.evaluate(cellIsRendered, {
        x0,
        y0,
        cellSize,
        borderWidth
    });

    expect(result).toBeTruthy();
});
