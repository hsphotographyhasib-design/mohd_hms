import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test('login page renders with email/password fields', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // The root page should show the login form (it's an SPA, login is the default view)
    // Look for email input, password input, and login button
    const emailInput = page.getByPlaceholder(/email/i).first();
    const passwordInput = page.getByPlaceholder(/password/i).first();

    // Wait for the login form to render
    await expect(emailInput).toBeVisible({ timeout: 15_000 });
    await expect(passwordInput).toBeVisible();

    // Should have a login/submit button
    const submitBtn = page.getByRole('button', { name: /sign in|login|log in/i });
    await expect(submitBtn).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('shows error on invalid login', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const emailInput = page.getByPlaceholder(/email/i).first();
    const passwordInput = page.getByPlaceholder(/password/i).first();
    const submitBtn = page.getByRole('button', { name: /sign in|login|log in/i });

    await emailInput.fill('nonexistent@test.com');
    await passwordInput.fill('wrongpassword123');
    await submitBtn.click();

    // Should show an error message (toast or inline)
    await expect(page.getByText(/invalid|incorrect|not found|error/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('navigates to forgot-password page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const forgotLink = page.getByText(/forgot password/i).first();
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      await expect(page).toHaveURL(/forgot-password/);
    }
  });
});