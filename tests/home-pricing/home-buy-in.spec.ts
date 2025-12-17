import { test, expect, Page, Locator, TestInfo } from '@playwright/test';

const HOME_BUY_BASE_URL =
  process.env.HOME_BUY_BASE_URL ?? 'https://www.ultrahuman.com/home/buy/';

const ORDER_SUMMARY_SELECTOR = '#order-summary-card';
const CART_LIST_TEST_ID = 'cart-list';
const CART_PANEL_TEST_ID = 'cart';
const ASSERT_TIMEOUT = 25000;
const REGION_SELECTOR_RETRIES = 3;
const REGION_SWITCH_DELAY_MS = 700;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeNewlines = (value: string) => value.replace(/\u00A0/g, ' ');
const normalizeWhitespace = (value: string | null | undefined) =>
  (value ?? '').replace(/\s+/g, ' ').trim();

const textContainsPrice = (text: string, price: string) => {
  const pattern = new RegExp(escapeRegExp(price).replace(/\s+/g, '\\s*'), 'i');
  return pattern.test(normalizeNewlines(text));
};

const sanitizeSearchTerm = (value: string | undefined) =>
  (value ?? '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

const REGION_CONFIGS = [
  {
    name: 'India',
    slug: 'in',
    optionLabel: '🇮🇳India',
    optionLabels: ['🇮🇳 IN', 'India'],
    basePrice: '₹29,699.46',
    coverageOneYear: '₹2,988',
    coverageTwoYear: '₹4,440',
    orderSummary: '₹34,139.46',
    cartCoverage: '₹4,440',
    cartTotal: '₹34,139.46',
  },
  {
    name: 'United Arab Emirates',
    slug: 'ae',
    optionLabel: '🇦🇪United Arab Emirates',
    optionLabels: ['🇦🇪 AE', 'United Arab Emirates', 'UAE'],
    basePrice: 'AED 1,259.37',
    coverageOneYear: 'AED 144',
    coverageTwoYear: 'AED 192',
    orderSummary: 'AED 1,451.37',
    cartCoverage: 'AED 192',
    cartTotal: 'AED 1,451.37',
  },
  {
    name: 'United States',
    slug: 'us',
    optionLabel: '🇺🇸United States',
    optionLabels: ['🇺🇸 US', 'United States', 'USA'],
    basePrice: '$340.38',
    coverageOneYear: '$36',
    coverageTwoYear: '$54',
    orderSummary: '$394.38',
    cartCoverage: '$54',
    cartTotal: '$394.38',
  },
  {
    name: 'United Kingdom',
    slug: 'uk',
    optionLabel: '🇬🇧United Kingdom',
    optionLabels: ['🇬🇧 UK', 'United Kingdom', 'UK'],
    basePrice: '£322.74',
    coverageOneYear: '£36',
    coverageTwoYear: '£54',
    orderSummary: '£376.74',
    cartCoverage: '£54',
    cartTotal: '£376.74',
  },
  {
    name: 'Canada',
    slug: 'ca',
    optionLabel: '🇨🇦Canada',
    optionLabels: ['🇨🇦 CA', 'Canada'],
    basePrice: 'C$469.09',
    coverageOneYear: 'C$49',
    coverageTwoYear: 'C$79',
    orderSummary: 'C$548.09',
    cartCoverage: 'C$79',
    cartTotal: 'C$548.09',
  },
  {
    name: 'Australia',
    slug: 'au',
    optionLabel: '🇦🇺Australia',
    optionLabels: ['🇦🇺 AU', 'Australia'],
    basePrice: 'A$849',
    coverageOneYear: 'A$59',
    coverageTwoYear: 'A$89',
    orderSummary: 'A$938',
    cartCoverage: 'A$89',
    cartTotal: 'A$938',
  },
];

type RegionConfig = (typeof REGION_CONFIGS)[number];

type PriceSnapshot = {
  region: string;
  slug: string;
  expected: {
    basePrice: string;
    coverageOneYear: string;
    coverageTwoYear: string;
    orderSummary: string;
    cartCoverage: string;
    cartTotal: string;
  };
  actual: {
    pricingPage: {
      basePrice: string;
      coverageOneYear: string;
      coverageTwoYear: string;
      orderSummary: string;
    };
    cart: {
      productPrice: string;
      coveragePrice: string;
      total: string;
    };
  };
};

const createPriceSnapshot = (region: RegionConfig): PriceSnapshot => ({
  region: region.name,
  slug: region.slug,
  expected: {
    basePrice: region.basePrice,
    coverageOneYear: region.coverageOneYear,
    coverageTwoYear: region.coverageTwoYear,
    orderSummary: region.orderSummary,
    cartCoverage: region.cartCoverage,
    cartTotal: region.cartTotal,
  },
  actual: {
    pricingPage: {
      basePrice: '',
      coverageOneYear: '',
      coverageTwoYear: '',
      orderSummary: '',
    },
    cart: {
      productPrice: '',
      coveragePrice: '',
      total: '',
    },
  },
});

const extractMatchingText = async (locator: Locator, expected: string): Promise<string> => {
  try {
    const text = normalizeWhitespace(await locator.innerText());
    if (!text) return '';
    const pattern = new RegExp(escapeRegExp(expected).replace(/\s+/g, '\\s*'), 'i');
    const match = text.match(pattern);
    return match ? normalizeWhitespace(match[0]) : '';
  } catch {
    return '';
  }
};

const expectAndCapture = async (
  locator: Locator,
  expectedText: string,
  context: string,
  snapshotSection: Record<string, string>,
  key: string
) => {
  await expect(locator, context).toContainText(expectedText, { timeout: ASSERT_TIMEOUT });
  snapshotSection[key] = await extractMatchingText(locator, expectedText);
};

async function acceptCookiesIfPresent(page: Page) {
  const acceptButton = page.getByRole('button', { name: /accept|allow all|got it/i });
  if (await acceptButton.isVisible().catch(() => false)) {
    await acceptButton.click().catch(() => {});
  }
}

async function openRegionSelector(page: Page) {
  const selectors: Locator[] = [];

  selectors.push(page.locator('button').filter({ hasText: /Shipping\s+to/i }));
  selectors.push(page.getByRole('button', { name: /Shipping\s+to/i }));
  selectors.push(page.locator('[data-testid*="country-selector"] button'));
  selectors.push(page.locator('[data-testid*="region-selector"]'));
  selectors.push(page.locator('button:has-text("Others")'));
  selectors.push(page.locator('[aria-haspopup="dialog"]').filter({ hasText: /Shipping/i }));
  selectors.push(page.locator('button:has-text("UK")'));
  selectors.push(page.locator('button:has-text("United")'));

  for (const locator of selectors) {
    const count = await locator.count();
    for (let i = 0; i < count; i++) {
      const candidate = locator.nth(i);
      if (!(await candidate.isVisible().catch(() => false))) continue;
      try {
        await candidate.click();
        await page.waitForTimeout(200);
        return true;
      } catch {
        continue;
      }
    }
  }
  return false;
}

const buildLabelRegex = (label: string) =>
  new RegExp(escapeRegExp(label).replace(/\s+/g, '\\s*'), 'i');

async function selectRegionOption(page: Page, region: RegionConfig): Promise<boolean> {
  const labels = [region.optionLabel, ...(region.optionLabels ?? []), region.name]
    .filter(Boolean)
    .map((label) => buildLabelRegex(label!));

  const genericLocator = page.locator(
    'button,[role="option"],li,[data-testid*="option"],[data-testid*="country"]'
  );

  for (const pattern of labels) {
    const buttonMatch = page.getByRole('button', { name: pattern });
    if (await clickAny(buttonMatch)) {
      return true;
    }

    const optionMatch = page.getByRole('option', { name: pattern });
    if (await clickAny(optionMatch)) {
      return true;
    }

    const genericMatch = genericLocator.filter({ hasText: pattern });
    if (await clickAny(genericMatch)) {
      return true;
    }

    const textMatch = page.getByText(pattern);
    if (await clickAny(textMatch)) {
      return true;
    }
  }
  return false;
}

async function ensureRegion(page: Page, region: RegionConfig, summaryLocator?: Locator) {
  const summary = summaryLocator ?? page.locator(ORDER_SUMMARY_SELECTOR);
  await summary.waitFor({ state: 'visible', timeout: ASSERT_TIMEOUT });

  const hasExpectedPrice = async () => {
    try {
      await expect(summary).toContainText(region.basePrice, { timeout: 500 });
      return true;
    } catch {
      return false;
    }
  };

  if (await hasExpectedPrice()) {
    return;
  }

  const mainContent = page.locator('#main-content');
  const innerText = await mainContent.innerText().catch(() => '');
  if (textContainsPrice(innerText, region.basePrice) && (await hasExpectedPrice())) {
    return;
  }

  for (let attempt = 0; attempt < REGION_SELECTOR_RETRIES; attempt++) {
    const opened = await openRegionSelector(page);
    expect(opened, 'Region selector could not be opened').toBeTruthy();
    await filterRegionOptions(page, region).catch(() => {});
    const selected = await selectRegionOption(page, region);
    expect(selected, `Unable to select region ${region.name}`).toBeTruthy();
    await page.waitForTimeout(REGION_SWITCH_DELAY_MS);
    if (await hasExpectedPrice()) {
      return;
    }
  }

  throw new Error(`Region ${region.name} pricing did not update to ${region.basePrice}`);
}

async function selectCoverageOptions(page: Page, coverageOneYear: string, coverageTwoYear: string) {
  const oneYearBtn = page
    .getByRole('button', {
      name: new RegExp(`1 Year Coverage\\s*${escapeRegExp(coverageOneYear)}`, 'i'),
    })
    .first();
  await expect(oneYearBtn).toBeVisible({ timeout: ASSERT_TIMEOUT });
  await oneYearBtn.click();

  const twoYearBtn = page
    .getByRole('button', {
      name: new RegExp(`2 Year Coverage[\\s\\S]*${escapeRegExp(coverageTwoYear)}`, 'i'),
    })
    .first();
  await expect(twoYearBtn).toBeVisible({ timeout: ASSERT_TIMEOUT });
  await twoYearBtn.click();

  return { oneYearBtn, twoYearBtn };
}

async function clickAddToCart(page: Page) {
  const orderSummaryAdd = page.locator(ORDER_SUMMARY_SELECTOR).getByRole('button', { name: /add to cart/i });
  if (await tryClick(orderSummaryAdd)) {
    return;
  }
  const secondaryAdd = page.getByRole('button', { name: /add to cart/i }).nth(1);
  if (await tryClick(secondaryAdd)) {
    return;
  }
  throw new Error('Unable to locate Add to cart button');
}

async function tryClick(locator: Locator) {
  try {
    await locator.waitFor({ state: 'visible', timeout: 5000 });
    await locator.click();
    return true;
  } catch {
    return false;
  }
}

async function clickIfVisible(locator: Locator, timeout = 5000) {
  try {
    await locator.waitFor({ state: 'visible', timeout });
    await locator.click();
    return true;
  } catch {
    return false;
  }
}

async function clickAny(locator: Locator, timeout = 5000): Promise<boolean> {
  const count = await locator.count();
  for (let i = 0; i < count; i++) {
    const candidate = locator.nth(i);
    if (await clickIfVisible(candidate, timeout)) {
      return true;
    }
  }
  return false;
}

async function filterRegionOptions(page: Page, region: RegionConfig) {
  const searchSelectors = [
    '[data-testid*="search"] input',
    'input[type="search"]',
    'input[role="searchbox"]',
    'input[placeholder*="Search" i]',
    'input[aria-label*="search" i]',
  ];

  const searchTerm =
    [region.name, region.optionLabel, ...(region.optionLabels ?? [])]
      .map((term) => sanitizeSearchTerm(term))
      .find(Boolean) ?? '';
  if (!searchTerm) return false;

  for (const selector of searchSelectors) {
    const inputs = page.locator(selector);
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      if (!(await input.isVisible().catch(() => false))) continue;
      try {
        await input.click({ timeout: 1000 });
        await input.fill('');
        await input.type(searchTerm, { delay: 35 });
        await page.waitForTimeout(400);
        return true;
      } catch {
        continue;
      }
    }
  }
  return false;
}

