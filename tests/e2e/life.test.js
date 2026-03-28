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

    function pixelOK(x, y) {
        const pixelColor = ctx.getImageData(x0 + x, y0 + y, 1, 1).data;
        return isBorderPixel(x, y) ? isBlack(pixelColor) : isWhite(pixelColor);
    }

    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    let cellOK = false;

    for (let x = 0; x < effectiveCellSize; x++) {
        for (let y = 0; y < effectiveCellSize; y++) {
            cellOK = pixelOK(x, y);
        }
    }

    return cellOK;
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
