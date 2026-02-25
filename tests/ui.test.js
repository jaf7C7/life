import { test, expect } from '@playwright/test';

test('displays project title', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Life');
    await expect(page.getByRole('Heading')).toContainText('Life');
});

test('displays a grid of cells', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('grid')).toBeVisible();
});

test('the canvas is white', async ({ page }) => {
    function canvasIsWhite() {
        const grid = document.querySelector('canvas');
        const [cx, cy] = [grid.clientWidth / 2, grid.clientHeight / 2];
        const [r, g, b] = grid.getContext('2d').getImageData(cx, cy, 1, 1).data;

        return r === 255 && g === 255 && b === 255;
    }

    await page.goto('/');

    expect(await page.evaluate(canvasIsWhite)).toBe(true);
});
