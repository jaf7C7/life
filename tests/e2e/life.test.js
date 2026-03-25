import { test, expect } from '@playwright/test';

test('Has a canvas element', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('canvas')).toBeVisible();
});
