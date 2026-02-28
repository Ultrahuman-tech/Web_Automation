import { test, expect, Page, Locator } from '@playwright/test';
import { normalizePriceDigits } from '../common/ring-utils';
import { ringBuyUrl, getBaseUrl, mapRegion } from '../common/url-builder';

/* ─── constants ──────────────────────────────────────────────────────── */

const ASSERT_TIMEOUT = 25_000;

const STACKING_BASE_URL = process.env.STACKING_BASE_URL
  ? process.env.STACKING_BASE_URL.replace(/\/+$/, '')
  : 'https://www.ultrahuman.com/';

const STACKING_RINGS = ['Eternity Silver', 'Eternity Gold'] as const;
type StackingRing = (typeof STACKING_RINGS)[number];

type StackType = 'single' | 'duo';
const CART_PRICE_REGEX =
  /(?:MXN\s*\$|C\$|A\$|SAR|AED|USD|SGD|AUD|INR|₹|£|€|\bR\b(?=\s*\d)|\$)\s*[\d.,]+/gi;
const TOTAL_WITH_PRICE_REGEX =
  /\bTotal\b[\s\S]{0,120}?((?:MXN\s*\$|C\$|A\$|SAR|AED|USD|SGD|AUD|INR|₹|£|€|\bR\b(?=\s*\d)|\$)\s*[\d.,]+)/gi;

/* ─── pricing config ─────────────────────────────────────────────────── */

/** Stacking ring add-on prices per region, split by Silver / Gold × Single / Duo */
const STACKING_PRICES: Record<
  string,
  { silver: { single: string; duo: string }; gold: { single: string; duo: string } }
> = {
  IN: {
    silver: { single: '₹4,999', duo: '₹8,999' },
    gold: { single: '₹4,999', duo: '₹8,999' },
  },
  GLOBAL: {
    silver: { single: '$49', duo: '$89' },
    gold: { single: '$49', duo: '$89' },
  },
  AT: {
    silver: { single: '€45', duo: '€79' },
    gold: { single: '€45', duo: '€79' },
  },
  GB: {
    silver: { single: '£39', duo: '£69' },
    gold: { single: '£39', duo: '£69' },
  },
  AU: {
    silver: { single: 'A$69', duo: 'A$129' },
    gold: { single: 'A$69', duo: 'A$129' },
  },
  CA: {
    silver: { single: 'C$65', duo: 'C$125' },
    gold: { single: 'C$65', duo: 'C$125' },
  },
  AE: {
    silver: { single: 'AED 179', duo: 'AED 329' },
    gold: { single: 'AED 179', duo: 'AED 329' },
  },
};

/** Base ring prices per region (from ring-utils DEFAULT_RING_PRICES) */
const BASE_RING_PRICES: Record<string, string> = {
  IN: '₹28,499',
  GLOBAL: '$349',
  AT: '€379',
  GB: '£329',
  AU: 'A$599',
  CA: 'C$479',
  AE: 'AED 1,299',
};

type RegionConfig = {
  name: string;
  slug: string;
  key: string; // uppercase key into pricing maps
};

const REGIONS: RegionConfig[] = [
  { name: 'India', slug: 'in', key: 'IN' },
  { name: 'USA / Global', slug: 'global', key: 'GLOBAL' },
  { name: 'Austria / EU', slug: 'at', key: 'AT' },
  { name: 'United Kingdom', slug: 'gb', key: 'GB' },
  { name: 'Australia', slug: 'au', key: 'AU' },
  { name: 'Canada', slug: 'ca', key: 'CA' },
  { name: 'United Arab Emirates', slug: 'ae', key: 'AE' },
];

/* ─── helpers ────────────────────────────────────────────────────────── */

async function gotoStackingPage(page: Page, slug: string) {
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(30_000);
  const url = ringBuyUrl(STACKING_BASE_URL, slug);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  } catch {
    await page.waitForTimeout(1_000);
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  }

  // dismiss cookie banner if present
  const acceptBtn = page.getByRole('button', { name: /^Accept$/i }).first();
  if (await acceptBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await acceptBtn.click();
    await page.waitForTimeout(500);
  }
}

