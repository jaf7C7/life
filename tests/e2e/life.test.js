import { test, expect } from '@playwright/test';

test('Has a canvas element', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

test('The canvas has nonzero size', async ({ page }) => {
    await page.goto('/');
    const canvas = await page.getByTestId('canvas');
    const { width, height } = await canvas.boundingBox();

    expect(
        await page.evaluate(({ x, y }) => x > 0 && y > 0, {
            x: width,
            y: height
        })
    ).toBeTruthy();
});
