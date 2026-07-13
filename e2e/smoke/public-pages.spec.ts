import { test, expect } from '@playwright/test';

// Public pages to smoke-test
const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/blog',
  '/careers',
  '/contact',
  '/services',
  '/projects',
  '/industries',
  '/support',
  '/system',
  '/terms-and-conditions',
  '/privacy-policy',
  '/forgot-password',
  '/verify-otp',
  '/reset-password',
];

for (const route of PUBLIC_ROUTES) {
  test(`${route} loads with 200 and no console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const response = await page.goto(route, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);

    // Page should have a body with content
    const body = await page.locator('body');
    await expect(body).toBeVisible();

    // No uncaught console errors
    expect(errors).toEqual([]);
  });
}