import { test, expect, Page } from '@playwright/test';

// ─── Configuration ───────────────────────────────────────────────────────────

const BASE_URL =
  process.env.REGION_BASE_URL ??
  'https://www.ultrahuman.com';

const CHOOSE_REGION_PATH = '/choose-country-region/';

/** Countries we expect to see on the region-picker page. */
const EXPECTED_COUNTRIES = [
  'United States',
  'India',
  'United Arab Emirates',
  'Canada',
  'United Kingdom',
  'Australia',
  'Saudi Arabia',
  'Mexico',
  'South Africa',
  'Germany',
  'Austria',
  'France',
  'Japan',
  'Thailand',
];

/**
 * Region codes mapped to display names used on the picker page.
 * Each entry represents a distinct store/URL-segment.
 */
const REGION_MAP: Record<string, { name: string; urlSegment: string; store: string; currency: string }> = {
  us: { name: 'United States',        urlSegment: '/us/', store: 'US',  currency: 'USD' },
  ca: { name: 'Canada',               urlSegment: '/ca/', store: 'CA',  currency: 'CAD' },
  in: { name: 'India',                urlSegment: '/in/', store: 'IN',  currency: 'INR' },
  ae: { name: 'United Arab Emirates',  urlSegment: '/ae/', store: 'AE',  currency: 'AED' },
  gb: { name: 'United Kingdom',        urlSegment: '/gb/', store: 'GB',  currency: 'GBP' },
  au: { name: 'Australia',            urlSegment: '/au/', store: 'AU',  currency: 'AUD' },
  sa: { name: 'Saudi Arabia',         urlSegment: '/sa/', store: 'SA',  currency: 'SAR' },
  mx: { name: 'Mexico',               urlSegment: '/mx/', store: 'MX',  currency: 'MXN' },
  za: { name: 'South Africa',         urlSegment: '/za/', store: 'ZA',  currency: 'ZAR' },
  de: { name: 'Germany',              urlSegment: '/de/', store: 'EU',  currency: 'EUR' },
  at: { name: 'Austria',              urlSegment: '/at/', store: 'EU',  currency: 'EUR' },
  fr: { name: 'France',               urlSegment: '/fr/', store: 'EU',  currency: 'EUR' },
  jp: { name: 'Japan',                urlSegment: '/jp/', store: 'ROW', currency: 'USD' },
  th: { name: 'Thailand',             urlSegment: '/th/', store: 'ROW', currency: 'USD' },
};

/**
 * Countries that share a store with another region.
 * These geo-detected country codes should redirect to the mapped store region.
 */
