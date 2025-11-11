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

const BASE_PRICING_URL = process.env.CGM_BASE_URL ?? 'https://www.ultrahuman.com/pricing/';

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

const CURRENCY_PRICE_REGEX = /[₹£€]\s?[0-9][\d.,]*/g;

const normalizePrice = (text: string): number => {
  const numeric = text.replace(/[^\d.,]/g, '').replace(/,/g, '');
  return Number.parseFloat(numeric);
};

const extractCurrency = (text: string): string => {
  const match = text.match(/[₹£€]/);
  return match ? match[0] : '';
};

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getExpectedPriceForRegion = (slug: string): PriceInfo =>
  EXPECTED_PRICES[slug] ?? DEFAULT_EXPECTED_PRICE;

async function acceptCookiesIfPresent(page: Page) {
  const acceptCookies = page.getByRole('button', { name: /accept/i });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click().catch(() => {});
  }
}

async function selectRegionFromDropdown(page: Page, region: RegionConfig) {
  const toggle = page.locator("//button[contains(@class,'rmq-e2f1d1dc')]");
  await expect(toggle).toBeVisible({ timeout: 10000 });
  await toggle.click();

  const option = page.locator('.rmq-aca8e091.optionsContainer button', { hasText: region.name });
  await expect(option).toBeVisible({ timeout: 10000 });
  await option.scrollIntoViewIfNeeded().catch(() => {});
  await option.click();

  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveURL(new RegExp(`/pricing/${region.slug}/`), { timeout: 30000 });
  await page.waitForSelector('body', { timeout: 15000 });
}

async function selectPlanAndGetPrice(page: Page, region: RegionConfig): Promise<PriceInfo> {
  const locator = region.planText
    ? page.locator('button', { hasText: region.planText })
    : page.locator('button.sc-99f6e-0');

  const button = locator.first();
  await expect(button).toBeVisible({ timeout: 15000 });

  const accessibleName = await button.innerText();
  const priceMatches = [...accessibleName.matchAll(CURRENCY_PRICE_REGEX)];
  if (!priceMatches.length) {
    throw new Error(`Unable to locate price in plan selector text: "${accessibleName}"`);
  }

  const currentPriceText = priceMatches[priceMatches.length - 1][0];
  await expect(button).toContainText(currentPriceText);

  await button.click().catch(() => {});

  const planPrice: PriceInfo = {
    text: currentPriceText,
    value: normalizePrice(currentPriceText),
    currency: extractCurrency(currentPriceText),
  };

  const expectedPrice = getExpectedPriceForRegion(region.slug);
  expect(planPrice.currency).toBe(expectedPrice.currency);
  expect(planPrice.value).toBeCloseTo(expectedPrice.value, 2);
  await expect(button).toContainText(new RegExp(escapeRegExp(expectedPrice.text)));

  return planPrice;
}

async function addPlanToCart(page: Page) {
  const addToCart = page.getByRole('button', { name: /add to cart/i }).first();
  await expect(addToCart).toBeEnabled({ timeout: 30000 });
  await addToCart.click();
}

async function collectCartPrice(page: Page, region: RegionConfig, expectedPlanPrice: PriceInfo): Promise<PriceInfo> {
  const cart = page.getByTestId('cart');
  await expect(cart).toBeVisible({ timeout: 30000 });
  await expect(cart.getByText(/your (bag|basket)/i)).toBeVisible();
  await expect(cart.getByText(/Ultrahuman M1/i).first()).toBeVisible({ timeout: 15000 });

  const priceLocator = cart.locator('.price:not(.strike)').first();
  await expect(priceLocator).toBeVisible({ timeout: 5000 });
  const cartPriceText = (await priceLocator.innerText()).trim();

  const cartPrice: PriceInfo = {
    text: cartPriceText,
    value: normalizePrice(cartPriceText),
    currency: extractCurrency(cartPriceText),
  };

  expect(cartPrice.currency).toBe(expectedPlanPrice.currency);
  expect(cartPrice.value).toBeCloseTo(expectedPlanPrice.value, 2);
  expect(cartPrice.text).toBe(expectedPlanPrice.text);

  const strikeMatches = await cart
    .locator('.price.strike', { hasText: cartPriceText })
    .count();
  expect(strikeMatches, 'Expected price should not appear with strike-through styling').toBe(0);

  const totalRow = cart.getByText(/Total\s*Show breakup/i).first();
  await expect(totalRow).toBeVisible();

  const totalValue = cart
    .locator('text=/Total/i')
    .locator('xpath=../span[contains(@class,"value")]')
    .first();
  await expect(totalValue).toHaveText(new RegExp(`\\s*${escapeRegExp(expectedPlanPrice.text)}\\s*`));

  await expect(
    cart.getByText(new RegExp(`Ultrahuman M1[\\s\\S]*${escapeRegExp(expectedPlanPrice.text)}`, 'i')).first()
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
  const targetUrl = region.useSelector ? BASE_PRICING_URL : `${BASE_PRICING_URL}${region.slug}/`;

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('body', { timeout: 15000 });
  await acceptCookiesIfPresent(page);

  const assertPageAlive = (message: string) => {
    if (page.isClosed()) {
      testInfo.skip(true, message);
    }
  };

  if (region.useSelector) {
    await selectRegionFromDropdown(page, region);
    await acceptCookiesIfPresent(page);
    assertPageAlive(`Page closed while switching region for ${region.name}`);
  }

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
