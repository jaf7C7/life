import { test, expect } from '@playwright/test';
import { Canvas } from './helpers.js';

test('A canvas element is created', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

test('Cell `0,0` is rendered', async ({ page }) => {
    await page.goto('/');
    const canvas = await Canvas.fromPage(page);
    const cell = await canvas.cell(0, 0);

    expect(cell.isRendered()).toBe(true);
});
