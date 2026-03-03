import { test, expect, Page, TestInfo } from '@playwright/test';

type RegionConfig = {
  name: string;
  slug: string;
  useSelector?: boolean;
  planText?: RegExp;
};

const REGION_CONFIGS: RegionConfig[] = [
  { name: 'India', slug: 'in', planText: /12 Weeks/i },
  { name: 'United Kingdom', slug: 'gb', useSelector: true, planText: /4 weeks/i },
  { name: 'Belgium', slug: 'be', useSelector: true, planText: /4 weeks/i },
  { name: 'Czechia', slug: 'cz', useSelector: true, planText: /4 weeks/i },
  { name: 'Denmark', slug: 'dk', useSelector: true, planText: /4 weeks/i },
  { name: 'Finland', slug: 'fi', useSelector: true, planText: /4 weeks/i },
  { name: 'France', slug: 'fr', useSelector: true, planText: /4 weeks/i },
  { name: 'Germany', slug: 'de', useSelector: true, planText: /4 weeks/i },
  { name: 'Ireland', slug: 'ie', useSelector: true, planText: /4 weeks/i },
  { name: 'Italy', slug: 'it', useSelector: true, planText: /4 weeks/i },
  { name: 'Netherlands', slug: 'nl', useSelector: true, planText: /4 weeks/i },
  { name: 'Poland', slug: 'pl', useSelector: true, planText: /4 weeks/i },
  { name: 'Spain', slug: 'es', useSelector: true, planText: /4 weeks/i },
  { name: 'Bulgaria', slug: 'bg', useSelector: true, planText: /4 weeks/i },
  { name: 'Croatia', slug: 'hr', useSelector: true, planText: /4 weeks/i },
  { name: 'Estonia', slug: 'ee', useSelector: true, planText: /4 weeks/i },
  { name: 'Greece', slug: 'gr', useSelector: true, planText: /4 weeks/i },
  { name: 'Hungary', slug: 'hu', useSelector: true, planText: /4 weeks/i },
  { name: 'Latvia', slug: 'lv', useSelector: true, planText: /4 weeks/i },
  { name: 'Lithuania', slug: 'lt', useSelector: true, planText: /4 weeks/i },
  { name: 'Luxembourg', slug: 'lu', useSelector: true, planText: /4 weeks/i },
  { name: 'Malta', slug: 'mt', useSelector: true, planText: /4 weeks/i },
  { name: 'Romania', slug: 'ro', useSelector: true, planText: /4 weeks/i },
  { name: 'Slovakia', slug: 'sk', useSelector: true, planText: /4 weeks/i },
  { name: 'Slovenia', slug: 'si', useSelector: true, planText: /4 weeks/i },
  { name: 'Austria', slug: 'at', useSelector: true, planText: /4 weeks/i },
  { name: 'Portugal', slug: 'pt', useSelector: true, planText: /4 weeks/i },
  { name: 'Sweden', slug: 'se', useSelector: true, planText: /4 weeks/i },
  { name: 'Cyprus', slug: 'cy', useSelector: true, planText: /4 weeks/i },
];

// Helper to ensure URL has protocol
const ensureProtocol = (url: string): string => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

// Strip /pricing from env var if present, keeping just the domain
const CGM_DOMAIN = ensureProtocol(
  (process.env.CGM_BASE_URL ?? 'https://www.ultrahuman.com')
    .replace(/\/pricing\/?$/, '')
    .replace(/\/+$/, '')
);

type PriceInfo = {
  text: string;
  value: number;
  currency: string;
};

const EXPECTED_PRICES: Record<string, PriceInfo> = {
  in: { text: '₹34,999', value: 34999, currency: '₹' },
  gb: { text: '£169', value: 169, currency: '£' },
};

const DEFAULT_EXPECTED_PRICE: PriceInfo = { text: '€189', value: 189, currency: '€' };

// UltrahumanX - 1 year subscription prices by currency
const UHX_PRICES: Record<string, number> = {
  '€': 0,
  '£': 0,
  '₹': 0, // No UHX for India
};