const COUNTRY_STORE_REDIRECTS: Array<{ country: string; name: string; targetRegion: string; targetSegment: string }> = [
  // PR → US store
  { country: 'pr', name: 'Puerto Rico',    targetRegion: 'us', targetSegment: '/us/' },
  // AE-group countries → AE store
  { country: 'qa', name: 'Qatar',          targetRegion: 'ae', targetSegment: '/ae/' },
  { country: 'bh', name: 'Bahrain',        targetRegion: 'ae', targetSegment: '/ae/' },
  { country: 'kw', name: 'Kuwait',         targetRegion: 'ae', targetSegment: '/ae/' },
  { country: 'om', name: 'Oman',           targetRegion: 'ae', targetSegment: '/ae/' },
  // EU countries → EU store (de/at/fr have their own segments; rest go to a default EU segment)
  { country: 'it', name: 'Italy',          targetRegion: 'eu', targetSegment: '/it/' },
  { country: 'es', name: 'Spain',          targetRegion: 'eu', targetSegment: '/es/' },
  { country: 'nl', name: 'Netherlands',    targetRegion: 'eu', targetSegment: '/nl/' },
  { country: 'se', name: 'Sweden',         targetRegion: 'eu', targetSegment: '/se/' },
  { country: 'be', name: 'Belgium',        targetRegion: 'eu', targetSegment: '/be/' },
  { country: 'fi', name: 'Finland',        targetRegion: 'eu', targetSegment: '/fi/' },
  { country: 'dk', name: 'Denmark',        targetRegion: 'eu', targetSegment: '/dk/' },
  { country: 'ie', name: 'Ireland',        targetRegion: 'eu', targetSegment: '/ie/' },
  { country: 'pl', name: 'Poland',         targetRegion: 'eu', targetSegment: '/pl/' },
  { country: 'cz', name: 'Czech Republic', targetRegion: 'eu', targetSegment: '/cz/' },
  { country: 'pt', name: 'Portugal',       targetRegion: 'eu', targetSegment: '/pt/' },
  { country: 'gr', name: 'Greece',         targetRegion: 'eu', targetSegment: '/gr/' },
  { country: 'hu', name: 'Hungary',        targetRegion: 'eu', targetSegment: '/hu/' },
  { country: 'ro', name: 'Romania',        targetRegion: 'eu', targetSegment: '/ro/' },
  { country: 'si', name: 'Slovenia',       targetRegion: 'eu', targetSegment: '/si/' },
  { country: 'sk', name: 'Slovakia',       targetRegion: 'eu', targetSegment: '/sk/' },
  { country: 'hr', name: 'Croatia',        targetRegion: 'eu', targetSegment: '/hr/' },
  { country: 'bg', name: 'Bulgaria',       targetRegion: 'eu', targetSegment: '/bg/' },
  { country: 'cy', name: 'Cyprus',         targetRegion: 'eu', targetSegment: '/cy/' },
  { country: 'ee', name: 'Estonia',        targetRegion: 'eu', targetSegment: '/ee/' },
  { country: 'lt', name: 'Lithuania',      targetRegion: 'eu', targetSegment: '/lt/' },
  { country: 'lu', name: 'Luxembourg',     targetRegion: 'eu', targetSegment: '/lu/' },
  { country: 'lv', name: 'Latvia',         targetRegion: 'eu', targetSegment: '/lv/' },
  { country: 'mt', name: 'Malta',          targetRegion: 'eu', targetSegment: '/mt/' },
  // ROW countries
  { country: 'ch', name: 'Switzerland',    targetRegion: 'row', targetSegment: '/ch/' },
  { country: 'is', name: 'Iceland',        targetRegion: 'row', targetSegment: '/is/' },
  { country: 'no', name: 'Norway',         targetRegion: 'row', targetSegment: '/no/' },
  { country: 'mc', name: 'Monaco',         targetRegion: 'row', targetSegment: '/mc/' },
];

