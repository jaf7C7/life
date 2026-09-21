import { test, expect } from '@playwright/test';
import { RenderedCanvas } from './helpers.js';

test('A canvas element is created', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

test('Cell `1,1` is rendered in the initial grid', async ({ page }) => {
    await page.goto('/');
    const canvas = await RenderedCanvas.fromPage(page);

    expect((await canvas.cell(1, 1)).isDead()).toBe(true);
});

test('Clicking on the center of the canvas renders cell `0,0`', async ({
    page
}) => {
    await page.goto('/');
    const canvas = await RenderedCanvas.fromPage(page);

    await canvas.click({
        x: canvas.width / 2,
        y: canvas.height / 2
    });

    const cell = await canvas.cell(0, 0);
    expect(cell.isAlive()).toBe(true);
});

test('Clicking on a cell twice leaves it dead', async ({ page }) => {
    await page.goto('/');
    const canvas = await RenderedCanvas.fromPage(page);

    await canvas.clickCell(1, 1);
    expect((await canvas.cell(1, 1)).isAlive()).toBe(true);

    await canvas.clickCell(1, 1);
    expect((await canvas.cell(1, 1)).isDead()).toBe(true);
});
