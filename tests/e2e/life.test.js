import { test, expect } from '@playwright/test';

test('Has a canvas element', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

test('The single cell at the centre of the canvas is white', async ({
    page
}) => {
    await page.goto('/');
    const canvas = await page.getByTestId('canvas');
    const { width, height } = await canvas.boundingBox();

    expect(
        await page.evaluate(
            ({ x, y }) => {
                const cellSize = 20;
                const canvas = document.querySelector('canvas');
                const ctx = canvas.getContext('2d');
                const imgData = ctx.getImageData(x, y, cellSize, cellSize).data;

                return imgData.every((e) => e === 255);
            },
            {
                x: width / 2,
                y: height / 2
            }
        )
    ).toBeTruthy();
});
