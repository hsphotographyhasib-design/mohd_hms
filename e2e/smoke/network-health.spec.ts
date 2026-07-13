import { test, expect } from '@playwright/test';

// Network error monitoring — ensure no 4xx/5xx on happy paths
test.describe('Network health on public pages', () => {
  const ROUTES = ['/', '/about', '/services', '/contact', '/careers', '/blog'];

  for (const route of ROUTES) {
    test(`${route} — no failed network requests`, async ({ page }) => {
      const failedRequests: { url: string; status: number }[] = [];

      page.on('response', (response) => {
        const status = response.status();
        if (status >= 400 && status < 500) {
          // Ignore 404 for assets/fonts that may not exist
          const url = response.url();
          if (!url.includes('.woff') && !url.includes('.ttf') && !url.includes('.svg')) {
            failedRequests.push({ url: response.url(), status });
          }
        }
        if (status >= 500) {
          failedRequests.push({ url: response.url(), status });
        }
      });

      await page.goto(route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000); // let late requests settle

      expect(failedRequests).toEqual([]);
    });
  }
});