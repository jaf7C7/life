import { test, expect } from '@playwright/test';

test('displays project title', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Life/);
});

test('displays a grid of cells', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('grid')).toBeVisible();
});
