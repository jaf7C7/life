import { test, expect } from '@playwright/test';

test('Has a canvas element', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});

function cellIsAlive({ x0, y0, effectiveCellSize }) {
    function isBorderPixel(x, y, effectiveCellSize) {
        const max = effectiveCellSize - 1;
        return x === 0 || x === max || y === 0 || y === max;
    }

    function isBorderColor([r, g, b, a]) {
        return r === 0 && g === 0 && b === 0 && a === 255; // black
    }

    function isCellColor([r, g, b, a]) {
        return r === 255 && g === 255 && b === 255 && a === 255; // white
    }

    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < effectiveCellSize; i++) {
        for (let j = 0; j < effectiveCellSize; j++) {
            const pixelData = ctx.getImageData(x0 + i, y0 + j, 1, 1).data;
            return isBorderPixel(i, j, effectiveCellSize)
                ? isBorderColor(pixelData)
                : isCellColor(pixelData);
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
