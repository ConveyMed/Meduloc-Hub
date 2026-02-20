// @ts-check
// Tests for Home / Feed / Posts
// No data creation - only reads

const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');

test.describe('Home / Feed', () => {
  test('should display home page', async ({ userPage }) => {
    await userPage.goto('/home');
    await waitForPageLoad(userPage);
    await expect(userPage).toHaveURL(/\/home/);
  });

  test('should show feed content or empty state', async ({ userPage }) => {
    await userPage.goto('/home');
    await waitForPageLoad(userPage);

    // Should have either posts or empty state
    const content = userPage.locator('article, [data-testid], text=/no posts/i, text=/welcome/i');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have bottom navigation with all tabs', async ({ userPage }) => {
    await userPage.goto('/home');
    await waitForPageLoad(userPage);

    const nav = userPage.locator('nav');
    await expect(nav).toBeVisible();
    await expect(userPage.locator('text=Home')).toBeVisible();
    await expect(userPage.locator('text=Library')).toBeVisible();
    await expect(userPage.locator('text=Updates')).toBeVisible();
  });
});
