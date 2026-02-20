// @ts-check
// Tests for Library (user view)
// No data creation - only reads

const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');

test.describe('Library', () => {
  test('should display library page', async ({ userPage }) => {
    await userPage.goto('/library');
    await waitForPageLoad(userPage);
    await expect(userPage).toHaveURL(/\/library/);
  });

  test('should show header', async ({ userPage }) => {
    await userPage.goto('/library');
    await waitForPageLoad(userPage);

    const header = userPage.locator('h1').first();
    await expect(header).toContainText(/library/i);
  });

  test('should show categories or empty state', async ({ userPage }) => {
    await userPage.goto('/library');
    await waitForPageLoad(userPage);

    // Should have content or empty message
    const content = userPage.locator('text=/category|content|empty|no items/i');
    await expect(content.first()).toBeVisible({ timeout: 5000 });
  });
});