/** Resolve stacking section anchor across markup variants (heading/button text varies by region/build). */
async function findVisibleStackingAnchor(page: Page): Promise<Locator> {
  const candidates: Locator[] = [
    page.getByRole('heading', { name: /stack|bling/i, level: 5 }).first(),
    page.getByRole('heading', { name: /stack|bling/i }).first(),
    page
      .locator('h1,h2,h3,h4,h5,h6')
      .filter({ hasText: /add bling|stack your ring|stacking/i })
      .first(),
    page.getByRole('button', { name: /Bling\s*-\s*Eternity Silver|Eternity Silver/i }).first(),
    page.getByRole('button', { name: /Bling\s*-\s*Eternity Gold|Eternity Gold/i }).first(),
    page.getByRole('button', { name: /I don't want to stack/i }).first(),
  ];

  for (const candidate of candidates) {
    if (await candidate.isVisible({ timeout: 4_000 }).catch(() => false)) {
      return candidate;
    }
  }

  throw new Error('Stacking section not found using known heading/button variants');
}

/** Bring the stacking section into view so lazy-rendered controls become available. */
async function scrollToStackingSection(page: Page) {
  const silverBtn = page.getByRole('button', { name: /Eternity Silver/i }).first();
  const goldBtn = page.getByRole('button', { name: /Eternity Gold/i }).first();
  const skipBtn = page.getByRole('button', { name: /I don't want to stack/i }).first();
  const heading = page.getByRole('heading', { name: /stack|bling/i }).first();

  const anchors = [silverBtn, goldBtn, skipBtn, heading];

  for (let i = 0; i < 8; i += 1) {
    for (const anchor of anchors) {
      if (await anchor.isVisible().catch(() => false)) {
        await anchor.scrollIntoViewIfNeeded({ timeout: ASSERT_TIMEOUT }).catch(() => {});
        await page.waitForTimeout(250);
        return;
      }
    }
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(250);
  }
}

/** Read the Total price from the order summary section */
async function getOrderSummaryTotal(page: Page): Promise<string> {
  const totalHeading = page.getByRole('heading', { name: 'Total', level: 5 });
  await expect(totalHeading).toBeVisible({ timeout: ASSERT_TIMEOUT });

  // The price paragraph is the next sibling after the Total heading
  const totalSection = totalHeading.locator('..');
  const priceParagraph = totalSection.locator('p').first();
  const priceText = await priceParagraph.innerText();
  return priceText.replace(/\u00A0/g, ' ').trim();
}

/** Click a stacking ring option (Eternity Silver / Eternity Gold) */
async function selectStackingRing(page: Page, ring: StackingRing) {
  await scrollToStackingSection(page);
  const ringBtn = page.getByRole('button', { name: new RegExp(ring, 'i') }).first();
  await expect(ringBtn).toBeVisible({ timeout: ASSERT_TIMEOUT });
  await ringBtn.scrollIntoViewIfNeeded({ timeout: ASSERT_TIMEOUT });
  await ringBtn.click();
  await page.waitForTimeout(500);
}

/** Select single or duo stacking — scoped to the correct ring section */
async function selectStackType(page: Page, ring: StackingRing, type: StackType) {
  // Find the ring button, then scope to its parent wrapper which contains the sub-option buttons
  const ringBtn = page.getByRole('button', { name: new RegExp(ring, 'i') }).first();
  const ringSection = ringBtn.locator('..');
  const targetName = type === 'single' ? /Single Stacking Ring/i : /Duo Stacking Rings/i;
  const btn = ringSection.getByRole('button', { name: targetName });
  await expect(btn).toBeVisible({ timeout: ASSERT_TIMEOUT });
  await btn.click();
  await page.waitForTimeout(500);
}

/** Click "I don't want to stack my ring" */
async function selectNoStacking(page: Page) {
  await scrollToStackingSection(page);
  const skipBtn = page.getByRole('button', { name: /I don't want to stack/i });
  await expect(skipBtn).toBeVisible({ timeout: ASSERT_TIMEOUT });
  await skipBtn.scrollIntoViewIfNeeded({ timeout: ASSERT_TIMEOUT });
  await skipBtn.click();
  await page.waitForTimeout(500);
}

/** Compute expected total by summing digit-only representations of prices */
function computeExpectedTotalDigits(basePrice: string, stackPrice: string): string {
  const baseDigits = parseInt(normalizePriceDigits(basePrice), 10);
  const stackDigits = parseInt(normalizePriceDigits(stackPrice), 10);
  return String(baseDigits + stackDigits);
}

/** Extract numeric price values from cart text by matching currency-formatted amounts */
function extractCartPriceValues(text: string): number[] {
  const matches = text.match(CART_PRICE_REGEX) ?? [];
  return matches
    .map((priceText) => parseInt(normalizePriceDigits(priceText), 10))
    .filter((value) => Number.isFinite(value));
}

/** Check whether any two detected prices sum to the expected total */
function hasPricePairSum(priceValues: number[], expectedTotal: number): boolean {
  for (let i = 0; i < priceValues.length; i += 1) {
    for (let j = i + 1; j < priceValues.length; j += 1) {
      if (priceValues[i] + priceValues[j] === expectedTotal) {
        return true;
      }
    }
  }
  return false;
}

/** Extract numeric values that appear next to a "Total" label */
function extractDisplayedTotalValues(text: string): number[] {
  const values: number[] = [];
  for (const match of text.matchAll(TOTAL_WITH_PRICE_REGEX)) {
    const priceText = match[1] ?? '';
    const value = parseInt(normalizePriceDigits(priceText), 10);
    if (Number.isFinite(value)) values.push(value);
  }
  return values;
}

type CartPriceDebugSnapshot = {
  cartText: string;
  cartPriceValues: number[];
  displayedTotals: number[];
};

const EMPTY_CART_PRICE_DEBUG_SNAPSHOT: CartPriceDebugSnapshot = {
  cartText: '',
  cartPriceValues: [],
  displayedTotals: [],
};

async function getCartPriceDebugSnapshot(page: Page): Promise<CartPriceDebugSnapshot> {
  const cartText = await page.getByTestId('cart-list').innerText();
  const cartPriceValues = extractCartPriceValues(cartText);
  const bodyText = await page.locator('body').innerText();
  const displayedTotals = extractDisplayedTotalValues(bodyText);
  return { cartText, cartPriceValues, displayedTotals };
}

type CartExpectation = {
  basePrice: string;
  expectedStackPrice?: string;
  expectedStackLabelRegex?: RegExp;
  forbiddenStackPrices?: string[];
};

async function clickAddToCart(page: Page) {
  const addBtn = page.getByTestId('ring-add-to-cart');
  await expect(addBtn).toBeEnabled({ timeout: ASSERT_TIMEOUT });
  await addBtn.click();
  await page.waitForTimeout(2_000);
}

async function proceedToCart(page: Page, size: string) {
  await selectSize(page, size);
  await skipOptionalSections(page);
  await clickAddToCart(page);
}

async function validateCartForScenario(
  page: Page,
  expectation: CartExpectation
): Promise<CartPriceDebugSnapshot> {
  const cartList = page.getByTestId('cart-list');
  await expect(cartList).toBeVisible({ timeout: ASSERT_TIMEOUT });
  const cartText = await cartList.innerText();

  if (expectation.expectedStackLabelRegex) {
    expect(cartText, 'Cart should contain selected stacking ring').toMatch(
      expectation.expectedStackLabelRegex
    );
  } else {
    expect(cartText, 'Cart should not contain any stacking ring line item').not.toMatch(
      /Eternity Silver|Eternity Gold|Stacking/i
    );
  }

  const cartDebugSnapshot = await getCartPriceDebugSnapshot(page);
  const { cartPriceValues, displayedTotals } = cartDebugSnapshot;
  const baseValue = parseInt(normalizePriceDigits(expectation.basePrice), 10);

  expect(
    cartPriceValues.includes(baseValue),
    `Cart should contain base price ${expectation.basePrice}; detected prices: [${cartPriceValues.join(
      ', '
    )}], cart text: ${cartText}`
  ).toBe(true);

  if (expectation.expectedStackPrice) {
    const stackValue = parseInt(normalizePriceDigits(expectation.expectedStackPrice), 10);
    const expectedTotalValue = baseValue + stackValue;
    const hasExpectedPair = hasPricePairSum(cartPriceValues, expectedTotalValue);
    const hasDisplayedExpectedTotal = displayedTotals.includes(expectedTotalValue);

    expect(
      cartPriceValues.includes(stackValue),
      `Cart should contain configured stack price ${
        expectation.expectedStackPrice
      }; detected prices: [${cartPriceValues.join(', ')}], displayed totals: [${displayedTotals.join(
        ', '
      )}], cart text: ${cartText}`
    ).toBe(true);

    expect(
      hasExpectedPair || hasDisplayedExpectedTotal,
      `Cart total should match configured sum ${expectation.basePrice} + ${
        expectation.expectedStackPrice
      }; detected prices: [${cartPriceValues.join(', ')}], displayed totals: [${displayedTotals.join(
        ', '
      )}], cart text: ${cartText}`
    ).toBe(true);
  } else {
    const forbiddenValues = (expectation.forbiddenStackPrices ?? [])
      .map((price) => parseInt(normalizePriceDigits(price), 10))
      .filter(Number.isFinite);
    const hasForbiddenStack = forbiddenValues.some((value) => cartPriceValues.includes(value));
    const hasDisplayedBaseTotal = displayedTotals.includes(baseValue);

    expect(
      hasForbiddenStack,
      `Cart should not include stacking add-on prices; forbidden: [${(
        expectation.forbiddenStackPrices ?? []
      ).join(', ')}], detected: [${cartPriceValues.join(', ')}], cart text: ${cartText}`
    ).toBe(false);

    expect(
      hasDisplayedBaseTotal || hasPricePairSum(cartPriceValues, baseValue),
      `Cart total should remain at base price ${
        expectation.basePrice
      }; detected prices: [${cartPriceValues.join(', ')}], displayed totals: [${displayedTotals.join(
        ', '
      )}], cart text: ${cartText}`
    ).toBe(true);
  }

  return cartDebugSnapshot;
}

/** Select ring size (click "I have a ring sizing kit" → pick size → confirm) */
async function selectSize(page: Page, size: string) {
  const sizingKitBtn = page.getByRole('button', { name: /I have a ring sizing kit/i });
  await expect(sizingKitBtn).toBeVisible({ timeout: ASSERT_TIMEOUT });
  await sizingKitBtn.click();
  await page.waitForTimeout(500);

  const sizeBtn = page.getByRole('button', { name: size, exact: true });
  await expect(sizeBtn).toBeVisible({ timeout: ASSERT_TIMEOUT });
  await sizeBtn.click();
  await page.waitForTimeout(500);

  // Handle "I know my size" confirmation modal
  const knowMySize = page.getByText('I know my size');
  if (await knowMySize.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await knowMySize.click();
    await page.waitForTimeout(500);
  }
}

/** Skip all optional sections (charger, engraving, powerplug, UHX) to enable Add to Cart */
async function skipOptionalSections(page: Page) {
  const skips = [
    { name: /Free standard charger/i, label: 'charger' },
    { name: /I don't want the engraving/i, label: 'engraving' },
    { name: /Skip Heart Health Powerplug/i, label: 'cardio powerplug' },
    { name: /Skip Respiratory Health Powerplug/i, label: 'respiratory powerplug' },
  ];
  for (const skip of skips) {
    const btn = page.getByRole('button', { name: skip.name });
    try {
      await btn.scrollIntoViewIfNeeded({ timeout: 5_000 });
      await btn.click();
      await page.waitForTimeout(300);
    } catch {
      // section may not be present for this region
    }
  }
  // UHX coverage – use getByLabel as it reliably matches the aria-label prefix
  const uhxBtn = page.getByLabel('Skip UltrahumanX coverage (');
  try {
    await uhxBtn.scrollIntoViewIfNeeded({ timeout: 5_000 });
    await uhxBtn.click();
    await page.waitForTimeout(300);
  } catch {
    // not present for this region
  }
}

/** Read the full order summary text */
async function getOrderSummaryText(page: Page): Promise<string> {
  const summaryHeading = page.locator('h4').filter({ hasText: 'Almost there' });
  await expect(summaryHeading).toBeVisible({ timeout: ASSERT_TIMEOUT });
  const summarySection = summaryHeading.locator('..');
  const text = await summarySection.innerText();
  return text.replace(/\u00A0/g, ' ');
}

/* ─── test suite ─────────────────────────────────────────────────────── */

test.describe('Ring Stacking – Pricing Validation', () => {
  test.setTimeout(120_000);

  for (const region of REGIONS) {
    const stackPrices = STACKING_PRICES[region.key];
    const basePrice = BASE_RING_PRICES[region.key];

    test.describe(`Region: ${region.name} (${region.key})`, () => {
      test.beforeEach(async ({ page }) => {
        await gotoStackingPage(page, region.slug);
      });

      /* ── 1. Stacking section visibility ─────────────────────── */

      test('Stacking section is visible with all options', async ({ page }) => {
        await test.step('Scroll to stacking section', async () => {
          await scrollToStackingSection(page);
        });

        await test.step('Verify stacking section anchor', async () => {
          const anchor = await findVisibleStackingAnchor(page);
          await expect(anchor).toBeVisible({ timeout: ASSERT_TIMEOUT });
        });

        await test.step('Verify Eternity Silver option', async () => {
          const silverBtn = page.getByRole('button', { name: /Eternity Silver/i }).first();
          await expect(silverBtn).toBeVisible({ timeout: ASSERT_TIMEOUT });
        });

        await test.step('Verify Eternity Gold option', async () => {
          const goldBtn = page.getByRole('button', { name: /Eternity Gold/i }).first();
          await expect(goldBtn).toBeVisible({ timeout: ASSERT_TIMEOUT });
        });

        await test.step('Verify skip stacking option', async () => {
          const skipBtn = page.getByRole('button', { name: /I don't want to stack/i });
          await expect(skipBtn).toBeVisible({ timeout: ASSERT_TIMEOUT });
        });

        console.log(`[Stacking:${region.key}] All stacking options visible ✓`);
      });

      /* ── 2. Eternity Silver – Single stacking ───────────────── */

      test('Eternity Silver – Single stacking shows correct price', async ({ page }, testInfo) => {
        let cartDebugSnapshot: CartPriceDebugSnapshot = {
          ...EMPTY_CART_PRICE_DEBUG_SNAPSHOT,
        };

        await test.step('Select Eternity Silver', async () => {
          await selectStackingRing(page, 'Eternity Silver');
        });

        await test.step('Select Single stacking', async () => {
          await selectStackType(page, 'Eternity Silver', 'single');
        });

        await test.step('Validate stacking price on button', async () => {
          const silverBtn = page.getByRole('button', { name: /Eternity Silver/i }).first();
          const btnText = await silverBtn.innerText();
          const expectedDigits = normalizePriceDigits(stackPrices.silver.single);
          const btnDigits = normalizePriceDigits(btnText);
          expect(
            btnDigits.includes(expectedDigits),
            `Expected stacking price ${stackPrices.silver.single} (digits: ${expectedDigits}) in button text, got: ${btnText}`
          ).toBe(true);
        });

        await test.step('Validate total price', async () => {
          const totalText = await getOrderSummaryTotal(page);
          const totalDigits = normalizePriceDigits(totalText);
          const expectedTotalDigits = computeExpectedTotalDigits(basePrice, stackPrices.silver.single);
          expect(
            totalDigits,
            `Total should be ${basePrice} + ${stackPrices.silver.single} = digits ${expectedTotalDigits}, but got ${totalText} (digits: ${totalDigits})`
          ).toBe(expectedTotalDigits);
        });

        await test.step('Proceed to cart', async () => {
          await proceedToCart(page, '8');
        });

        await test.step('Validate cart pricing', async () => {
          cartDebugSnapshot = await validateCartForScenario(page, {
            basePrice,
            expectedStackPrice: stackPrices.silver.single,
            expectedStackLabelRegex: /Eternity Silver|Stacking/i,
          });
        });

        console.log(`[Stacking:${region.key}] Silver Single: ${stackPrices.silver.single} ✓`);

        await testInfo
          .attach(`stacking-silver-single-${region.key}`, {
            body: JSON.stringify(
              {
                region: region.name,
                ring: 'Eternity Silver',
                type: 'single',
                expectedStack: stackPrices.silver.single,
                basePrice,
                cartPriceValues: cartDebugSnapshot.cartPriceValues,
                displayedTotals: cartDebugSnapshot.displayedTotals,
                cartText: cartDebugSnapshot.cartText,
              },
              null,
              2
            ),
            contentType: 'application/json',
          })
          .catch(() => {});
      });

      /* ── 3. Eternity Silver – Duo stacking ──────────────────── */

      test('Eternity Silver – Duo stacking shows correct price', async ({ page }, testInfo) => {
        let cartDebugSnapshot: CartPriceDebugSnapshot = {
          ...EMPTY_CART_PRICE_DEBUG_SNAPSHOT,
        };

        await test.step('Select Eternity Silver', async () => {
          await selectStackingRing(page, 'Eternity Silver');
        });

        await test.step('Select Duo stacking', async () => {
          await selectStackType(page, 'Eternity Silver', 'duo');
        });

        await test.step('Validate duo price on button', async () => {
          const duoBtn = page.getByRole('button', { name: /Duo Stacking Rings/i }).first();
          const btnText = await duoBtn.innerText();
          const expectedDigits = normalizePriceDigits(stackPrices.silver.duo);
          const btnDigits = normalizePriceDigits(btnText);
          expect(
            btnDigits.includes(expectedDigits),
            `Expected duo price ${stackPrices.silver.duo} (digits: ${expectedDigits}) in button text, got: ${btnText}`
          ).toBe(true);
        });

        await test.step('Validate total price', async () => {
          const totalText = await getOrderSummaryTotal(page);
          const totalDigits = normalizePriceDigits(totalText);
          const expectedTotalDigits = computeExpectedTotalDigits(basePrice, stackPrices.silver.duo);
          expect(
            totalDigits,
            `Total should be ${basePrice} + ${stackPrices.silver.duo} = digits ${expectedTotalDigits}, but got ${totalText} (digits: ${totalDigits})`
          ).toBe(expectedTotalDigits);
        });

        await test.step('Proceed to cart', async () => {
          await proceedToCart(page, '10');
        });

        await test.step('Validate cart pricing', async () => {
          cartDebugSnapshot = await validateCartForScenario(page, {
            basePrice,
            expectedStackPrice: stackPrices.silver.duo,
            expectedStackLabelRegex: /Eternity Silver|Stacking/i,
          });
        });

        console.log(`[Stacking:${region.key}] Silver Duo: ${stackPrices.silver.duo} ✓`);

        await testInfo
          .attach(`stacking-silver-duo-${region.key}`, {
            body: JSON.stringify(
              {
                region: region.name,
                ring: 'Eternity Silver',
                type: 'duo',
                expectedStack: stackPrices.silver.duo,
                basePrice,
                cartPriceValues: cartDebugSnapshot.cartPriceValues,
                displayedTotals: cartDebugSnapshot.displayedTotals,
                cartText: cartDebugSnapshot.cartText,
              },
              null,
              2
            ),
            contentType: 'application/json',
          })
          .catch(() => {});
      });

      /* ── 4. Eternity Gold – Single stacking ─────────────────── */

      test('Eternity Gold – Single stacking shows correct price', async ({ page }, testInfo) => {
        let cartDebugSnapshot: CartPriceDebugSnapshot = {
          ...EMPTY_CART_PRICE_DEBUG_SNAPSHOT,
        };

        await test.step('Select Eternity Gold', async () => {
          await selectStackingRing(page, 'Eternity Gold');
        });

        await test.step('Select Single stacking', async () => {
          await selectStackType(page, 'Eternity Gold', 'single');
        });

        await test.step('Validate stacking price on button', async () => {
          const goldBtn = page.getByRole('button', { name: /Eternity Gold/i }).first();
          const btnText = await goldBtn.innerText();
          const expectedDigits = normalizePriceDigits(stackPrices.gold.single);
          const btnDigits = normalizePriceDigits(btnText);
          expect(
            btnDigits.includes(expectedDigits),
            `Expected stacking price ${stackPrices.gold.single} (digits: ${expectedDigits}) in button text, got: ${btnText}`
          ).toBe(true);
        });

        await test.step('Validate total price', async () => {
          const totalText = await getOrderSummaryTotal(page);
          const totalDigits = normalizePriceDigits(totalText);
          const expectedTotalDigits = computeExpectedTotalDigits(basePrice, stackPrices.gold.single);
          expect(
            totalDigits,
            `Total should be ${basePrice} + ${stackPrices.gold.single} = digits ${expectedTotalDigits}, but got ${totalText} (digits: ${totalDigits})`
          ).toBe(expectedTotalDigits);
        });

        await test.step('Proceed to cart', async () => {
          await proceedToCart(page, '8');
        });

        await test.step('Validate cart pricing', async () => {
          cartDebugSnapshot = await validateCartForScenario(page, {
            basePrice,
            expectedStackPrice: stackPrices.gold.single,
            expectedStackLabelRegex: /Eternity Gold|Stacking/i,
          });
        });

        console.log(`[Stacking:${region.key}] Gold Single: ${stackPrices.gold.single} ✓`);

        await testInfo
          .attach(`stacking-gold-single-${region.key}`, {
            body: JSON.stringify(
              {
                region: region.name,
                ring: 'Eternity Gold',
                type: 'single',
                expectedStack: stackPrices.gold.single,
                basePrice,
                cartPriceValues: cartDebugSnapshot.cartPriceValues,
                displayedTotals: cartDebugSnapshot.displayedTotals,
                cartText: cartDebugSnapshot.cartText,
              },
              null,
              2
            ),
            contentType: 'application/json',
          })
          .catch(() => {});
      });

      /* ── 5. Eternity Gold – Duo stacking ────────────────────── */

      test('Eternity Gold – Duo stacking shows correct price', async ({ page }, testInfo) => {
        let cartDebugSnapshot: CartPriceDebugSnapshot = {
          ...EMPTY_CART_PRICE_DEBUG_SNAPSHOT,
        };

        await test.step('Select Eternity Gold', async () => {
          await selectStackingRing(page, 'Eternity Gold');
        });

        await test.step('Select Duo stacking', async () => {
          await selectStackType(page, 'Eternity Gold', 'duo');
        });

        await test.step('Validate duo price on button', async () => {
          // Scope to Gold section's parent wrapper to get Gold's Duo button
          const goldBtn = page.getByRole('button', { name: /Eternity Gold/i }).first();
          const goldSection = goldBtn.locator('..');
          const duoBtn = goldSection.getByRole('button', { name: /Duo Stacking Rings/i });
          const btnText = await duoBtn.innerText();
          const expectedDigits = normalizePriceDigits(stackPrices.gold.duo);
          const btnDigits = normalizePriceDigits(btnText);
          expect(
            btnDigits.includes(expectedDigits),
            `Expected duo price ${stackPrices.gold.duo} (digits: ${expectedDigits}) in button text, got: ${btnText}`
          ).toBe(true);
        });

        await test.step('Validate total price', async () => {
          const totalText = await getOrderSummaryTotal(page);
          const totalDigits = normalizePriceDigits(totalText);
          const expectedTotalDigits = computeExpectedTotalDigits(basePrice, stackPrices.gold.duo);
          expect(
            totalDigits,
            `Total should be ${basePrice} + ${stackPrices.gold.duo} = digits ${expectedTotalDigits}, but got ${totalText} (digits: ${totalDigits})`
          ).toBe(expectedTotalDigits);
        });

        await test.step('Proceed to cart', async () => {
          await proceedToCart(page, '10');
        });

        await test.step('Validate cart pricing', async () => {
          cartDebugSnapshot = await validateCartForScenario(page, {
            basePrice,
            expectedStackPrice: stackPrices.gold.duo,
            expectedStackLabelRegex: /Eternity Gold|Stacking/i,
          });
        });

        console.log(`[Stacking:${region.key}] Gold Duo: ${stackPrices.gold.duo} ✓`);

        await testInfo
          .attach(`stacking-gold-duo-${region.key}`, {
            body: JSON.stringify(
              {
                region: region.name,
                ring: 'Eternity Gold',
                type: 'duo',
                expectedStack: stackPrices.gold.duo,
                basePrice,
                cartPriceValues: cartDebugSnapshot.cartPriceValues,
                displayedTotals: cartDebugSnapshot.displayedTotals,
                cartText: cartDebugSnapshot.cartText,
              },
              null,
              2
            ),
            contentType: 'application/json',
          })
          .catch(() => {});
      });

      /* ── 6. No stacking – price unchanged ───────────────────── */

      test('No stacking – total price remains base ring price', async ({ page }, testInfo) => {
        let cartDebugSnapshot: CartPriceDebugSnapshot = {
          ...EMPTY_CART_PRICE_DEBUG_SNAPSHOT,
        };

        await test.step('Click skip stacking', async () => {
          await selectNoStacking(page);
        });

        await test.step('Validate total equals base ring price', async () => {
          const totalText = await getOrderSummaryTotal(page);
          const totalDigits = normalizePriceDigits(totalText);
          const expectedDigits = normalizePriceDigits(basePrice);
          expect(
            totalDigits,
            `Total should be base price ${basePrice} (digits: ${expectedDigits}), but got ${totalText} (digits: ${totalDigits})`
          ).toBe(expectedDigits);
        });

        await test.step('Proceed to cart', async () => {
          await proceedToCart(page, '8');
        });

        await test.step('Validate cart without stacking add-on', async () => {
          cartDebugSnapshot = await validateCartForScenario(page, {
            basePrice,
            forbiddenStackPrices: [
              stackPrices.silver.single,
              stackPrices.silver.duo,
              stackPrices.gold.single,
              stackPrices.gold.duo,
            ],
          });
        });

        console.log(`[Stacking:${region.key}] No stacking: total = ${basePrice} ✓`);

        await testInfo
          .attach(`stacking-none-${region.key}`, {
            body: JSON.stringify(
              {
                region: region.name,
                type: 'none',
                basePrice,
                cartPriceValues: cartDebugSnapshot.cartPriceValues,
                displayedTotals: cartDebugSnapshot.displayedTotals,
                cartText: cartDebugSnapshot.cartText,
              },
              null,
              2
            ),
            contentType: 'application/json',
          })
          .catch(() => {});
      });

      /* ── 7. Size variant + stacking – order summary line items ── */

      test('Silver Single + Size 8 – order summary shows stacking line item', async ({ page }, testInfo) => {
        let cartDebugSnapshot: CartPriceDebugSnapshot = {
          ...EMPTY_CART_PRICE_DEBUG_SNAPSHOT,
        };

        await test.step('Select Eternity Silver → Single', async () => {
          await selectStackingRing(page, 'Eternity Silver');
          await selectStackType(page, 'Eternity Silver', 'single');
        });

        await test.step('Select Size 8', async () => {
          await selectSize(page, '8');
        });

        await test.step('Verify order summary contains stacking line item', async () => {
          const summaryText = await getOrderSummaryText(page);

          // Order summary should mention the stacking ring as a separate line
          expect(summaryText, 'Order summary should contain stacking ring line item').toContain(
            'Eternity Silver'
          );

          // Stacking price should appear in the summary
          const stackDigits = normalizePriceDigits(stackPrices.silver.single);
          const summaryDigits = normalizePriceDigits(summaryText);
          expect(
            summaryDigits.includes(stackDigits),
            `Order summary should include stacking price digits ${stackDigits}, got: ${summaryText}`
          ).toBe(true);
        });

        await test.step('Verify total = base + stacking', async () => {
          const totalText = await getOrderSummaryTotal(page);
          const totalDigits = normalizePriceDigits(totalText);
          const expectedTotalDigits = computeExpectedTotalDigits(basePrice, stackPrices.silver.single);
          expect(
            totalDigits,
            `Total should be ${basePrice} + ${stackPrices.silver.single} = digits ${expectedTotalDigits}, but got ${totalText}`
          ).toBe(expectedTotalDigits);
        });

        await test.step('Verify summary mentions size 8', async () => {
          const summaryText = await getOrderSummaryText(page);
          expect(summaryText, 'Order summary should mention Size 8').toMatch(/Size 8/i);
        });

        await test.step('Proceed to cart', async () => {
          await skipOptionalSections(page);
          await clickAddToCart(page);
        });

        await test.step('Validate cart pricing', async () => {
          cartDebugSnapshot = await validateCartForScenario(page, {
            basePrice,
            expectedStackPrice: stackPrices.silver.single,
            expectedStackLabelRegex: /Eternity Silver|Stacking/i,
          });
        });

        console.log(`[Stacking:${region.key}] Silver Single + Size 8: summary line items ✓`);

        await testInfo
          .attach(`stacking-summary-lineitem-${region.key}`, {
            body: JSON.stringify(
              {
                region: region.name,
                ring: 'Eternity Silver',
                type: 'single',
                size: '8',
                expectedStack: stackPrices.silver.single,
                basePrice,
                cartPriceValues: cartDebugSnapshot.cartPriceValues,
                displayedTotals: cartDebugSnapshot.displayedTotals,
                cartText: cartDebugSnapshot.cartText,
              },
              null,
              2
            ),
            contentType: 'application/json',
          })
          .catch(() => {});
      });

      /* ── 8. Cart pricing – Silver Single + Size 8 ──────── */

      test('Silver Single + Size 8 – cart reflects stacking price', async ({ page }, testInfo) => {
        let cartDebugSnapshot: CartPriceDebugSnapshot = {
          ...EMPTY_CART_PRICE_DEBUG_SNAPSHOT,
        };

        await test.step('Select Eternity Silver → Single', async () => {
          await selectStackingRing(page, 'Eternity Silver');
          await selectStackType(page, 'Eternity Silver', 'single');
        });

        await test.step('Select Size 8', async () => {
          await selectSize(page, '8');
        });

        await test.step('Skip optional sections', async () => {
          await skipOptionalSections(page);
        });

        await test.step('Click Add to Cart', async () => {
          const addBtn = page.getByTestId('ring-add-to-cart');
          await expect(addBtn).toBeEnabled({ timeout: ASSERT_TIMEOUT });
          await addBtn.click();
          await page.waitForTimeout(2_000);
        });

        await test.step('Validate cart contains stacking ring', async () => {
          const cartList = page.getByTestId('cart-list');
          await expect(cartList).toBeVisible({ timeout: ASSERT_TIMEOUT });
          const cartText = await cartList.innerText();
          expect(cartText, 'Cart should mention Eternity Silver stacking ring').toMatch(
            /Eternity Silver|Stacking/i
          );
        });

        await test.step('Validate cart total matches expected', async () => {
          cartDebugSnapshot = await getCartPriceDebugSnapshot(page);
          const { cartText, cartPriceValues, displayedTotals } = cartDebugSnapshot;
          const expectedTotalDigits = computeExpectedTotalDigits(basePrice, stackPrices.silver.single);
          const expectedTotalValue = parseInt(expectedTotalDigits, 10);
          const baseValue = parseInt(normalizePriceDigits(basePrice), 10);
          const stackValue = parseInt(normalizePriceDigits(stackPrices.silver.single), 10);
          const hasExpectedPair = hasPricePairSum(cartPriceValues, expectedTotalValue);
          const hasConfiguredStack = cartPriceValues.includes(stackValue);
          const hasDisplayedExpectedTotal = displayedTotals.includes(expectedTotalValue);

          expect(
            cartPriceValues.includes(baseValue),
            `Cart should contain base price ${basePrice}; detected prices: [${cartPriceValues.join(
              ', '
            )}], cart text: ${cartText}`
          ).toBe(true);

          expect(
            hasConfiguredStack,
            `Cart should contain configured stack price ${
              stackPrices.silver.single
            }; detected prices: [${cartPriceValues.join(', ')}], displayed totals: [${displayedTotals.join(
              ', '
            )}], cart text: ${cartText}`
          ).toBe(true);

          expect(
            hasExpectedPair || hasDisplayedExpectedTotal,
            `Cart total should match configured sum ${basePrice} + ${stackPrices.silver.single} = ${expectedTotalDigits}; detected prices: [${cartPriceValues.join(
              ', '
            )}], displayed totals: [${displayedTotals.join(', ')}], cart text: ${cartText}`
          ).toBe(true);
        });

        console.log(`[Stacking:${region.key}] Cart pricing: Silver Single + Size 8 ✓`);

        await testInfo
          .attach(`stacking-cart-silver-single-${region.key}`, {
            body: JSON.stringify(
              {
                region: region.name,
                ring: 'Eternity Silver',
                type: 'single',
                size: '8',
                expectedStack: stackPrices.silver.single,
                basePrice,
                cartPriceValues: cartDebugSnapshot.cartPriceValues,
                displayedTotals: cartDebugSnapshot.displayedTotals,
                cartText: cartDebugSnapshot.cartText,
              },
              null,
              2
            ),
            contentType: 'application/json',
          })
          .catch(() => {});
      });

      /* ── 9. Cart pricing – Gold Duo + Size 10 ──────────── */

      test('Gold Duo + Size 10 – cart reflects stacking price', async ({ page }, testInfo) => {
        let cartDebugSnapshot: CartPriceDebugSnapshot = {
          ...EMPTY_CART_PRICE_DEBUG_SNAPSHOT,
        };

        await test.step('Select Eternity Gold → Duo', async () => {
          await selectStackingRing(page, 'Eternity Gold');
          await selectStackType(page, 'Eternity Gold', 'duo');
        });

        await test.step('Select Size 10', async () => {
          await selectSize(page, '10');
        });

        await test.step('Skip optional sections', async () => {
          await skipOptionalSections(page);
        });

        await test.step('Click Add to Cart', async () => {
          const addBtn = page.getByTestId('ring-add-to-cart');
          await expect(addBtn).toBeEnabled({ timeout: ASSERT_TIMEOUT });
          await addBtn.click();
          await page.waitForTimeout(2_000);
        });

        await test.step('Validate cart contains stacking ring', async () => {
          const cartList = page.getByTestId('cart-list');
          await expect(cartList).toBeVisible({ timeout: ASSERT_TIMEOUT });
          const cartText = await cartList.innerText();
          expect(cartText, 'Cart should mention Eternity Gold stacking ring').toMatch(
            /Eternity Gold|Stacking/i
          );
        });

        await test.step('Validate cart total matches expected', async () => {
          cartDebugSnapshot = await getCartPriceDebugSnapshot(page);
          const { cartText, cartPriceValues, displayedTotals } = cartDebugSnapshot;
          const expectedTotalDigits = computeExpectedTotalDigits(basePrice, stackPrices.gold.duo);
          const expectedTotalValue = parseInt(expectedTotalDigits, 10);
          const baseValue = parseInt(normalizePriceDigits(basePrice), 10);
          const stackValue = parseInt(normalizePriceDigits(stackPrices.gold.duo), 10);
          const hasExpectedPair = hasPricePairSum(cartPriceValues, expectedTotalValue);
          const hasConfiguredStack = cartPriceValues.includes(stackValue);
          const hasDisplayedExpectedTotal = displayedTotals.includes(expectedTotalValue);

          expect(
            cartPriceValues.includes(baseValue),
            `Cart should contain base price ${basePrice}; detected prices: [${cartPriceValues.join(
              ', '
            )}], cart text: ${cartText}`
          ).toBe(true);

          expect(
            hasConfiguredStack,
            `Cart should contain configured stack price ${
              stackPrices.gold.duo
            }; detected prices: [${cartPriceValues.join(', ')}], displayed totals: [${displayedTotals.join(
              ', '
            )}], cart text: ${cartText}`
          ).toBe(true);

          expect(
            hasExpectedPair || hasDisplayedExpectedTotal,
            `Cart total should match configured sum ${basePrice} + ${stackPrices.gold.duo} = ${expectedTotalDigits}; detected prices: [${cartPriceValues.join(
              ', '
            )}], displayed totals: [${displayedTotals.join(', ')}], cart text: ${cartText}`
          ).toBe(true);
        });

        console.log(`[Stacking:${region.key}] Cart pricing: Gold Duo + Size 10 ✓`);

        await testInfo
          .attach(`stacking-cart-gold-duo-${region.key}`, {
            body: JSON.stringify(
              {
                region: region.name,
                ring: 'Eternity Gold',
                type: 'duo',
                size: '10',
                expectedStack: stackPrices.gold.duo,
                basePrice,
                cartPriceValues: cartDebugSnapshot.cartPriceValues,
                displayedTotals: cartDebugSnapshot.displayedTotals,
                cartText: cartDebugSnapshot.cartText,
              },
              null,
              2
            ),
            contentType: 'application/json',
          })
          .catch(() => {});
      });
    }); // end region describe
  } // end regions loop
});
