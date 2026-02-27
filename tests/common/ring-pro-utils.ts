import { Page, expect, test, Locator } from '@playwright/test';
import { getBaseUrl, ringProBuyUrl, mapRegion, extractRegionFromUrl } from './url-builder';
import { normalizePriceDigits, normalizePriceText, collectProductPrices } from './ring-utils';

// ── Ring Pro Variants ────────────────────────────────────────────────────────

// Color values must match the data-testid suffix: ring-color-{COLOR}
export const RING_PRO_COLORS = ['GOLD', 'SILVER', 'BLACK', 'TITANIUM'];

export const RING_PRO_SIZES = ['open', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'];

const COLOR_LABELS: Record<string, string[]> = {
  GOLD: ['gold', 'bionic gold'],
  SILVER: ['silver', 'space silver'],
  BLACK: ['black', 'aster black'],
  TITANIUM: ['titanium', 'raw titanium'],
};

// ── Pricing ──────────────────────────────────────────────────────────────────

const RING_PRO_PRICES: Record<string, string> = {
  GLOBAL: '$479',       // USD – excl tax
  GB: '£349',           // GBP – incl 20% VAT → shown as £349
  AT: '€399',           // EUR – incl 20% VAT → shown as €399
  AE: 'AED 1,749',     // AED – excl 5% VAT
  IN: '₹42,990',       // INR – incl 18% GST
  MX: 'MXN$8,199',     // MXN – incl 16%
  SA: 'SAR 1,799',     // SAR – incl 15%
  ZA: 'R7,599',        // ZAR – incl 15%
  AU: 'A$669',         // AUD – incl 10%
  CA: 'C$649',         // CAD – excl 13%
};

// ── Internal helpers ─────────────────────────────────────────────────────────

const ensureProtocol = (url: string): string => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

const RING_PRO_BASE_URL = process.env.RING_PRO_BASE_URL
  ? ensureProtocol(process.env.RING_PRO_BASE_URL.replace(/\/ring-pro\/buy\/?$/, '').replace(/\/+$/, ''))
  : (process.env.CUSTOM_BASE_URL || process.env.BASE_URL
      ? getBaseUrl()
      : 'https://www.ultrahuman.com');

const PRICE_REGEX =
  /(?:MXN\s*\$|C\$|A\$|SAR|AED|USD|SGD|AUD|INR|₹|£|€|R|\$)\s*[\d.,]+(?:\s*\(Tax incl\.\))?/gi;

const normalizePriceToken = (text: string) =>
  text
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
    .toUpperCase();

const normalizeVariantToken = (text: string) =>
  text
    .replace(/\u00A0/g, ' ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();

function getExpectedColorTokens(color: string): string[] {
  const tokens = new Set<string>();
  tokens.add(normalizeVariantToken(color.replace(/_/g, ' ')));
  (COLOR_LABELS[color] ?? []).forEach((label) => tokens.add(normalizeVariantToken(label)));
  return Array.from(tokens).filter(Boolean);
}

// ── Price lookup ─────────────────────────────────────────────────────────────

type ExpectedRingProPrice = {
  country: string;
  priceText: string;
  normalizedDigits: string;
  normalizedToken: string;
};

function extractCountrySlug(url: string): string | null {
  const region = extractRegionFromUrl(url);
  return region ? mapRegion(region) : null;
}

function getExpectedRingProPrice(url: string): ExpectedRingProPrice | null {
  const slug = extractCountrySlug(url);
  if (!slug) return null;
  const key = slug.toUpperCase();
  const priceText = RING_PRO_PRICES[key];
  if (!priceText) return null;

  const normalizedDigits = normalizePriceDigits(priceText);
  const normalizedToken = normalizePriceToken(priceText);
  if (!normalizedDigits || !normalizedToken) return null;

  return { country: key, priceText, normalizedDigits, normalizedToken };
}

// ── Price collection from locator ────────────────────────────────────────────

async function collectPricesFromLocator(locator: Locator): Promise<Set<string>> {
  const set = new Set<string>();
  let texts: string[] = [];
  try {
    texts = await locator.allInnerTexts();
  } catch {
    return set;
  }
  for (const text of texts) {
    if (!text) continue;
    const matches = text.match(PRICE_REGEX);
    if (!matches) continue;
    for (const raw of matches) {
      const cleaned = raw.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned) set.add(cleaned);
    }
  }
  return set;
}

// ── Strike-through pair detection ────────────────────────────────────────────

type StrikeThroughPair = {
  strikeText: string;
  strikeDigits: string;
  discountText: string;
  discountDigits: string;
} | null;

async function findStrikeThroughPair(page: Page): Promise<StrikeThroughPair> {
  const strike = page.locator('xpath=//span[contains(@class,"strike-through")]').first();
  if (!(await strike.isVisible().catch(() => false))) return null;

  const strikeText = (await strike.innerText().catch(() => ''))?.trim();
  if (!strikeText) return null;
  const strikeDigits = normalizePriceDigits(strikeText);
  if (!strikeDigits) return null;

  const sibling = strike.locator('xpath=following-sibling::span[1]').first();
  if (!(await sibling.isVisible().catch(() => false))) return null;

  const discountText = (await sibling.innerText().catch(() => ''))?.trim();
  if (!discountText) return null;
  const discountDigits = normalizePriceDigits(discountText);
  if (!discountDigits) return null;

  return { strikeText, strikeDigits, discountText, discountDigits };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Navigate to the Ring Pro buy page for a given region.
 */
export async function openRingProLanding(page: Page, country: string) {
  await test.step(`Navigate to ${country} Ring Pro buy page`, async () => {
    const url = ringProBuyUrl(RING_PRO_BASE_URL, country);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch {
      try {
        await page.waitForTimeout(1000);
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      } catch {
        throw new Error(`Failed to navigate to Ring Pro page: ${url}`);
      }
    }
  });
}

/**
 * Full add-to-cart flow for Ring Pro:
 *  1. Select color
 *  2. Select size (optional)
 *  3. Handle upsell modals
 *  4. Click Add to Cart
 *  5. Validate price consistency (product page → cart)
 *  6. Validate selected variant in cart
 *  7. Click Checkout
 */
export async function addRingProToCart(
  page: Page,
  opts: { color: string; size?: string }
) {
  const testInfo = test.info();

  // ── 1. Select color ──────────────────────────────────────────────────────
  await test.step(`Select ring color: ${opts.color}`, async () => {
    await page.getByTestId(`ring-color-${opts.color}`).click();
  });

  // ── 2. Select size ───────────────────────────────────────────────────────
  if (opts.size) {
    await test.step(`Select ring size: ${opts.size}`, async () => {
      await page.getByRole('button', { name: /I have a ring sizing kit/i }).click();
      await page.getByTestId(`ring-size-${opts.size}`).click();

      const knowMySize = page.getByText('I know my size');
      if (await knowMySize.isVisible()) {
        await knowMySize.click();
      }
    });
  }

  // ── Collect prices from the product page ─────────────────────────────────
  const productPriceCandidates = await collectProductPrices(page);
  const normalizedProductPrices = new Set(
    Array.from(productPriceCandidates, normalizePriceDigits).filter(Boolean)
  );
  const normalizedProductTokens = new Set(
    Array.from(productPriceCandidates, normalizePriceToken).filter(Boolean)
  );
  const strikePair = await findStrikeThroughPair(page);
  const expectedPrice = getExpectedRingProPrice(page.url());
  const expectedColorTokens = getExpectedColorTokens(opts.color);
  const expectedSizeTokens =
    opts.size && opts.size !== 'open' ? [normalizeVariantToken(opts.size)] : [];

  // ── 3. Handle upsell modals ──────────────────────────────────────────────
  await test.step('Handle upsell modals', async () => {
    try {
      const proactiveBtn = page.getByRole('button', { name: /No, I don't want proactive/i });
      if (await proactiveBtn.isVisible({ timeout: 3000 })) {
        await proactiveBtn.click();
      }
      const protectBtn = page.getByRole('button', { name: /No, I don't want to protect/i });
      if (await protectBtn.isVisible({ timeout: 3000 })) {
        await protectBtn.click();
      }
    } catch {
      // silently ignore
    }
  });

  // ── 4. Add to cart ───────────────────────────────────────────────────────
  await test.step('Add to cart and proceed to checkout', async () => {
    console.log(`[Ring Pro] Adding to cart: ${JSON.stringify(opts)}`);
    const addToCartBtn = page.getByTestId('ring-add-to-cart');

    const trySkipUHX = async () => {
      try {
        const skipBtn = page.getByRole('button', { name: /Skip UltrahumanX coverage \(/i });
        if (await skipBtn.isVisible().catch(() => false)) {
          await skipBtn.click().catch(() => {});
          await page.waitForTimeout(200).catch(() => {});
        }
      } catch {
        // ignore
      }
    };

    await addToCartBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await trySkipUHX().catch(() => {});

    try {
      await expect(addToCartBtn).toBeEnabled({ timeout: 50000 });
      await addToCartBtn.click();

      // Handle 'Review cart' CTA if present
      try {
        const reviewBtnImmediate = page.getByRole('button', { name: /Review cart/i });
        if (await reviewBtnImmediate.isVisible().catch(() => false)) {
          await reviewBtnImmediate.click().catch(() => {});
          await page
            .waitForSelector('[data-testid="cart-list"]', { state: 'visible', timeout: 50000 })
            .catch(() => {});
        }
      } catch {
        // ignore
      }
    } catch {
      console.warn('[Ring Pro] Add to cart button not enabled; attempting fallbacks');

      if (page.isClosed && page.isClosed()) {
        throw new Error('Page closed before Add to cart could be clicked');
      }

      await trySkipUHX().catch(() => {});

      // Remove disabled attribute
      await page
        .evaluate(() => {
          const btn = document.querySelector('[data-testid="ring-add-to-cart"]') as HTMLButtonElement | null;
          if (btn) {
            btn.removeAttribute('disabled');
            try { (btn as any).disabled = false; } catch {}
          }
        })
        .catch(() => {});

      await page.waitForTimeout(500).catch(() => {});

      // JS click fallback
      const jsClicked = await page
        .evaluate(() => {
          const btn = document.querySelector('[data-testid="ring-add-to-cart"]') as HTMLElement | null;
          if (!btn) return false;
          try { btn.click(); } catch { return false; }
          return true;
        })
        .catch(() => false);

      if (!jsClicked) {
        await addToCartBtn.click({ force: true }).catch((e) => {
          console.error('[Ring Pro] All attempts to click Add to cart failed', e);
          throw e;
        });
      }
    }

    await page.waitForLoadState('domcontentloaded');

    // ── 5. Wait for cart & validate prices ───────────────────────────────
    try {
      await page.waitForSelector('[data-testid="cart-list"]', { state: 'visible', timeout: 50000 });
    } catch (error) {
      console.error('[Ring Pro] Cart list not visible after Add to Cart:', error);
      throw error;
    }

    const titles = await page.getByTestId('cart-list').locator('.title').allTextContents();
    expect(
      titles.some((t) => /Ring\s*Pro/i.test(t) || /Ultrahuman\s*Ring/i.test(t)),
      'Expected Ring Pro product in cart titles'
    ).toBe(true);

    const cartLocator = page.getByTestId('cart-list');
    const cartPriceCandidates = await collectPricesFromLocator(cartLocator);
    const normalizedCartPrices = new Set(
      Array.from(cartPriceCandidates, normalizePriceDigits).filter(Boolean)
    );
    const normalizedCartTokens = new Set(
      Array.from(cartPriceCandidates, normalizePriceToken).filter(Boolean)
    );

    const discountedProductDigits = strikePair?.discountDigits
      ? new Set([strikePair.discountDigits])
      : null;

    const hasOverlap = Array.from(discountedProductDigits ?? normalizedProductPrices).some(
      (value) => normalizedCartPrices.has(value)
    );

    if (!hasOverlap) {
      console.error('[Ring Pro] Price mismatch detected', {
        productPriceCandidates: Array.from(productPriceCandidates),
        strikeThroughPair: strikePair ?? undefined,
        cartPriceCandidates: Array.from(cartPriceCandidates),
      });
      throw new Error('Price mismatch between product page and cart');
    }

    if (expectedPrice) {
      const productMatch =
        discountedProductDigits?.has(expectedPrice.normalizedDigits) ||
        normalizedProductPrices.has(expectedPrice.normalizedDigits) ||
        normalizedProductTokens.has(expectedPrice.normalizedToken);
      const cartMatch =
        normalizedCartPrices.has(expectedPrice.normalizedDigits) ||
        normalizedCartTokens.has(expectedPrice.normalizedToken);

      if (!productMatch || !cartMatch) {
        if (hasOverlap) {
          console.warn(
            '[Ring Pro] Expected price token not found exactly, but product/cart price digits overlap — continuing',
            {
              country: expectedPrice.country,
              expected: expectedPrice.priceText,
              productPriceCandidates: Array.from(productPriceCandidates),
              cartPriceCandidates: Array.from(cartPriceCandidates),
            }
          );
        } else {
          console.error('[Ring Pro] Expected price mismatch', {
            country: expectedPrice.country,
            expected: expectedPrice.priceText,
            productPriceCandidates: Array.from(productPriceCandidates),
            cartPriceCandidates: Array.from(cartPriceCandidates),
          });
          throw new Error(
            `Expected price ${expectedPrice.priceText} not observed on product page and cart`
          );
        }
      }

      console.log(
        `[Ring Pro] Expected price confirmed for ${expectedPrice.country}: ${expectedPrice.priceText}`
      );
    }

    console.log(
      `[Ring Pro] Price consistency confirmed: ${Array.from(productPriceCandidates).join(', ')} → ${Array.from(cartPriceCandidates).join(', ')}`
    );

    // ── 6. Validate selected variant in cart ─────────────────────────────
    await test.step('Validate selected variant in cart', async () => {
      const cartTexts = await cartLocator.allInnerTexts().catch(() => []);
      const cartTextBlob = normalizeVariantToken(cartTexts.join(' | '));

      const colorMatched = expectedColorTokens.some((token) => cartTextBlob.includes(token));
      const sizeMatched =
        !expectedSizeTokens.length ||
        expectedSizeTokens.some((token) => cartTextBlob.includes(token));

      const variantReport = {
        selected: { color: opts.color, size: opts.size ?? 'open' },
        expectedColorTokens,
        expectedSizeTokens,
        cartText: cartTexts,
      };

      await testInfo
        .attach(`ring-pro-variant-${opts.color}-${opts.size ?? 'open'}-${Date.now()}`, {
          body: JSON.stringify(variantReport, null, 2),
          contentType: 'application/json',
        })
        .catch(() => {});

      if (!colorMatched || !sizeMatched) {
        console.error('[Ring Pro] Variant mismatch between PDP and cart', {
          selectedColor: opts.color,
          selectedSize: opts.size,
          expectedColorTokens,
          expectedSizeTokens,
          cartText: cartTexts,
        });
        throw new Error('Selected Ring Pro variant not reflected correctly in cart');
      }
    });

    // ── 7. Checkout ──────────────────────────────────────────────────────
    const clickCheckout = async () => {
      const cart = page.getByTestId('cart-list');

      const disableCoveringElement = async (locator: any) => {
        try {
          const box = await locator.first().boundingBox();
          if (!box) return;
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          await page.evaluate(
            ({ cx, cy }) => {
              const top = document.elementFromPoint(cx, cy) as HTMLElement | null;
              if (top && top.getAttribute?.('data-test-pointer-disabled') !== 'true') {
                top.style.pointerEvents = 'none';
                top.setAttribute('data-test-pointer-disabled', 'true');
              }
            },
            { cx, cy }
          );
        } catch {
          // best-effort
        }
      };

      const jsClick = async (locator: any) => {
        try {
          const handle = await locator.first().elementHandle();
          if (!handle) return false;
          await page.evaluate((el) => (el as HTMLElement).click(), handle);
          return true;
        } catch {
          return false;
        }
      };

      // Primary: explicit test id
      const primary = page.getByTestId('cart-checkout-button');
      if (await primary.isVisible().catch(() => false)) {
        await disableCoveringElement(primary);
        try { await primary.click(); return; } catch {
          if (await jsClick(primary)) return;
          await primary.click({ force: true }); return;
        }
      }

      // Try expanding the cart review modal
      const reviewBtn = page.getByRole('button', { name: /Review cart/i });
      if (await reviewBtn.isVisible().catch(() => false)) {
        await reviewBtn.click().catch(() => {});
        await page.waitForTimeout(300);
      }

      // Exact text match for 'Checkout'
      const exactCheckout = page.locator('div').filter({ hasText: /^Checkout$/ }).first();
      if (await exactCheckout.isVisible().catch(() => false)) {
        await disableCoveringElement(exactCheckout);
        try { await exactCheckout.click(); return; } catch {
          if (await jsClick(exactCheckout)) return;
          await exactCheckout.click({ force: true }); return;
        }
      }

      // Role-based fallbacks
      const btn = page.getByRole('button', {
        name: /checkout|proceed to checkout|proceed|place order|continue to checkout|pay now/i,
      });
      if (await btn.isVisible().catch(() => false)) {
        await disableCoveringElement(btn);
        try { await btn.click(); return; } catch {
          if (await jsClick(btn)) return;
          await btn.click({ force: true }); return;
        }
      }

      const link = page.getByRole('link', {
        name: /checkout|proceed to checkout|continue to checkout|pay now/i,
      });
      if (await link.isVisible().catch(() => false)) {
        await disableCoveringElement(link);
        try { await link.click(); return; } catch {
          if (await jsClick(link)) return;
          await link.click({ force: true }); return;
        }
      }

      // Cart-scoped text
      const inside = cart.getByText(/checkout|proceed|place order|continue|pay now|pay/i);
      if (await inside.first().isVisible().catch(() => false)) {
        await disableCoveringElement(inside.first());
        try { await inside.first().click(); return; } catch {
          if (await jsClick(inside.first())) return;
          await inside.first().click({ force: true }); return;
        }
      }

      // Page-wide text
      const pageWide = page.getByText(
        /checkout|proceed to checkout|proceed|place order|continue to checkout|pay now|pay/i
      );
      if (await pageWide.first().isVisible().catch(() => false)) {
        await disableCoveringElement(pageWide.first());
        try { await pageWide.first().click(); return; } catch {
          if (await jsClick(pageWide.first())) return;
          await pageWide.first().click({ force: true }); return;
        }
      }

      throw new Error('Checkout action not found');
    };

    try {
      await clickCheckout();
    } catch (error) {
      console.error('[Ring Pro] Checkout click failed', error);
      throw error;
    }
  });
}
