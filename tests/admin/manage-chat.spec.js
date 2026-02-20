// @ts-check
// Tests for Admin - Manage Chat
// No data creation - only reads and settings

const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');

test.describe('Admin - Manage Chat', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/manage-chat');
    await waitForPageLoad(adminPage);
  });

  test('should display manage chat page', async ({ adminPage }) => {
    await expect(adminPage).toHaveURL(/\/manage-chat/);
    const header = adminPage.locator('h1').first();
    await expect(header).toContainText(/chat/i);
  });

  test('should have Reports and Settings tabs', async ({ adminPage }) => {
    await expect(adminPage.locator('button:has-text("Reports")')).toBeVisible();
    await expect(adminPage.locator('button:has-text("Settings")')).toBeVisible();
  });

  test('should switch between tabs', async ({ adminPage }) => {
    // Settings tab
    await adminPage.locator('button:has-text("Settings")').click();
    await adminPage.waitForTimeout(300);
    await expect(adminPage.locator('text=Chat Visibility')).toBeVisible();

    // Reports tab
    await adminPage.locator('button:has-text("Reports")').click();
    await adminPage.waitForTimeout(300);
    const reportsContent = adminPage.locator('text=No Reports').or(adminPage.locator('text=report'));
    await expect(reportsContent.first()).toBeVisible();
  });

  test('should show chat visibility options', async ({ adminPage }) => {
    await adminPage.locator('button:has-text("Settings")').click();
    await adminPage.waitForTimeout(300);

    await expect(adminPage.locator('text=Chat Visibility')).toBeVisible();
    await expect(adminPage.locator('span:has-text("All Members")')).toBeVisible();
    await expect(adminPage.locator('input[type="radio"]').first()).toBeVisible();
  });
});
