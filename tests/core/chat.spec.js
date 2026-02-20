// @ts-check
// Tests for Chat / Messages (user view)
// No data creation - only reads

const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');

test.describe('Chat / Messages', () => {
  test('should display chat page', async ({ userPage }) => {
    await userPage.goto('/chat');
    await waitForPageLoad(userPage);
    await expect(userPage).toHaveURL(/\/chat/);
  });

  test('should show Messages header', async ({ userPage }) => {
    await userPage.goto('/chat');
    await waitForPageLoad(userPage);

    const header = userPage.locator('h1').first();
    await expect(header).toContainText(/messages/i);
  });

  test('should show chat list or empty state', async ({ userPage }) => {
    await userPage.goto('/chat');
    await waitForPageLoad(userPage);

    // Should have chats or empty message
    const content = userPage.locator('text=/chat|conversation|no messages|start/i');
    await expect(content.first()).toBeVisible({ timeout: 5000 });
  });
});
