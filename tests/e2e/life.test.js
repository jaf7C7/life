import { test, expect } from '@playwright/test';
import { Canvas } from './helpers.js';

test('A canvas element is created', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

test('Clicking on the center of the canvas renders cell `0,0`', async ({
    page
}) => {
    await page.goto('/');
    const canvas = await Canvas.fromPage(page);

    await canvas.locator.click();

    const cell = await canvas.cell(0, 0);
    expect(cell.isRendered()).toBe(true);
});