async function openCart(page: Page) {
  const cartList = page.getByTestId(CART_LIST_TEST_ID);
  await cartList.waitFor({ state: 'visible', timeout: 30000 });
  const reviewCart = page.getByRole('button', { name: /review cart/i });
  if (await reviewCart.isVisible().catch(() => false)) {
    await reviewCart.click().catch(() => {});
    await cartList.waitFor({ state: 'visible', timeout: 15000 });
  }
}

async function closeCartIfVisible(page: Page) {
  const closeSelectors = [
    page.locator('.close-btn'),
    page.getByRole('button', { name: /close/i }),
    page.getByRole('button', { name: /continue shopping/i }),
  ];

  for (const locator of closeSelectors) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.click().catch(() => {});
      await page.waitForTimeout(500);
      break;
    }
  }
}

test.describe.configure({ mode: 'parallel', timeout: 180000 });

test.describe('Ultrahuman Home pricing with UHX coverage', () => {
  for (const region of REGION_CONFIGS) {
    test(`${region.name} pricing + cart validation`, async ({ page }, testInfo: TestInfo) => {
      const priceSnapshot = createPriceSnapshot(region);

      await test.step('Navigate & prepare page', async () => {
        await page.goto(`${HOME_BUY_BASE_URL}${region.slug}/`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        await page.waitForSelector('#main-content', { timeout: 30000 });
        await acceptCookiesIfPresent(page);
      });

      const orderSummaryCard = page.locator(ORDER_SUMMARY_SELECTOR);
      await orderSummaryCard.waitFor({ state: 'visible', timeout: ASSERT_TIMEOUT });
      await ensureRegion(page, region, orderSummaryCard);

      await test.step('Validate pricing options', async () => {
        await expectAndCapture(
          orderSummaryCard,
          region.basePrice,
          `${region.name} base price`,
          priceSnapshot.actual.pricingPage,
          'basePrice'
        );

        const { oneYearBtn, twoYearBtn } = await selectCoverageOptions(
          page,
          region.coverageOneYear,
          region.coverageTwoYear
        );

        await expectAndCapture(
          oneYearBtn,
          region.coverageOneYear,
          `${region.name} 1-year coverage`,
          priceSnapshot.actual.pricingPage,
          'coverageOneYear'
        );
        await expectAndCapture(
          twoYearBtn,
          region.coverageTwoYear,
          `${region.name} 2-year coverage`,
          priceSnapshot.actual.pricingPage,
          'coverageTwoYear'
        );

        await expectAndCapture(
          orderSummaryCard,
          region.orderSummary,
          `${region.name} order summary`,
          priceSnapshot.actual.pricingPage,
          'orderSummary'
        );
      });

      await test.step('Add to cart & verify totals', async () => {
        await clickAddToCart(page);
        await openCart(page);

        const cartList = page.getByTestId(CART_LIST_TEST_ID);
        await expectAndCapture(
          cartList,
          region.basePrice,
          `${region.name} cart base price`,
          priceSnapshot.actual.cart,
          'productPrice'
        );
        await expectAndCapture(
          cartList,
          region.cartCoverage,
          `${region.name} cart coverage price`,
          priceSnapshot.actual.cart,
          'coveragePrice'
        );

        const cartSummary = page.getByTestId(CART_PANEL_TEST_ID);
        await expectAndCapture(
          cartSummary,
          region.cartTotal,
          `${region.name} cart total`,
          priceSnapshot.actual.cart,
          'total'
        );

        await closeCartIfVisible(page);
      });

      console.log(
        `[${region.name}] Pricing snapshot`,
        JSON.stringify(priceSnapshot, null, 2)
      );
      await testInfo.attach(`${region.slug}-pricing`, {
        body: Buffer.from(JSON.stringify(priceSnapshot, null, 2)),
        contentType: 'application/json',
      });
    });
  }
});