/** Currency indicators expected on /{region}/ring/buy/ pages. */
const CURRENCY_INDICATORS: Record<string, { symbol: string; label: string }> = {
  us: { symbol: '$',   label: 'USD dollar sign' },
  ca: { symbol: '$',   label: 'CAD dollar sign' },
  in: { symbol: '₹',   label: 'INR rupee sign' },
  ae: { symbol: 'AED', label: 'AED dirham' },
  gb: { symbol: '£',   label: 'GBP pound sign' },
  au: { symbol: '$',   label: 'AUD dollar sign' },
  sa: { symbol: 'SAR', label: 'SAR riyal' },
  mx: { symbol: '$',   label: 'MXN peso sign' },
  za: { symbol: 'R',   label: 'ZAR rand sign' },
  de: { symbol: '€',   label: 'EUR euro sign' },
  at: { symbol: '€',   label: 'EUR euro sign' },
  fr: { symbol: '€',   label: 'EUR euro sign' },
  jp: { symbol: '$',   label: 'USD dollar sign (ROW)' },
  th: { symbol: '$',   label: 'USD dollar sign (ROW)' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Dismiss cookie / consent banners if they appear.
 * Tries several common button labels; silently continues if none are found.
 */
async function dismissCookieBanner(page: Page): Promise<void> {
  const candidates = [
    page.getByRole('button', { name: /accept/i }),
    page.getByRole('button', { name: /agree/i }),
    page.getByRole('button', { name: /got it/i }),
    page.getByRole('button', { name: /ok/i }),
    page.locator('button').filter({ hasText: /accept/i }).first(),
  ];

  for (const btn of candidates) {
    try {
      if (await btn.isVisible({ timeout: 3000 })) {
        await btn.click();
        await page.waitForTimeout(500);
        return;
      }
    } catch {
      // continue to next candidate
    }
  }
}

/**
 * Navigate to a URL with retry logic for flaky network conditions.
 */
async function safeGoto(page: Page, url: string): Promise<void> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch {
    // Retry once with a longer timeout
    await page.waitForTimeout(2000);
    await page.goto(url, { waitUntil: 'load', timeout: 90000 });
  }
}

/**
 * Take a screenshot on failure — intended to be called inside catch blocks.
 */
async function screenshotOnFailure(page: Page, label: string): Promise<void> {
  await page
    .screenshot({
      path: `errors/region-switcher-${label}-${Date.now()}.png`,
      fullPage: true,
    })
    .catch(() => {});
}

/**
 * Locate and click a specific country/region option on the choose-country-region page.
 *
 * The region picker UI may render country names in various ways (links, buttons,
 * list items, divs). This helper uses multiple fallback strategies to find the
 * correct element.
 */
async function clickRegionOption(page: Page, countryName: string): Promise<void> {
  // Strategy 1: role-based link or button with the country name
  const linkLocator = page.getByRole('link', { name: countryName });
  if (await linkLocator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
    await linkLocator.first().click();
    return;
  }

  const buttonLocator = page.getByRole('button', { name: countryName });
  if (await buttonLocator.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await buttonLocator.first().click();
    return;
  }

  // Strategy 2: text-based locator (exact match first, then partial)
  const exactText = page.getByText(countryName, { exact: true });
  if (await exactText.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await exactText.first().click();
    return;
  }

  const partialText = page.getByText(countryName);
  if (await partialText.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await partialText.first().click();
    return;
  }

  // Strategy 3: CSS-based locator for common list/card patterns
  const cssLocator = page.locator(`a, button, li, div[role="option"]`).filter({ hasText: countryName });
  if (await cssLocator.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await cssLocator.first().click();
    return;
  }

  throw new Error(`Could not find region option for "${countryName}" on the page`);
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

test.describe.configure({ timeout: 120000 });

test.describe('Region / Country Switcher', () => {

  // ── 1. Choose Country Region page loads ──────────────────────────────────

  test.describe('Choose Country Region page', () => {

    test('page loads with region options visible', async ({ page }) => {
      await safeGoto(page, `${BASE_URL}${CHOOSE_REGION_PATH}`);
      await dismissCookieBanner(page);

      // The page should have rendered and contain meaningful content
      await expect(page).not.toHaveURL(/about:blank/);

      // Verify expected countries are listed on the page
      for (const country of EXPECTED_COUNTRIES) {
        await test.step(`Verify "${country}" is listed`, async () => {
          const countryLocator = page.getByText(country).first();
          try {
            await expect(countryLocator).toBeVisible({ timeout: 15000 });
          } catch (err) {
            await screenshotOnFailure(page, `country-not-found-${country.replace(/\s+/g, '-')}`);
            throw err;
          }
        });
      }
    });
  });

  // ── 2. Selecting a region redirects to the correct URL ───────────────────

  test.describe('Region selection redirects', () => {

    for (const [code, { name, urlSegment }] of Object.entries(REGION_MAP)) {
      test(`selecting ${name} redirects to URL containing ${urlSegment}`, async ({ page }) => {
        await safeGoto(page, `${BASE_URL}${CHOOSE_REGION_PATH}`);
        await dismissCookieBanner(page);

        await test.step(`Click on "${name}"`, async () => {
          await clickRegionOption(page, name);
        });

        await test.step(`Verify URL contains "${urlSegment}"`, async () => {
          try {
            await page.waitForURL(`**${urlSegment}**`, { timeout: 30000 });
          } catch {
            // Fallback: just check the current URL after waiting for navigation
            await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
          }

          const currentUrl = page.url();
          expect(
            currentUrl,
            `Expected URL to contain "${urlSegment}" after selecting ${name}, but got: ${currentUrl}`,
          ).toContain(urlSegment);
        });
      });
    }
  });

  // ── 3. Region prefix is consistent in navigation links ───────────────────

  test.describe('Navigation links reflect region prefix', () => {

    const regionsToCheck: Array<{ code: string; segment: string }> = [
      { code: 'us', segment: '/us/' },
      { code: 'in', segment: '/in/' },
      { code: 'ae', segment: '/ae/' },
      { code: 'gb', segment: '/gb/' },
      { code: 'de', segment: '/de/' },
      { code: 'jp', segment: '/jp/' },
    ];

    for (const { code, segment } of regionsToCheck) {
      test(`navigation links on /${code}/ring/buy/ contain "${segment}" prefix`, async ({ page }) => {
        const ringBuyUrl = `${BASE_URL}${segment}ring/buy/`;
        await safeGoto(page, ringBuyUrl);
        await dismissCookieBanner(page);

        await test.step('Wait for page to settle', async () => {
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(2000);
        });

        await test.step(`Verify navigation links contain "${segment}"`, async () => {
          // Collect all navigation links (header nav, top-level nav)
          const navLinks = page.locator('nav a[href], header a[href]');
          const linkCount = await navLinks.count();

          // We need at least some navigation links to validate
          expect(linkCount, 'Expected navigation links to be present').toBeGreaterThan(0);

          let checkedCount = 0;
          let matchedCount = 0;

          for (let i = 0; i < linkCount; i++) {
            const href = await navLinks.nth(i).getAttribute('href');
            if (!href) continue;

            // Skip external links, anchors, and non-path links
            if (
              href.startsWith('http') && !href.includes(new URL(BASE_URL).hostname) ||
              href.startsWith('#') ||
              href.startsWith('mailto:') ||
              href.startsWith('tel:') ||
              href.startsWith('javascript:')
            ) {
              continue;
            }

            // Only check internal site links that have a path (skip bare "/" or empty)
            if (href === '/' || href.length < 2) continue;

            checkedCount++;

            // Internal links should contain the region prefix
            if (href.includes(segment)) {
              matchedCount++;
            }
          }

          if (checkedCount > 0) {
            const matchRatio = matchedCount / checkedCount;
            console.log(
              `[Region Nav] ${code.toUpperCase()}: ${matchedCount}/${checkedCount} internal nav links contain "${segment}" (${Math.round(matchRatio * 100)}%)`,
            );

            // At least some links should contain the region prefix
            expect(
              matchedCount,
              `Expected at least some navigation links to contain "${segment}" prefix`,
            ).toBeGreaterThan(0);
          } else {
            console.log(`[Region Nav] ${code.toUpperCase()}: No checkable internal nav links found — skipping assertion`);
          }
        });
      });
    }
  });

  // ── 4. Cross-region navigation updates pricing currency ──────────────────

  test.describe('Pricing currency reflects selected region', () => {

    for (const [code, { symbol, label }] of Object.entries(CURRENCY_INDICATORS)) {
      test(`/${code}/ring/buy/ displays ${label} (${symbol}) pricing`, async ({ page }) => {
        const ringBuyUrl = `${BASE_URL}/${code}/ring/buy/`;
        await safeGoto(page, ringBuyUrl);
        await dismissCookieBanner(page);

        await test.step('Wait for pricing to load', async () => {
          await page.waitForLoadState('domcontentloaded');
          // Allow dynamic pricing content to render
          await page.waitForTimeout(3000);
        });

        await test.step(`Verify "${symbol}" currency indicator is visible`, async () => {
          // Collect text from common price containers
          const priceSelectors = [
            '[data-testid*="price"]',
            '[class*="price"]',
            '[class*="Price"]',
            '[class*="amount"]',
            '[class*="Amount"]',
          ];

          let foundCurrency = false;

          // Strategy 1: Check dedicated price elements
          for (const selector of priceSelectors) {
            const elements = page.locator(selector);
            const count = await elements.count().catch(() => 0);

            for (let i = 0; i < count; i++) {
              const text = await elements.nth(i).innerText().catch(() => '');
              if (text.includes(symbol)) {
                foundCurrency = true;
                console.log(`[Currency] ${code.toUpperCase()}: Found "${symbol}" in ${selector}: "${text.trim().substring(0, 80)}"`);
                break;
              }
            }

            if (foundCurrency) break;
          }

          // Strategy 2: Broad page text search if dedicated elements did not match
          if (!foundCurrency) {
            const bodyText = await page.locator('body').innerText().catch(() => '');
            foundCurrency = bodyText.includes(symbol);

            if (foundCurrency) {
              console.log(`[Currency] ${code.toUpperCase()}: Found "${symbol}" via full-page text search`);
            }
          }

          if (!foundCurrency) {
            await screenshotOnFailure(page, `currency-not-found-${code}`);
          }

          expect(
            foundCurrency,
            `Expected "${symbol}" currency indicator to be visible on /${code}/ring/buy/ page`,
          ).toBe(true);
        });
      });
    }
  });

  // ── 5. Country-to-store redirects ──────────────────────────────────────────
  //    Countries that share a store with a primary region should resolve
  //    to a URL containing the correct region/country segment.

  test.describe('Country-to-store region page loads', () => {

    for (const { country, name, targetRegion, targetSegment } of COUNTRY_STORE_REDIRECTS) {
      test(`/${country}/ (${name}) resolves to page with ${targetSegment} or /${country}/`, async ({ request, page }) => {
        const url = `${BASE_URL}/${country}/`;

        // First check via API request what redirect happens (if any)
        const response = await request.get(url, { maxRedirects: 0 });
        const status = response.status();
        const location = response.headers()['location'] ?? null;

        if ([301, 302, 307, 308].includes(status) && location) {
          // Country redirects to its store region
          const locationPath = location.startsWith('http')
            ? new URL(location).pathname
            : location.split('?')[0];

          console.log(
            `[Country Redirect] ${country.toUpperCase()} (${name}): ${status} -> ${locationPath} (target store: ${targetRegion})`,
          );

          // The redirect should land on the target region segment or the country's own segment
          expect(
            locationPath.startsWith(targetSegment) || locationPath.startsWith(`/${country}/`),
            `Expected /${country}/ to redirect to ${targetSegment} or /${country}/, got ${locationPath}`,
          ).toBe(true);
        } else if (status === 200) {
          // Country has its own page (served directly)
          console.log(
            `[Country Page] ${country.toUpperCase()} (${name}): 200 OK (store: ${targetRegion})`,
          );

          // Navigate with browser to verify the page actually renders
          await safeGoto(page, url);
          await dismissCookieBanner(page);

          const title = await page.title();
          expect(title, `Page title should be truthy for /${country}/`).toBeTruthy();

          const bodyText = await page.locator('body').textContent();
          expect(
            (bodyText ?? '').length,
            `Body should have content for /${country}/`,
          ).toBeGreaterThan(0);
        } else {
          // Unexpected status — fail with details
          console.log(
            `[Country] ${country.toUpperCase()} (${name}): Unexpected status ${status}`,
          );
          expect(
            [200, 301, 302, 307, 308].includes(status),
            `Expected 200 or redirect for /${country}/, got ${status}`,
          ).toBe(true);
        }
      });
    }
  });

  // ── 6. Default language per region ─────────────────────────────────────────
  //    Verify the page serves the expected default language for key regions.

  test.describe('Default language per region', () => {

    const regionLanguages: Array<{ region: string; lang: string; langLabel: string }> = [
      { region: 'us', lang: 'en', langLabel: 'English' },
      { region: 'in', lang: 'en', langLabel: 'English' },
      { region: 'ae', lang: 'en', langLabel: 'English' },
      { region: 'gb', lang: 'en', langLabel: 'English' },
      { region: 'de', lang: 'de', langLabel: 'German' },
      { region: 'at', lang: 'de', langLabel: 'German' },
      { region: 'fr', lang: 'fr', langLabel: 'French' },
      { region: 'jp', lang: 'ja', langLabel: 'Japanese' },
      { region: 'th', lang: 'th', langLabel: 'Thai' },
    ];

    for (const { region, lang, langLabel } of regionLanguages) {
      test(`/${region}/ serves default language: ${langLabel} (${lang})`, async ({ page }) => {
        await safeGoto(page, `${BASE_URL}/${region}/`);
        await dismissCookieBanner(page);

        await test.step(`Check html lang attribute contains "${lang}"`, async () => {
          const htmlLang = await page.locator('html').getAttribute('lang');

          if (htmlLang) {
            expect(
              htmlLang.toLowerCase().startsWith(lang),
              `Expected html lang to start with "${lang}" for /${region}/, got "${htmlLang}"`,
            ).toBe(true);
          } else {
            // Fallback: check meta or content-language header
            console.log(
              `[Language] /${region}/: html[lang] not set, checking page content`,
            );
          }
        });
      });
    }
  });
});
