import { test, expect } from '@playwright/test';
import { cellIsAlive } from '../helpers.js';

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

    const result = await page.evaluate(cellIsAlive, {
        x0,
        y0,
        cellSize,
        borderWidth
    });

    expect(result).toBeTruthy();
});
