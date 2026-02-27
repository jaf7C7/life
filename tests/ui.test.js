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
 * Returns the color of the single pixel at the centre of the canvas as an RGB
 * value.
 *
 * @returns {Integer[]} Color
 */
function getCellColor([x, y]) {
    const grid = document.querySelector('canvas');
    const [cx, cy] = [
        grid.clientWidth / 2 + x * grid.cellSize,
        grid.clientHeight / 2 + y * grid.cellSize,
    ];
    const [r, g, b] = grid.getContext('2d').getImageData(cx, cy, 1, 1).data;
    return [r, g, b];
}

test('a click turns the canvas from white to red', async ({ page }) => {
    await page.goto('/');
    const grid = await page.getByTestId('grid');
    const white = [255, 255, 255];
    const red = [255, 0, 0];

    expect(await page.evaluate(getCellColor, [0, 0])).toEqual(white);

    await grid.click();

    expect(await page.evaluate(getCellColor, [0, 0])).toEqual(red);
});

test('two clicks leaves the canvas white again', async ({ page }) => {
    await page.goto('/');
    const grid = await page.getByTestId('grid');
    const white = [255, 255, 255];

    expect(await page.evaluate(getCellColor, [0, 0])).toEqual(white);

    await grid.click();
    await grid.click();

    expect(await page.evaluate(getCellColor, [0, 0])).toEqual(white);
});