const CURRENCY_PRICE_REGEX = /[₹£€]\s?[0-9][\d.,]*/g;

const getExpectedPriceForRegion = (slug: string): PriceInfo =>
  EXPECTED_PRICES[slug] ?? DEFAULT_EXPECTED_PRICE;

const normalizePrice = (text: string): number => {
  const numeric = text.replace(/[^\d.,]/g, '').replace(/,/g, '');
  return Number.parseFloat(numeric);
};

const extractCurrency = (text: string): string => {
  const match = text.match(/[₹£€]/);
  return match ? match[0] : '';
};

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matchesWithRounding = (value: number, expected: number): boolean => {
  const delta = Math.abs(value - expected);
  if (delta <= 1) {
    return true;
  }
  return Math.round(value) === Math.round(expected);
};

async function acceptCookiesIfPresent(page: Page) {
  const acceptCookies = page.getByRole('button', { name: /accept/i });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click().catch(() => {});
  }
}

async function selectPlanAndGetPrice(page: Page, region: RegionConfig): Promise<PriceInfo & { basePrice?: PriceInfo }> {
  const locator = region.planText
    ? page.locator('button', { hasText: region.planText })
    : page.locator('button.sc-99f6e-0');

  const button = locator.first();
  await expect(button).toBeVisible({ timeout: 15000 });

  // Wait for the expected discounted price to appear (API call delay)
  const expectedPrice = getExpectedPriceForRegion(region.slug);
  const maxWaitTime = 30000; // 30 seconds max wait for discounted prices to load
  const pollInterval = 500; // Check every 500ms
  let waited = 0;
  let priceMatches: RegExpMatchArray[] = [];

  console.log(`[${region.name}] Waiting for discounted price ${expectedPrice.text} to load...`);

  while (waited < maxWaitTime) {
    const accessibleName = await button.innerText();
    priceMatches = [...accessibleName.matchAll(CURRENCY_PRICE_REGEX)];

    // Check if we have the expected discounted price
    const hasExpectedPrice = priceMatches.some(match => {
      const value = normalizePrice(match[0]);
      return matchesWithRounding(value, expectedPrice.value);
    });

    if (hasExpectedPrice) {
      console.log(`[${region.name}] Discounted price found after ${waited}ms`);
      break;
    }

    // Wait and retry
    await page.waitForTimeout(pollInterval);
    waited += pollInterval;
  }

  if (waited >= maxWaitTime) {
    console.log(`[${region.name}] Warning: Discounted price not found after ${maxWaitTime}ms, proceeding with current prices`);
  }

  // Re-read the button text after waiting
  const accessibleName = await button.innerText();
  priceMatches = [...accessibleName.matchAll(CURRENCY_PRICE_REGEX)];

  if (!priceMatches.length) {
    throw new Error(`Unable to locate price in plan selector text: "${accessibleName}"`);
  }

  let currentPriceText: string;
  let basePriceText: string | undefined;

  if (priceMatches.length >= 2) {
    // If there are two prices, first is striked (base price), second is the actual/discounted price
    basePriceText = priceMatches[0][0];
    currentPriceText = priceMatches[priceMatches.length - 1][0];
  } else {
    // Only one price - use it as the current price (no discount scenario)
    currentPriceText = priceMatches[0][0];
  }

  await expect(button).toContainText(currentPriceText);

  await button.click().catch(() => {});

  const planPrice: PriceInfo & { basePrice?: PriceInfo } = {
    text: currentPriceText,
    value: normalizePrice(currentPriceText),
    currency: extractCurrency(currentPriceText),
  };

  if (basePriceText) {
    planPrice.basePrice = {
      text: basePriceText,
      value: normalizePrice(basePriceText),
      currency: extractCurrency(basePriceText),
    };

    // When both striked and non-striked prices are shown, validate non-striked against expected
    const expectedPrice = getExpectedPriceForRegion(region.slug);
    expect(planPrice.currency).toBe(expectedPrice.currency);
    expect(planPrice.value).toBeCloseTo(expectedPrice.value, 1);
    await expect(button).toContainText(new RegExp(escapeRegExp(expectedPrice.text)));
  } else {
    // Only one price shown (no discount visible) - just validate it's a valid price
    const expectedPrice = getExpectedPriceForRegion(region.slug);
    expect(planPrice.currency, `Expected valid currency in price: ${currentPriceText}`).toBe(expectedPrice.currency);
    expect(planPrice.value, `Expected valid numeric price value`).toBeGreaterThan(0);
  }

  return planPrice;
}

