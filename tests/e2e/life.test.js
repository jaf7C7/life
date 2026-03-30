import { test, expect } from '@playwright/test';
import { cellIsRendered } from '../helpers.js';

test('A canvas element is created', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

test('Cell `0,0` is rendered', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(cellIsRendered, { x: 0, y: 0 });

    expect(result).toBeTruthy();
});
