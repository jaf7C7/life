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

test('Clicking on the grid toggles the corresponding cell', async ({
    page,
}) => {
    async function cellIsAlive(
        gridX,
        gridY,
        gridWidth,
        gridHeight,
        cellSize,
        page,
    ) {
        return await page.evaluate(
            ({ gridX, gridY, gridWidth, gridHeight, cellSize }) => {
                const pixelX = gridWidth / 2 + gridX * cellSize;
                const pixelY = gridHeight / 2 + gridY * cellSize;

                const grid = document.querySelector('canvas');
                const ctx = grid.getContext('2d');

                const imageData = ctx.getImageData(pixelX, pixelY, 1, 1);
                const [r, g, b] = imageData.data;

                return r === 255 && g === 0 && b === 0; // Red = alive
            },
            { gridX, gridY, gridWidth, gridHeight, cellSize },
        );
    }

    await page.goto('/');

    const grid = await page.getByTestId('grid');
    await grid.click({ position: { x: 50, y: 50 } });

    const gridHeight = 100;
    const gridWidth = 100;
    const cellSize = 20; // Must match implementation default.

    expect(await cellIsAlive(0, 0, gridWidth, gridHeight, cellSize, page)).toBe(
        true,
    );
});
