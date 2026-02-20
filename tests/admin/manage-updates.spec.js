// @ts-check
// Tests for Admin - Manage Updates/Events
// Each test creates AND deletes its own data

const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');
const { TEST_PREFIX } = require('../fixtures/test-data');

test.describe('Admin - Manage Updates/Events', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/manage-updates');
    await waitForPageLoad(adminPage);
  });

  test('should display page with Updates and Events tabs', async ({ adminPage }) => {
    await expect(adminPage).toHaveURL(/\/manage-updates/);
    await expect(adminPage.locator('button:has-text("Updates")')).toBeVisible();
    await expect(adminPage.locator('button:has-text("Events")')).toBeVisible();
  });

  test('should switch between Updates and Events tabs', async ({ adminPage }) => {
    // Updates tab
    await adminPage.locator('button:has-text("Updates")').first().click();
    await adminPage.waitForTimeout(300);
    await expect(adminPage.locator('button:has-text("Create Update")')).toBeVisible();

    // Events tab
    await adminPage.locator('button:has-text("Events")').first().click();
    await adminPage.waitForTimeout(300);
    await expect(adminPage.locator('button:has-text("Create Event")')).toBeVisible();
  });

  test('should create and delete an update', async ({ adminPage }) => {
    const title = `${TEST_PREFIX} Update ${Date.now()}`;

    // Create
    await adminPage.locator('button:has-text("Updates")').first().click();
    await adminPage.waitForTimeout(300);
    await adminPage.locator('button:has-text("Create Update")').click();
    await adminPage.waitForTimeout(500);
    await adminPage.locator('input[type="text"]').first().fill(title);
    await adminPage.locator('button:has-text("Create")').last().click();
    await adminPage.waitForTimeout(1500);

    // Verify created
    const titleElement = adminPage.locator(`h3:has-text("${title}")`);
    await expect(titleElement).toBeVisible({ timeout: 5000 });

    // Delete
    const card = titleElement.locator('xpath=ancestor::div[1]');
    await card.locator('button').last().click();
    await adminPage.waitForTimeout(300);
    await adminPage.locator('button:has-text("Delete")').last().click();
    await adminPage.waitForTimeout(500);

    // Verify deleted
    await expect(titleElement).not.toBeVisible();
  });

  test('should create and delete an event', async ({ adminPage }) => {
    const title = `${TEST_PREFIX} Event ${Date.now()}`;

    // Create
    await adminPage.locator('button:has-text("Events")').first().click();
    await adminPage.waitForTimeout(300);
    await adminPage.locator('button:has-text("Create Event")').click();
    await adminPage.waitForTimeout(500);
    await adminPage.locator('input[type="text"]').first().fill(title);
    await adminPage.locator('button:has-text("Create")').last().click();
    await adminPage.waitForTimeout(1500);

    // Verify created
    const titleElement = adminPage.locator(`h3:has-text("${title}")`);
    await expect(titleElement).toBeVisible({ timeout: 5000 });

    // Delete
    const card = titleElement.locator('xpath=ancestor::div[1]');
    await card.locator('button').last().click();
    await adminPage.waitForTimeout(300);
    await adminPage.locator('button:has-text("Delete")').last().click();
    await adminPage.waitForTimeout(500);

    // Verify deleted
    await expect(titleElement).not.toBeVisible();
  });
});
