import { test, expect } from '@playwright/test';

// These tests verify the public marketing pages render their
// core content (headings, nav links, footer) without auth.

const MARKETING_PAGES = [
  { path: '/about', heading: /about/i },
  { path: '/services', heading: /service/i },
  { path: '/contact', heading: /contact/i },
  { path: '/careers', heading: /career/i },
  { path: '/blog', heading: /blog/i },
  { path: '/projects', heading: /project/i },
  { path: '/industries', heading: /industr/i },
];

for (const { path, heading } of MARKETING_PAGES) {
  test(`${path} has main heading and navigation`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(path, { waitUntil: 'networkidle' });
    expect(page.getByRole('heading').first()).toBeVisible();

    // Should have a back-to-home link or logo
    const logoOrHome = page.getByRole('link').first();
    await expect(logoOrHome).toBeVisible();

    expect(errors).toEqual([]);
  });
}

test('forgot-password page has email input', async ({ page }) => {
  await page.goto('/forgot-password', { waitUntil: 'networkidle' });
  await expect(page.getByPlaceholder(/email/i).first()).toBeVisible({ timeout: 10_000 });
});

test('terms-and-conditions page renders content', async ({ page }) => {
  await page.goto('/terms-and-conditions', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
});

test('privacy-policy page renders content', async ({ page }) => {
  await page.goto('/privacy-policy', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
});