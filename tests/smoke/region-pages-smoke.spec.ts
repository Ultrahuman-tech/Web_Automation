import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL =
  process.env.SMOKE_BASE_URL ??
  'https://www.ultrahuman.com';

const REGIONS = ['us', 'in', 'ae'] as const;

// ---------------------------------------------------------------------------
// Page definitions
// ---------------------------------------------------------------------------

interface PageEntry {
  path: string;
  name: string;
}

/** Section 1 -- Product Landing Pages (tested across all 3 regions) */
const PRODUCT_PAGES: PageEntry[] = [
  { path: '/',                            name: 'Homepage' },
  { path: '/ring/',                       name: 'Ring AIR landing' },
  { path: '/ring/buy/',                   name: 'Ring buy page' },
  { path: '/ring/faq/',                   name: 'Ring FAQ' },
  { path: '/ring/reviews/',               name: 'Ring reviews' },
  { path: '/home/',                       name: 'Home device landing' },
  { path: '/home/buy/',                   name: 'Home buy' },
  { path: '/m1/',                         name: 'M1 CGM landing' },
  { path: '/pricing/',                    name: 'CGM pricing' },
  { path: '/blood-vision/',               name: 'Blood Vision landing' },
  { path: '/blood-vision/buy/',           name: 'Blood Vision buy' },
  { path: '/blood-vision/faq/',           name: 'Blood Vision FAQ' },
  { path: '/rare/',                       name: 'Rare landing' },
  { path: '/rare/buy/',                   name: 'Rare buy' },
  { path: '/diesel-ultrahuman-ring/',     name: 'Diesel Ring landing' },
  { path: '/diesel-ultrahuman-ring/buy/', name: 'Diesel Ring buy' },
  { path: '/x/',                          name: 'Membership' },
  { path: '/shop/',                       name: 'Shop' },
  { path: '/powerplugs/',                 name: 'PowerPlugs' },
];

/** Section 2 -- Health & Marketing Pages (tested with "us" region only) */
const HEALTH_MARKETING_PAGES: PageEntry[] = [
  { path: '/womens-health/',              name: "Women's Health" },
  { path: '/hsa-fsa/',                    name: 'HSA / FSA' },
  //{ path: '/coaches/',                    name: 'Coaches' },
  //{ path: '/reviews/',                    name: 'Reviews' },
  { path: '/heroes/',                     name: 'Heroes' },
  { path: '/partners/',                   name: 'Partners' },
  { path: '/retail/',                     name: 'Retail' },
  { path: '/for-work/',                   name: 'For Work' },
  { path: '/one-tree-planted/',           name: 'One Tree Planted' },
  { path: '/environment/',                name: 'Environment' },
  { path: '/troubleshoot/',               name: 'Troubleshoot' },
  { path: '/ultrasignal/',                name: 'UltraSignal' },
  { path: '/window-of-opportunity/',      name: 'Window of Opportunity' },
  { path: '/ultrahuman-x-clue/',          name: 'Ultrahuman x Clue' },
  { path: '/print-sizing-kit/',           name: 'Print Sizing Kit' },
];

