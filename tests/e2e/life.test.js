import { test, expect } from '@playwright/test';
import { Canvas } from './helpers.js';
import { Cell } from '../../life/cell.js';

test('A canvas element is created', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

test('Cell `1,1` is rendered in the initial grid', async ({ page }) => {
    await page.goto('/');
    const canvas = await Canvas.fromPage(page);

    expect((await canvas.cell(1, 1)).isDead()).toBe(true);
});

test('Clicking on the center of the canvas renders cell `0,0`', async ({
    page
}) => {
    await page.goto('/');
    const canvas = await Canvas.fromPage(page);

    await canvas.click({
        x: canvas.width / 2,
        y: canvas.height / 2
    });

    const cell = await canvas.cell(0, 0);
    expect(cell.isAlive()).toBe(true);
});

test('Dragging down and right by 1 cell then clicking the center toggles cell "-1,1"', async ({
    page
}) => {
    await page.goto('/');
    const canvas = await Canvas.fromPage(page);

    await canvas.drag({
        from: { x: canvas.width / 2, y: canvas.height / 2 },
        to: {
            x: canvas.width / 2 + Cell.step,
            y: canvas.height / 2 + Cell.step
        }
    });
    await canvas.click({ x: canvas.width / 2, y: canvas.height / 2 });

    expect((await canvas.cell(-1, 1)).isAlive()).toBe(true);
});

test('Clicking on a cell twice leaves it dead', async ({ page }) => {
    await page.goto('/');
    const canvas = await Canvas.fromPage(page);

    await canvas.clickCell(1, 1);
    await canvas.clickCell(1, 1);

    expect((await canvas.cell(1, 1)).isAlive()).toBe(false);
});
