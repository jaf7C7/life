import { test, expect } from '@playwright/test';

test('Has a canvas element', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

function cellIsAlive({ x0, y0, effectiveCellSize }) {
    function isBorderPixel(x, y) {
        return [x, y].some((e) => e === 0 || e === effectiveCellSize - 1);
    }

    function isBlack([r, g, b, a]) {
        return [r, g, b].every((e) => e === 0) && a === 255;
    }

    function isWhite([r, g, b, a]) {
        return [r, g, b].every((e) => e === 0) && a === 255;
    }

    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < effectiveCellSize; i++) {
        for (let j = 0; j < effectiveCellSize; j++) {
            const pixelData = ctx.getImageData(x0 + i, y0 + j, 1, 1).data;
            return isBorderPixel(i, j)
                ? isBlack(pixelData)
                : isWhite(pixelData);
        }
    }
}

test('The central cell is white with a black border', async ({ page }) => {
    await page.goto('/');
    const canvas = await page.getByTestId('canvas');
    const { width, height } = await canvas.boundingBox();
    const cellSize = 20;
    const lineWidth = 2;
    const effectiveCellSize = cellSize + lineWidth;

    // `x0` and `y0` are the coords of the top-left corner of the central cell.
    const x0 = width / 2 - effectiveCellSize / 2;
    const y0 = height / 2 - effectiveCellSize / 2;

    expect(
        await page.evaluate(cellIsAlive, { x0, y0, effectiveCellSize })
    ).toBeTruthy();
});
