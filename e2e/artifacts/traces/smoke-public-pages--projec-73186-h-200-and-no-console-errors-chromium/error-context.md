# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke/public-pages.spec.ts >> /projects loads with 200 and no console errors
- Location: e2e/smoke/public-pages.spec.ts:23:7

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 6

- Array []
+ Array [
+   "Failed to load resource: the server responded with a status of 500 ()",
+   "Failed to load resource: the server responded with a status of 500 ()",
+   "Failed to load resource: the server responded with a status of 500 ()",
+   "Failed to load resource: the server responded with a status of 500 ()",
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner "Company contact information" [ref=e2]:
    - generic [ref=e3]:
      - 'link "Open location on Google Maps: Bandar Seri Begawan, Brunei" [ref=e5] [cursor=pointer]':
        - /url: https://www.google.com/maps/search/Bandar+Seri+Begawan,+Brunei
        - img [ref=e6]
        - generic [ref=e9]: Bandar Seri Begawan, Brunei
      - link "Send email to info@mohdhms.com" [ref=e11] [cursor=pointer]:
        - /url: mailto:info@mohdhms.com
        - img [ref=e12]
        - generic [ref=e15]: info@mohdhms.com
      - 'link "Call 24/7 Emergency Hotline: +673 999 9999" [ref=e17] [cursor=pointer]':
        - /url: tel:+6739999999
        - img [ref=e18]
        - generic [ref=e20]: "24/7 Emergency: +673 999 9999"
  - banner [ref=e21]:
    - generic [ref=e22]:
      - link "MOHD.HMS Enterprise" [ref=e23] [cursor=pointer]:
        - /url: "#home"
        - img [ref=e25]
        - generic [ref=e26]:
          - text: MOHD.HMS
          - text: Enterprise
      - navigation "Primary" [ref=e27]:
        - link "Home" [ref=e28] [cursor=pointer]:
          - /url: "#home"
        - link "About" [ref=e29] [cursor=pointer]:
          - /url: "#about"
        - link "Services" [ref=e30] [cursor=pointer]:
          - /url: "#services"
        - link "Industries" [ref=e31] [cursor=pointer]:
          - /url: "#industries"
        - link "Projects" [ref=e32] [cursor=pointer]:
          - /url: "#projects"
        - link "System" [ref=e33] [cursor=pointer]:
          - /url: "#overview"
        - link "Careers" [ref=e34] [cursor=pointer]:
          - /url: "#careers"
        - link "Blog" [ref=e35] [cursor=pointer]:
          - /url: "#blog"
        - link "Contact" [ref=e36] [cursor=pointer]:
          - /url: "#contact"
      - link "Sign in" [ref=e38] [cursor=pointer]:
        - /url: "#"
  - main [ref=e40]:
    - generic [ref=e42]:
      - generic [ref=e43]:
        - generic [ref=e45]: 06 — Projects
        - heading "Work delivered across the region." [level=2] [ref=e47]
      - generic [ref=e48]:
        - button "All" [ref=e49] [cursor=pointer]
        - button "HVAC" [ref=e50] [cursor=pointer]
        - button "Electrical" [ref=e51] [cursor=pointer]
        - button "Fire" [ref=e52] [cursor=pointer]
        - button "Civil" [ref=e53] [cursor=pointer]
      - generic [ref=e54]:
        - article [ref=e55]:
          - generic [ref=e56]:
            - generic [ref=e57]: HVAC
            - generic [ref=e58]: Completed
            - generic [ref=e59]:
              - img [ref=e61]
              - img "Air handling unit" [ref=e65]
          - heading "Hospital HVAC overhaul" [level=4] [ref=e66]
          - generic [ref=e67]: Air-handling unit & ductwork upgrade
          - generic [ref=e68]:
            - generic [ref=e69]: HVAC
            - generic [ref=e70]: 9 months
        - article [ref=e71]:
          - generic [ref=e72]:
            - generic [ref=e73]: Electrical
            - generic [ref=e74]: Completed
            - generic [ref=e75]:
              - img [ref=e77]
              - img "Electrical multimeter testing" [ref=e81]
          - heading "Mall electrical upgrade" [level=4] [ref=e82]
          - generic [ref=e83]: LV distribution & panel testing
          - generic [ref=e84]:
            - generic [ref=e85]: Electrical
            - generic [ref=e86]: 5 months
        - article [ref=e87]:
          - generic [ref=e88]:
            - generic [ref=e89]: Fire
            - generic [ref=e90]: Ongoing
            - img [ref=e93]
          - heading "Data centre fire system" [level=4] [ref=e97]
          - generic [ref=e98]: Suppression & detection install
          - generic [ref=e99]:
            - generic [ref=e100]: Fire
            - generic [ref=e101]: ongoing
        - article [ref=e102]:
          - generic [ref=e103]:
            - generic [ref=e104]: AMC
            - generic [ref=e105]: Ongoing
            - img [ref=e108]
          - heading "Factory PPM contract" [level=4] [ref=e112]
          - generic [ref=e113]: Plant-wide preventive maintenance
          - generic [ref=e114]:
            - generic [ref=e115]: AMC
            - generic [ref=e116]: ongoing
        - article [ref=e117]:
          - generic [ref=e118]:
            - generic [ref=e119]: Civil
            - generic [ref=e120]: Completed
            - img [ref=e123]
          - heading "Office facade refit" [level=4] [ref=e127]
          - generic [ref=e128]: Civil & waterproofing works
          - generic [ref=e129]:
            - generic [ref=e130]: Civil
            - generic [ref=e131]: 7 months
        - article [ref=e132]:
          - generic [ref=e133]:
            - generic [ref=e134]: Generator
            - generic [ref=e135]: Completed
            - img [ref=e138]
          - heading "University generator" [level=4] [ref=e142]
          - generic [ref=e143]: Standby power & ATS install
          - generic [ref=e144]:
            - generic [ref=e145]: Generator
            - generic [ref=e146]: 4 months
      - generic [ref=e147]:
        - generic [ref=e148]:
          - generic [ref=e149]: 500+
          - generic [ref=e150]: Projects completed
        - generic [ref=e151]:
          - generic [ref=e152]: "38"
          - generic [ref=e153]: Active contracts
        - generic [ref=e154]:
          - generic [ref=e155]: 1,200+
          - generic [ref=e156]: Assets serviced
        - generic [ref=e157]:
          - generic [ref=e158]: 99%
          - generic [ref=e159]: On-time delivery
  - contentinfo [ref=e160]:
    - generic: MOHD.HMS
    - generic [ref=e161]:
      - generic [ref=e162]:
        - generic [ref=e163]:
          - generic [ref=e164]:
            - img [ref=e166]
            - generic [ref=e167]:
              - text: MOHD.HMS
              - text: Enterprise
          - paragraph [ref=e168]: Facility maintenance and engineering services — keeping your assets safe, compliant and running.
          - generic [ref=e169]:
            - generic [ref=e170]:
              - img [ref=e171]
              - text: Bandar Seri Begawan, Brunei
            - generic [ref=e174]:
              - img [ref=e175]
              - text: +673 000 0000
            - generic [ref=e177]:
              - img [ref=e178]
              - text: info@mohdhms.com
        - generic [ref=e181]:
          - heading "Services" [level=5] [ref=e182]
          - link "HVAC maintenance" [ref=e183] [cursor=pointer]:
            - /url: "#services"
          - link "Electrical" [ref=e184] [cursor=pointer]:
            - /url: "#services"
          - link "Fire protection" [ref=e185] [cursor=pointer]:
            - /url: "#services"
          - link "Preventive" [ref=e186] [cursor=pointer]:
            - /url: "#services"
          - link "Emergency" [ref=e187] [cursor=pointer]:
            - /url: "#services"
        - generic [ref=e188]:
          - heading "Company" [level=5] [ref=e189]
          - link "About us" [ref=e190] [cursor=pointer]:
            - /url: "#about"
          - link "Projects" [ref=e191] [cursor=pointer]:
            - /url: "#projects"
          - link "Industries" [ref=e192] [cursor=pointer]:
            - /url: "#industries"
          - link "Careers" [ref=e193] [cursor=pointer]:
            - /url: "#careers"
          - link "Blog" [ref=e194] [cursor=pointer]:
            - /url: "#blog"
        - generic [ref=e195]:
          - heading "Clients" [level=5] [ref=e196]
          - link "Sign in" [ref=e197] [cursor=pointer]:
            - /url: "#"
          - link "System overview" [ref=e198] [cursor=pointer]:
            - /url: "#overview"
          - link "Projects" [ref=e199] [cursor=pointer]:
            - /url: "#projects"
          - link "Contact" [ref=e200] [cursor=pointer]:
            - /url: "#contact"
        - generic [ref=e201]:
          - heading "Legal" [level=5] [ref=e202]
          - link "Privacy policy" [ref=e203] [cursor=pointer]:
            - /url: "#"
          - link "Terms & conditions" [ref=e204] [cursor=pointer]:
            - /url: "#"
          - link "HSE policy" [ref=e205] [cursor=pointer]:
            - /url: "#"
      - generic [ref=e206]:
        - generic [ref=e207]: © 2026 MOHD.HMS ENTERPRISE. All rights reserved.
        - generic [ref=e208]:
          - link "LinkedIn" [ref=e209] [cursor=pointer]:
            - /url: "#"
            - img [ref=e210]
          - link "Facebook" [ref=e212] [cursor=pointer]:
            - /url: "#"
            - img [ref=e213]
          - link "Instagram" [ref=e215] [cursor=pointer]:
            - /url: "#"
            - img [ref=e216]
  - generic [ref=e220]:
    - button "Scroll to top":
      - img
    - link "Emergency" [ref=e221] [cursor=pointer]:
      - /url: tel:+6739999999
      - generic: 24/7 emergency
      - img [ref=e222]
    - link "Call" [ref=e224] [cursor=pointer]:
      - /url: tel:+6730000000
      - generic: Call us
      - img [ref=e225]
    - link "WhatsApp" [ref=e227] [cursor=pointer]:
      - /url: "#"
      - generic: WhatsApp
      - img [ref=e228]
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e235] [cursor=pointer]:
    - img [ref=e236]
  - alert [ref=e239]
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
  29 |     const response = await page.goto(route, { waitUntil: 'networkidle' });
  30 |     expect(response?.status()).toBe(200);
  31 | 
  32 |     // Page should have a body with content
  33 |     const body = await page.locator('body');
  34 |     await expect(body).toBeVisible();
  35 | 
  36 |     // No uncaught console errors
> 37 |     expect(errors).toEqual([]);
     |                    ^ Error: expect(received).toEqual(expected) // deep equality
  38 |   });
  39 | }
```