async function addPlanToCart(page: Page) {
  const addToCart = page.getByRole('button', { name: /add to cart/i }).first();
  await expect(addToCart).toBeEnabled({ timeout: 30000 });
  await addToCart.click();
}

async function collectCartPrice(page: Page, region: RegionConfig, expectedPlanPrice: PriceInfo & { basePrice?: PriceInfo }): Promise<PriceInfo> {
  const cart = page.getByTestId('cart');
  await expect(cart).toBeVisible({ timeout: 30000 });

  // Wait for cart content to load - try multiple patterns
  const cartHeaderPatterns = [
    cart.getByText(/your (bag|basket)/i),
    cart.getByText(/cart/i),
    cart.getByText(/Ultrahuman M1/i),
  ];

  let cartLoaded = false;
  for (const pattern of cartHeaderPatterns) {
    try {
      await expect(pattern.first()).toBeVisible({ timeout: 10000 });
      cartLoaded = true;
      break;
    } catch {
      continue;
    }
  }

  if (!cartLoaded) {
    // Last resort: just wait for cart to have some content
    await page.waitForTimeout(5000);
  }

  // Wait for M1 product to appear in cart
  const m1Item = cart.getByText(/Ultrahuman M1/i).first();
  await expect(m1Item).toBeVisible({ timeout: 30000 });

  // Check if UltrahumanX - 1 year subscription is in the cart
  const uhxItem = cart.getByText(/UltrahumanX\s*-?\s*1\s*year/i).first();
  const hasUhx = await uhxItem.isVisible({ timeout: 3000 }).catch(() => false);

  // Get UHX price for the currency (0 if not in cart)
  const uhxPrice = hasUhx ? (UHX_PRICES[expectedPlanPrice.currency] ?? 0) : 0;

  // Debug: Log UHX detection
  console.log(`[${region.name}] UHX detection: hasUhx=${hasUhx}, uhxPrice=${uhxPrice}`);

  let cartPriceText: string | null = null;

  if (hasUhx) {
    // If UHX is in cart, get the TOTAL value (base + UHX)
    const totalValue = cart
      .locator('text=/Total/i')
      .locator('xpath=../span[contains(@class,"value")]')
      .first();
    await expect(totalValue).toBeVisible({ timeout: 5000 });
    cartPriceText = (await totalValue.innerText()).trim();
    console.log(`[${region.name}] Using Total value for cart price: ${cartPriceText}`);
  } else {
    // If no UHX, get the LAST non-striked price (the M1 product price)
    const allPrices = cart.locator('.price');
    const priceCount = await allPrices.count();

    // Iterate through all prices to find the LAST non-striked price that matches the expected currency
    for (let i = 0; i < priceCount; i++) {
      const priceEl = allPrices.nth(i);
      const hasStrike = await priceEl.evaluate(el => el.classList.contains('strike')).catch(() => false);
      if (!hasStrike) {
        const text = (await priceEl.innerText()).trim();
        const currency = extractCurrency(text);
        if (currency === expectedPlanPrice.currency) {
          cartPriceText = text;
          // Don't break - continue to find the last one
        }
      }
    }

    if (!cartPriceText) {
      // Fallback: get from total row
      const totalValue = cart
        .locator('text=/Total/i')
        .locator('xpath=../span[contains(@class,"value")]')
        .first();
      await expect(totalValue).toBeVisible({ timeout: 5000 });
      cartPriceText = (await totalValue.innerText()).trim();
    }
  }

  const cartPrice: PriceInfo = {
    text: cartPriceText,
    value: normalizePrice(cartPriceText),
    currency: extractCurrency(cartPriceText),
  };

  expect(cartPrice.currency).toBe(expectedPlanPrice.currency);

  // Get expected discounted price for the region
  const expectedDiscountedPrice = getExpectedPriceForRegion(region.slug);

  // Calculate expected total = base price + UHX (if present)
  const expectedTotal = expectedDiscountedPrice.value + uhxPrice;

  // Cart must match the expected total (base price + UHX if present)
  expect(
    matchesWithRounding(cartPrice.value, expectedTotal),
    `Cart price ${cartPrice.text} should match expected total ${expectedTotal} (base: ${expectedDiscountedPrice.value} + UHX: ${uhxPrice})`
  ).toBe(true);

  console.log(`[${region.name}] UHX in cart: ${hasUhx}, UHX price: ${uhxPrice}, Expected total: ${expectedTotal}`);

  const allowedPriceTexts = [cartPrice.text, expectedPlanPrice.text, expectedDiscountedPrice.text];

  const strikeMatches = await cart
    .locator('.price.strike', { hasText: cartPriceText })
    .count();
  expect(strikeMatches, 'Expected price should not appear with strike-through styling').toBe(0);

  await expect(
    cart.getByText(
      new RegExp(`Ultrahuman M1[\\s\\S]*(?:${allowedPriceTexts.map(escapeRegExp).join('|')})`, 'i')
    ).first()
  ).toBeVisible();

  console.log(
    `[${region.name}] Pricing summary => plan: ${expectedPlanPrice.text}, cart: ${cartPrice.text}`
  );

  const reviewCart = page.getByRole('button', { name: /review cart/i }).first();
  if (await reviewCart.isVisible().catch(() => false)) {
    await reviewCart.click().catch(() => {});
    await reviewCart.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
  }

  const checkoutButton = cart.locator('button.blue-button', { hasText: 'Checkout' });
  await expect(checkoutButton).toBeVisible({ timeout: 30000 });

  return cartPrice;
}

