import { test, expect } from '@playwright/test';

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

// Test that key pages render correctly on all viewports
const PAGES_TO_TEST = ['/', '/about', '/contact', '/services', '/careers'];

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  for (const pagePath of PAGES_TO_TEST) {
    test(`${name} ${pagePath} renders correctly`, async ({ browserName }) => {
      // Screenshots are chromium-only for speed
      test.skip(browserName !== 'chromium', 'visual tests only on chromium');
      const page = await test.browser.newContext({
        viewport,
        screen: { width: viewport.width, height: viewport.height },
      }).then((ctx) => ctx.newPage());

      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.goto(pagePath, { waitUntil: 'networkidle' });
      await expect(page.locator('body')).toBeVisible();

      // Take full-page screenshot
      await page.screenshot({
        path: `e2e/artifacts/screenshots/${name}-${pagePath.replace(/\//g, '_')}.png`,
        fullPage: true,
      });

      await page.close();
      expect(errors).toEqual([]);
    });
  }
}