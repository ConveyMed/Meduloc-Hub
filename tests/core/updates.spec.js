// @ts-check
// Tests for Updates/Events (user view)
// No data creation - only reads

const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');

test.describe('Updates / Events', () => {
  test('should display updates page', async ({ userPage }) => {
    await userPage.goto('/updates');
    await waitForPageLoad(userPage);
    await expect(userPage).toHaveURL(/\/updates/);
  });

  test('should show Updates and Events tabs', async ({ userPage }) => {
    await userPage.goto('/updates');
    await waitForPageLoad(userPage);

    await expect(userPage.locator('button:has-text("Updates")')).toBeVisible();
    await expect(userPage.locator('button:has-text("Events")')).toBeVisible();
  });

  test('should switch between tabs', async ({ userPage }) => {
    await userPage.goto('/updates');
    await waitForPageLoad(userPage);

    await userPage.locator('button:has-text("Events")').click();
    await userPage.waitForTimeout(300);

    await userPage.locator('button:has-text("Updates")').click();
    await userPage.waitForTimeout(300);
  });
});
