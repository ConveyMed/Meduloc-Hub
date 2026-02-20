// @ts-check
// Tests for Navigation / Bottom Nav
// No data creation - only navigation

const { test, expect } = require('./fixtures/auth.fixture');
const base = require('@playwright/test');
const { waitForPageLoad } = require('./helpers/navigation');

test.describe('Navigation - Authenticated', () => {
  test('should show bottom nav on home', async ({ userPage }) => {
    await userPage.goto('/home');
    await waitForPageLoad(userPage);

    const nav = userPage.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should navigate to Library', async ({ userPage }) => {
    await userPage.goto('/home');
    await waitForPageLoad(userPage);

    await userPage.locator('text=Library').click();
    await expect(userPage).toHaveURL(/\/library/);
  });

  test('should navigate to Updates', async ({ userPage }) => {
    await userPage.goto('/home');
    await waitForPageLoad(userPage);

    await userPage.locator('text=Updates').click();
    await expect(userPage).toHaveURL(/\/updates/);
  });

  test('should navigate back to Home', async ({ userPage }) => {
    await userPage.goto('/library');
    await waitForPageLoad(userPage);

    await userPage.locator('text=Home').click();
    await expect(userPage).toHaveURL(/\/home/);
  });
});

base.test.describe('Navigation - Unauthenticated', () => {
  base.test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/home');
    await page.waitForTimeout(3000);
    expect(page.url()).toMatch(/\/$/);
  });
});
