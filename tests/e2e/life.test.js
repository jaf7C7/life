import { test, expect } from '@playwright/test';
import { Canvas } from './helpers.js';
import { cellSize, cellBorderWidth } from '../../life/app.js';

test('A canvas element is created', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

test('Clicking on cell `1,1` renders cell `1,1`', async ({ page }) => {
    await page.goto('/');
    const canvas = await Canvas.fromPage(page);

    await canvas.locator.click({
        position: {
            x: canvas.width / 2 + cellSize + cellBorderWidth,
            y: canvas.height / 2 - cellSize - cellBorderWidth
        }
    });

    const cell = await canvas.cell(1, 1);
    expect(cell.isRendered()).toBe(true);
});

test('Clicking on the center of the canvas renders cell `0,0`', async ({
    page
}) => {
    await page.goto('/');
    const canvas = await Canvas.fromPage(page);

    await canvas.locator.click({
        position: {
            x: canvas.width / 2,
            y: canvas.height / 2
        }
    });

    const cell = await canvas.cell(0, 0);
    expect(cell.isRendered()).toBe(true);
});