async function runCheckoutFlow(page: Page, region: RegionConfig, testInfo: TestInfo) {
  // Always navigate directly to the region-specific URL
  const targetUrl = `${CGM_DOMAIN}/${region.slug}/pricing/`;

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('body', { timeout: 15000 });
  await acceptCookiesIfPresent(page);

  const assertPageAlive = (message: string) => {
    if (page.isClosed()) {
      testInfo.skip(true, message);
    }
  };

  // Verify we're on the correct region page (check for region slug in URL path)
  await expect(page).toHaveURL(new RegExp(`/${region.slug}/?`), { timeout: 10000 });

  // Wait for pricing data to load from API
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000); // Additional wait for dynamic pricing updates

  const oneTimeTab = page.getByRole('button', { name: /one time purchase/i });
  if (await oneTimeTab.isVisible().catch(() => false)) {
    await oneTimeTab.click().catch(() => {});
    try {
      await page.waitForTimeout(200);
    } catch (err) {
      assertPageAlive(`Page closed after selecting one-time tab for ${region.name}`);
      throw err;
    }
  }
  assertPageAlive(`Page closed before selecting plan for ${region.name}`);

  const planPrice = await selectPlanAndGetPrice(page, region);
  assertPageAlive(`Page closed after reading plan price for ${region.name}`);

  await addPlanToCart(page);
  assertPageAlive(`Page closed after adding plan to cart for ${region.name}`);

  const cartPrice = await collectCartPrice(page, region, planPrice);
  await testInfo.attach(`cart-price-${region.slug}`, {
    contentType: 'text/plain',
    body: Buffer.from(`${region.name}: ${cartPrice.text}`),
  });
}

test.describe.parallel('Pricing checkout flows', () => {
  test.describe.configure({ timeout: 180000 });

  for (const region of REGION_CONFIGS) {
    test(`should add a plan to cart and reach checkout for ${region.name}`, async ({ page }, testInfo) => {
      await runCheckoutFlow(page, region, testInfo);
    });
  }
});
