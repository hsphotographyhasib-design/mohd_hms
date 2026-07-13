# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke/public-pages.spec.ts >> /system loads with 200 and no console errors
- Location: e2e/smoke/public-pages.spec.ts:23:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/system
Call log:
  - navigating to "http://localhost:3000/system", waiting until "networkidle"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // Public pages to smoke-test
  4  | const PUBLIC_ROUTES = [
  5  |   '/',
  6  |   '/about',
  7  |   '/blog',
  8  |   '/careers',
  9  |   '/contact',
  10 |   '/services',
  11 |   '/projects',
  12 |   '/industries',
  13 |   '/support',
  14 |   '/system',
  15 |   '/terms-and-conditions',
  16 |   '/privacy-policy',
  17 |   '/forgot-password',
  18 |   '/verify-otp',
  19 |   '/reset-password',
  20 | ];
  21 | 
  22 | for (const route of PUBLIC_ROUTES) {
  23 |   test(`${route} loads with 200 and no console errors`, async ({ page }) => {
  24 |     const errors: string[] = [];
  25 |     page.on('console', (msg) => {
  26 |       if (msg.type() === 'error') errors.push(msg.text());
  27 |     });
  28 | 
> 29 |     const response = await page.goto(route, { waitUntil: 'networkidle' });
     |                                 ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/system
  30 |     expect(response?.status()).toBe(200);
  31 | 
  32 |     // Page should have a body with content
  33 |     const body = await page.locator('body');
  34 |     await expect(body).toBeVisible();
  35 | 
  36 |     // No uncaught console errors
  37 |     expect(errors).toEqual([]);
  38 |   });
  39 | }
```