// @ts-check
// Tests for Admin - Manage Users
// No data creation - only reads and UI interactions

const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');

test.describe('Admin - Manage Users', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/manage-users');
    await waitForPageLoad(adminPage);
  });

  test('should display manage users page', async ({ adminPage }) => {
    await expect(adminPage).toHaveURL(/\/manage-users/);
    const header = adminPage.locator('h1').first();
    await expect(header).toContainText(/users/i);
  });

  test('should display user stats', async ({ adminPage }) => {
    await expect(adminPage.locator('text=Total Users')).toBeVisible({ timeout: 10000 });
    await expect(adminPage.locator('text=Admins')).toBeVisible();
    await expect(adminPage.locator('text=Members')).toBeVisible();
  });

  test('should have search functionality', async ({ adminPage }) => {
    const searchInput = adminPage.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');
    await adminPage.waitForTimeout(500);
    await expect(searchInput).toHaveValue('test');
  });

  test('should open and close user edit modal', async ({ adminPage }) => {
    await adminPage.waitForTimeout(1000);
    const userCard = adminPage.locator('button').filter({ hasText: /@/ }).first();

    if (await userCard.isVisible()) {
      await userCard.click();
      await adminPage.waitForTimeout(300);

      // Modal opened
      await expect(adminPage.locator('h2:has-text("Edit User")')).toBeVisible();
      await expect(adminPage.locator('label:has-text("First Name")')).toBeVisible();

      // Close modal
      await adminPage.locator('button:has-text("Cancel")').click();
      await adminPage.waitForTimeout(300);
      await expect(adminPage.locator('h2:has-text("Edit User")')).not.toBeVisible();
    }
  });

  test('should show settings panel', async ({ adminPage }) => {
    const settingsBtn = adminPage.locator('button').filter({ has: adminPage.locator('svg') }).nth(1);
    await settingsBtn.click();
    await adminPage.waitForTimeout(300);

    await expect(adminPage.locator('text=App Settings')).toBeVisible();
    await expect(adminPage.locator('text=Remove Comments from Posts')).toBeVisible();
  });
});
