// @ts-check
// Tests for Posts - Create via (+) button (Admin only)
// Each test creates AND deletes its own post

const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');
const { TEST_PREFIX } = require('../fixtures/test-data');

test.describe('Posts - Create and Delete (Admin)', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/home');
    await waitForPageLoad(adminPage);
  });

  // Helper to delete a post we just created
  async function deletePost(page, postContent) {
    // Find the post with our content
    const post = page.locator(`text=${postContent}`).locator('xpath=ancestor::article[1]').first();

    if (await post.isVisible({ timeout: 3000 })) {
      // Click the menu button (3 dots)
      const menuBtn = post.locator('button').filter({ has: page.locator('svg') }).last();
      await menuBtn.click();
      await page.waitForTimeout(300);

      // Click Delete
      await page.locator('text=Delete').click();
      await page.waitForTimeout(300);

      // Confirm delete
      await page.locator('button:has-text("Delete")').last().click();
      await page.waitForTimeout(500);
    }
  }

  test('should open create post modal from + button', async ({ adminPage }) => {
    // Click the + button in bottom nav
    const plusBtn = adminPage.locator('nav button').filter({ has: adminPage.locator('svg') }).first();
    await plusBtn.click();
    await adminPage.waitForTimeout(500);

    // Modal should open with "Create Post" title
    await expect(adminPage.locator('h2:has-text("Create Post")')).toBeVisible();

    // Should have Post button
    await expect(adminPage.locator('button:has-text("Post")')).toBeVisible();

    // Should have Photo, Video, Link buttons
    await expect(adminPage.locator('button:has-text("Photo")')).toBeVisible();
    await expect(adminPage.locator('button:has-text("Video")')).toBeVisible();
    await expect(adminPage.locator('button:has-text("Link")')).toBeVisible();

    // Should have notify options
    await expect(adminPage.locator('text=Notify members')).toBeVisible();
    await expect(adminPage.locator('text=Push')).toBeVisible();
    await expect(adminPage.locator('text=Email')).toBeVisible();

    // Should have schedule option
    await expect(adminPage.locator('text=Schedule')).toBeVisible();

    // Close modal
    const closeBtn = adminPage.locator('button').filter({ has: adminPage.locator('svg') }).first();
    await closeBtn.click();
  });

  test('should create and delete a simple text post', async ({ adminPage }) => {
    const postContent = `${TEST_PREFIX} Simple post ${Date.now()}`;

    // Open create modal
    const plusBtn = adminPage.locator('nav button').filter({ has: adminPage.locator('svg') }).first();
    await plusBtn.click();
    await adminPage.waitForTimeout(500);

    // Type content
    await adminPage.locator('textarea[placeholder*="mind"]').fill(postContent);

    // Click Post
    await adminPage.locator('button:has-text("Post")').click();
    await adminPage.waitForTimeout(2000);

    // Verify post appears in feed
    await expect(adminPage.locator(`text=${postContent}`)).toBeVisible({ timeout: 5000 });

    // Delete the post
    await deletePost(adminPage, postContent);

    // Verify deleted
    await expect(adminPage.locator(`text=${postContent}`)).not.toBeVisible({ timeout: 5000 });
  });

  test('should create and delete post with Push notification enabled', async ({ adminPage }) => {
    const postContent = `${TEST_PREFIX} Push post ${Date.now()}`;

    // Open create modal
    const plusBtn = adminPage.locator('nav button').filter({ has: adminPage.locator('svg') }).first();
    await plusBtn.click();
    await adminPage.waitForTimeout(500);

    // Type content
    await adminPage.locator('textarea[placeholder*="mind"]').fill(postContent);

    // Enable Push notification
    await adminPage.locator('button:has-text("Push")').click();
    await adminPage.waitForTimeout(200);

    // Click Post
    await adminPage.locator('button:has-text("Post")').click();
    await adminPage.waitForTimeout(2000);

    // Verify post appears
    await expect(adminPage.locator(`text=${postContent}`)).toBeVisible({ timeout: 5000 });

    // Delete the post
    await deletePost(adminPage, postContent);
  });

  test('should create and delete post with Email notification enabled', async ({ adminPage }) => {
    const postContent = `${TEST_PREFIX} Email post ${Date.now()}`;

    // Open create modal
    const plusBtn = adminPage.locator('nav button').filter({ has: adminPage.locator('svg') }).first();
    await plusBtn.click();
    await adminPage.waitForTimeout(500);

    // Type content
    await adminPage.locator('textarea[placeholder*="mind"]').fill(postContent);

    // Enable Email notification
    await adminPage.locator('button:has-text("Email")').click();
    await adminPage.waitForTimeout(200);

    // Click Post
    await adminPage.locator('button:has-text("Post")').click();
    await adminPage.waitForTimeout(2000);

    // Verify post appears
    await expect(adminPage.locator(`text=${postContent}`)).toBeVisible({ timeout: 5000 });

    // Delete the post
    await deletePost(adminPage, postContent);
  });

  test('should create and delete post with both Push and Email enabled', async ({ adminPage }) => {
    const postContent = `${TEST_PREFIX} Both notif ${Date.now()}`;

    // Open create modal
    const plusBtn = adminPage.locator('nav button').filter({ has: adminPage.locator('svg') }).first();
    await plusBtn.click();
    await adminPage.waitForTimeout(500);

    // Type content
    await adminPage.locator('textarea[placeholder*="mind"]').fill(postContent);

    // Enable both notifications
    await adminPage.locator('button:has-text("Push")').click();
    await adminPage.waitForTimeout(200);
    await adminPage.locator('button:has-text("Email")').click();
    await adminPage.waitForTimeout(200);

    // Click Post
    await adminPage.locator('button:has-text("Post")').click();
    await adminPage.waitForTimeout(2000);

    // Verify post appears
    await expect(adminPage.locator(`text=${postContent}`)).toBeVisible({ timeout: 5000 });

    // Delete the post
    await deletePost(adminPage, postContent);
  });

  test('should create and delete post with a link', async ({ adminPage }) => {
    const postContent = `${TEST_PREFIX} Link post ${Date.now()}`;
    const linkName = 'Test Link';
    const linkUrl = 'https://example.com';

    // Open create modal
    const plusBtn = adminPage.locator('nav button').filter({ has: adminPage.locator('svg') }).first();
    await plusBtn.click();
    await adminPage.waitForTimeout(500);

    // Type content
    await adminPage.locator('textarea[placeholder*="mind"]').fill(postContent);

    // Click Link button
    await adminPage.locator('button:has-text("Link")').click();
    await adminPage.waitForTimeout(300);

    // Fill in link details
    await adminPage.locator('input[placeholder*="URL"]').fill(linkUrl);
    await adminPage.locator('input[placeholder*="Name"]').fill(linkName);

    // Add the link
    await adminPage.locator('button:has-text("Add")').click();
    await adminPage.waitForTimeout(300);

    // Verify link was added (shows in the modal)
    await expect(adminPage.locator(`text=${linkName}`)).toBeVisible();

    // Click Post
    await adminPage.locator('button:has-text("Post")').click();
    await adminPage.waitForTimeout(2000);

    // Verify post appears
    await expect(adminPage.locator(`text=${postContent}`)).toBeVisible({ timeout: 5000 });

    // Delete the post
    await deletePost(adminPage, postContent);
  });

  test('should cancel post creation', async ({ adminPage }) => {
    // Open create modal
    const plusBtn = adminPage.locator('nav button').filter({ has: adminPage.locator('svg') }).first();
    await plusBtn.click();
    await adminPage.waitForTimeout(500);

    // Modal should be visible
    await expect(adminPage.locator('h2:has-text("Create Post")')).toBeVisible();

    // Close without typing anything
    const closeBtn = adminPage.locator('button').filter({ has: adminPage.locator('svg') }).first();
    await closeBtn.click();
    await adminPage.waitForTimeout(300);

    // Modal should be closed
    await expect(adminPage.locator('h2:has-text("Create Post")')).not.toBeVisible();
  });

  test('should show discard confirmation when closing with content', async ({ adminPage }) => {
    const postContent = `${TEST_PREFIX} Discard test ${Date.now()}`;

    // Open create modal
    const plusBtn = adminPage.locator('nav button').filter({ has: adminPage.locator('svg') }).first();
    await plusBtn.click();
    await adminPage.waitForTimeout(500);

    // Type some content
    await adminPage.locator('textarea[placeholder*="mind"]').fill(postContent);

    // Try to close - should trigger confirm dialog
    const closeBtn = adminPage.locator('button').filter({ has: adminPage.locator('svg') }).first();

    // Set up dialog handler before clicking
    adminPage.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Discard');
      await dialog.accept();
    });

    await closeBtn.click();
    await adminPage.waitForTimeout(500);

    // Modal should be closed after accepting dialog
    await expect(adminPage.locator('h2:has-text("Create Post")')).not.toBeVisible();
  });
});
