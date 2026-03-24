import { test, expect } from '@playwright/test';

test('Has correct title', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Life/);
});
