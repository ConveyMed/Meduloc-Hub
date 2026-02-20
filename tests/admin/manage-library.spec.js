// @ts-check
// Tests for Admin - Manage Library
// Each test creates AND deletes its own data

const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');
const { TEST_PREFIX } = require('../fixtures/test-data');

test.describe('Admin - Manage Library', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/manage-library');
    await waitForPageLoad(adminPage);
  });

  test('should display manage library page', async ({ adminPage }) => {
    await expect(adminPage).toHaveURL(/\/manage-library/);
    const header = adminPage.locator('h1').first();
    await expect(header).toContainText(/library/i);
  });

  test('should have Add Category button', async ({ adminPage }) => {
    await expect(adminPage.locator('button:has-text("Add Category")')).toBeVisible();
  });

  test('should have Add Content to Multiple Categories button', async ({ adminPage }) => {
    await expect(adminPage.locator('button:has-text("Add Content to Multiple Categories")')).toBeVisible();
  });

  test('should create and delete a category', async ({ adminPage }) => {
    const categoryName = `${TEST_PREFIX} Cat ${Date.now()}`;

    // Create category
    await adminPage.locator('button:has-text("Add Category")').first().click();
    await adminPage.waitForTimeout(500);
    await adminPage.locator('input[type="text"]').first().fill(categoryName);
    await adminPage.locator('button:has-text("Add Category")').last().click();
    await adminPage.waitForTimeout(1500);

    // Verify created
    await expect(adminPage.locator(`text=${categoryName}`)).toBeVisible({ timeout: 5000 });

    // Delete category
    const categoryHeader = adminPage.locator(`h3:has-text("${categoryName}")`).locator('..');
    const deleteButton = categoryHeader.locator('..').locator('button').nth(1);
    await deleteButton.click();
    await adminPage.waitForTimeout(300);
    await adminPage.locator('button:has-text("Delete Category")').click();
    await adminPage.waitForTimeout(500);

    // Verify deleted
    await expect(adminPage.locator(`text=${categoryName}`)).not.toBeVisible();
  });

  test('should create category, add content, delete both', async ({ adminPage }) => {
    const categoryName = `${TEST_PREFIX} ContentCat ${Date.now()}`;
    const contentTitle = `${TEST_PREFIX} Item ${Date.now()}`;

    // Create category
    await adminPage.locator('button:has-text("Add Category")').first().click();
    await adminPage.waitForTimeout(500);
    await adminPage.locator('input[type="text"]').first().fill(categoryName);
    await adminPage.locator('button:has-text("Add Category")').last().click();
    await adminPage.waitForTimeout(1500);

    // Expand category
    await adminPage.locator(`h3:has-text("${categoryName}")`).click();
    await adminPage.waitForTimeout(500);

    // Add content
    const addContentBtn = adminPage.locator('button').filter({ hasText: /^Add Content$/ }).first();
    await expect(addContentBtn).toBeVisible();
    await addContentBtn.click();
    await adminPage.waitForTimeout(500);
    await adminPage.locator('input[type="text"]').first().fill(contentTitle);
    await adminPage.locator('button').filter({ hasText: /^Add Content$/ }).last().click();
    await adminPage.waitForTimeout(1500);

    // Verify content created
    const contentElement = adminPage.locator(`text=${contentTitle}`);
    await expect(contentElement).toBeVisible({ timeout: 5000 });

    // Delete content
    const contentCard = contentElement.locator('xpath=ancestor::div[2]');
    await contentCard.locator('button').last().click();
    await adminPage.waitForTimeout(300);
    await adminPage.locator('button:has-text("Delete")').click();
    await adminPage.waitForTimeout(500);

    // Verify content deleted
    await expect(contentElement).not.toBeVisible({ timeout: 5000 });

    // Delete category
    const catHeader = adminPage.locator(`h3:has-text("${categoryName}")`).locator('..');
    const catDeleteBtn = catHeader.locator('..').locator('button').nth(1);
    await catDeleteBtn.click();
    await adminPage.waitForTimeout(300);
    await adminPage.locator('button:has-text("Delete Category")').click();
  });
});
