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

/**
 * Returns true if the canvas is the specified RGB value, else false. Requires
 * `document` to be defined.
 *
 * @param {Integer[]} color - A RGB color value
 * @returns {boolean}
 */
function canvasIsColor([r, g, b]) {
    const grid = document.querySelector('canvas');
    const [cx, cy] = [grid.clientWidth / 2, grid.clientHeight / 2];
    const [_r, _g, _b] = grid.getContext('2d').getImageData(cx, cy, 1, 1).data;
    return _r === r && _g === g && _b === b;
}

test('a click turns the canvas from white to red', async ({ page }) => {
    await page.goto('/');
    const grid = await page.getByTestId('grid');

    expect(await page.evaluate(canvasIsColor, [255, 255, 255])).toBe(true);

    await grid.click();

    expect(await page.evaluate(canvasIsColor, [255, 0, 0])).toBe(true);
});

test('two clicks leaves the canvas white again', async ({ page }) => {
    await page.goto('/');
    const grid = await page.getByTestId('grid');

    expect(await page.evaluate(canvasIsColor, [255, 255, 255])).toBe(true);

    await grid.click();
    await grid.click();

    expect(await page.evaluate(canvasIsColor, [255, 255, 255])).toBe(true);
});