/** Section 3 -- Non-Region Pages (no region prefix) */
const NON_REGION_PAGES: PageEntry[] = [
  { path: '/choose-country-region/',              name: 'Choose Country / Region' },
  { path: '/gift-card/claim/',                    name: 'Gift Card Claim' },
  { path: '/ogdb/',                               name: 'OGDB' },
  { path: '/ogdb/search/',                        name: 'OGDB Search' },
  { path: '/forms/heroes-special-pricing/',       name: 'Heroes Special Pricing Form' },
  { path: '/forms/metabolic-health-assessment/',  name: 'Metabolic Health Assessment Form' },
  { path: '/404/',                                name: '404 page' },
  { path: '/500/',                                name: '500 page' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a fully-qualified URL.
 * For region pages the format is `/{region}{pagePath}`.
 * For non-region pages the path is used as-is.
 */
function buildUrl(pagePath: string, region?: string): string {
  if (region) {
    return `${BASE_URL}/${region}${pagePath}`;
  }
  return `${BASE_URL}${pagePath}`;
}

// ---------------------------------------------------------------------------
// Section 1 -- Product Landing Pages (us, in, ae)
// ---------------------------------------------------------------------------

test.describe('Section 1: Product Landing Pages', () => {
  test.describe.configure({ mode: 'parallel' });

  for (const region of REGIONS) {
    test.describe(`Region: ${region}`, () => {
      for (const page of PRODUCT_PAGES) {
        test(`[${region}] ${page.name} -- ${page.path}`, async ({ page: pw }) => {
          test.setTimeout(60_000);

          const url = buildUrl(page.path, region);
          console.log(`Navigating to: ${url}`);

          const response = await pw.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
          });

          // --- Status code ---
          expect(
            response?.status(),
            `Expected 200 OK for ${url} but got ${response?.status()}`
          ).toBe(200);

          // --- Page title ---
          const title = await pw.title();
          expect(title, `Page title should be truthy for ${url}`).toBeTruthy();

          // --- Body has visible content ---
          const bodyText = await pw.locator('body').textContent();
          expect(
            (bodyText ?? '').length,
            `Body text should have content for ${url}`
          ).toBeGreaterThan(0);

          // --- At least one heading element visible ---
          const headingLocator = pw.locator('h1, h2');
          const headingCount = await headingLocator.count();
          expect(
            headingCount,
            `Expected at least one h1 or h2 heading on ${url}`
          ).toBeGreaterThan(0);

          // First heading should eventually become visible
          await expect(
            headingLocator.first()
          ).toBeVisible({ timeout: 15_000 });

          console.log(
            `[PASS] [${region}] ${page.name} | title="${title}" | headings=${headingCount}`
          );
        });
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Section 2 -- Health & Marketing Pages (us only)
// ---------------------------------------------------------------------------

test.describe('Section 2: Health & Marketing Pages (us)', () => {
  test.describe.configure({ mode: 'parallel' });

  const region = 'us';

  for (const page of HEALTH_MARKETING_PAGES) {
    test(`[${region}] ${page.name} -- ${page.path}`, async ({ page: pw }) => {
      test.setTimeout(60_000);

      const url = buildUrl(page.path, region);
      console.log(`Navigating to: ${url}`);

      const response = await pw.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // --- Status code ---
      expect(
        response?.status(),
        `Expected 200 OK for ${url} but got ${response?.status()}`
      ).toBe(200);

      // --- Page title ---
      const title = await pw.title();
      expect(title, `Page title should be truthy for ${url}`).toBeTruthy();

      // --- Body has visible content ---
      const bodyText = await pw.locator('body').textContent();
      expect(
        (bodyText ?? '').length,
        `Body text should have content for ${url}`
      ).toBeGreaterThan(0);

      console.log(`[PASS] [${region}] ${page.name} | title="${title}"`);
    });
  }
});

// ---------------------------------------------------------------------------
// Section 3 -- Non-Region Pages
// ---------------------------------------------------------------------------

test.describe('Section 3: Non-Region Pages', () => {
  test.describe.configure({ mode: 'parallel' });

  for (const page of NON_REGION_PAGES) {
    test(`${page.name} -- ${page.path}`, async ({ page: pw }) => {
      test.setTimeout(60_000);

      const url = buildUrl(page.path);
      console.log(`Navigating to: ${url}`);

      const response = await pw.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // For error pages (404 / 500) we accept non-200 status codes
      const isErrorPage = page.path === '/404/' || page.path === '/500/';

      if (!isErrorPage) {
        expect(
          response?.status(),
          `Expected 200 OK for ${url} but got ${response?.status()}`
        ).toBe(200);
      }

      // --- Page title ---
      const title = await pw.title();
      expect(title, `Page title should be truthy for ${url}`).toBeTruthy();

      // --- Body has visible content ---
      const bodyText = await pw.locator('body').textContent();
      expect(
        (bodyText ?? '').length,
        `Body text should have content for ${url}`
      ).toBeGreaterThan(0);

      console.log(`[PASS] ${page.name} | title="${title}" | status=${response?.status()}`);
    });
  }
});

// ---------------------------------------------------------------------------
// Section 4 -- Error Pages (nonexistent path per region)
// ---------------------------------------------------------------------------

test.describe('Section 4: Error Pages (nonexistent path)', () => {
  test.describe.configure({ mode: 'parallel' });

  for (const region of REGIONS) {
    test(`[${region}] Nonexistent page returns 404 or error`, async ({ page: pw }) => {
      test.setTimeout(60_000);

      const path = '/nonexistent-page-xyz/';
      const url = buildUrl(path, region);
      console.log(`Navigating to: ${url}`);

      const response = await pw.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      const status = response?.status() ?? 0;

      // We expect either a client-side 404, a server 404, or a soft-404 (200 with error content).
      // Accept 404 or 200 (soft 404 pages that render an error message in the body).
      expect(
        [200, 404].includes(status),
        `Expected status 200 or 404 for nonexistent page ${url} but got ${status}`
      ).toBe(true);

      // --- Page title ---
      const title = await pw.title();
      expect(title, `Page title should be truthy for ${url}`).toBeTruthy();

      // --- Body has content (even the error page should render something) ---
      const bodyText = await pw.locator('body').textContent();
      expect(
        (bodyText ?? '').length,
        `Body text should have content for ${url}`
      ).toBeGreaterThan(0);

      console.log(
        `[PASS] [${region}] Nonexistent page | status=${status} | title="${title}"`
      );
    });
  }
});
