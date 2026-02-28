import { test, expect, Page, Locator } from '@playwright/test';
import { shopUrl } from '../common/url-builder';

const ASSERT_TIMEOUT = 30_000;
const STACKING_BASE_URL = process.env.STACKING_BASE_URL
  ? process.env.STACKING_BASE_URL.replace(/\/+$/, '')
  : 'https://www.ultrahuman.com/';
const PRICE_TOKEN_REGEX =
  /(?:MXN\s*\$|C\$|A\$|SAR|AED|USD|SGD|AUD|INR|₹|£|€|\$)\s*[\d.,]+/gi;

type ProductTemplate = {
  title: string;
  openByTitleFirst: boolean;
  breakupLabel: string;
  cartLabel: string;
};

type RegionConfig = {
  name: string;
  slug: string;
};

const REGIONS: RegionConfig[] = [
  { name: 'India', slug: 'in' },
  { name: 'USA / Global', slug: 'global' },
  { name: 'Austria / EU', slug: 'at' },
  { name: 'United Kingdom', slug: 'gb' },
  { name: 'Australia', slug: 'au' },
  { name: 'Canada', slug: 'ca' },
  { name: 'United Arab Emirates', slug: 'ae' },
];

const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    title: 'Bling Eternity Silver - Duo',
    openByTitleFirst: false,
    breakupLabel: 'Ultrahuman Bling - Stacking Ring Duo',
    cartLabel: 'Ultrahuman Bling - Stacking Ring Duo',
  },
  {
    title: 'Bling Eternity Gold - Duo',
    openByTitleFirst: true,
    breakupLabel: 'Ultrahuman Bling - Stacking Ring Duo',
    cartLabel: 'Ultrahuman Bling - Stacking Ring Duo',
  },
  {
    title: 'Bling Eternity Silver - Single',
    openByTitleFirst: true,
    breakupLabel: 'Ultrahuman Bling - Stacking Ring',
    cartLabel: 'Ultrahuman Bling - Stacking Ring',
  },
  {
    title: 'Bling Eternity Gold - Single',
    openByTitleFirst: true,
    breakupLabel: 'Ultrahuman Bling - Stacking Ring',
    cartLabel: 'Ultrahuman Bling - Stacking Ring',
  },
];

/* ─── expected retail prices ─────────────────────────────────────────── */

type RegionSlug = (typeof REGIONS)[number]['slug'];
type ProductTitle = (typeof PRODUCT_TEMPLATES)[number]['title'];

const EXPECTED_PRICES: Record<RegionSlug, Record<ProductTitle, string>> = {
  in: {
    'Bling Eternity Silver - Single': '₹4,999',
    'Bling Eternity Gold - Single': '₹4,999',
    'Bling Eternity Silver - Duo': '₹8,999',
    'Bling Eternity Gold - Duo': '₹8,999',
  },
  global: {
    'Bling Eternity Silver - Single': '$49',
    'Bling Eternity Gold - Single': '$49',
    'Bling Eternity Silver - Duo': '$89',
    'Bling Eternity Gold - Duo': '$89',
  },
  at: {
    'Bling Eternity Silver - Single': '€45',
    'Bling Eternity Gold - Single': '€45',
    'Bling Eternity Silver - Duo': '€79',
    'Bling Eternity Gold - Duo': '€79',
  },
  gb: {
    'Bling Eternity Silver - Single': '£39',
    'Bling Eternity Gold - Single': '£39',
    'Bling Eternity Silver - Duo': '£69',
    'Bling Eternity Gold - Duo': '£69',
  },
  au: {
    'Bling Eternity Silver - Single': 'A$69',
    'Bling Eternity Gold - Single': 'A$69',
    'Bling Eternity Silver - Duo': 'A$129',
    'Bling Eternity Gold - Duo': 'A$129',
  },
  ca: {
    'Bling Eternity Silver - Single': 'C$65',
    'Bling Eternity Gold - Single': 'C$65',
    'Bling Eternity Silver - Duo': 'C$125',
    'Bling Eternity Gold - Duo': 'C$125',
  },
  ae: {
    'Bling Eternity Silver - Single': 'AED 179',
    'Bling Eternity Gold - Single': 'AED 179',
    'Bling Eternity Silver - Duo': 'AED 329',
    'Bling Eternity Gold - Duo': 'AED 329',
  },
};

function normalizeSpace(text: string): string {
  return text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizePriceDigits(text: string): string {
  return text.replace(/[^\d]/g, '');
}

function priceRegex(price: string): RegExp {
  return new RegExp(escapeRegex(price).replace(/\s+/g, '\\s*'), 'i');
}

function extractPriceTokens(text: string): string[] {
  const normalized = normalizeSpace(text);
  const matches = normalized.match(PRICE_TOKEN_REGEX) ?? [];
  return matches.map((token) => normalizeSpace(token));
}

function pickFirstPriceToken(text: string): string | null {
  const [first] = extractPriceTokens(text);
  return first ?? null;
}

async function getProductCardDisplayedPrice(card: Locator, productTitle: string): Promise<string> {
  const cardText = await card.innerText();
  const price = pickFirstPriceToken(cardText);
  if (!price) {
    throw new Error(`Unable to read displayed price from shop card for "${productTitle}"`);
  }
  return price;
}

function assertPriceMatch(actualText: string, expectedPrice: string) {
  const actual = normalizeSpace(actualText);
  const expected = normalizeSpace(expectedPrice);
  if (actual.includes(expected)) return;
  expect(normalizePriceDigits(actual)).toContain(normalizePriceDigits(expected));
}

async function openShop(page: Page, regionSlug: string) {
  const url = shopUrl(STACKING_BASE_URL, regionSlug);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  } catch {
    await page.waitForTimeout(1_000);
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  }
}

async function dismissCookieBanner(page: Page) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const candidates: Locator[] = [
      page.getByRole('button', { name: /^Accept$/i }).first(),
      page.getByRole('button', { name: /^Reject$/i }).first(),
      page.getByText(/^Accept$/i).first(),
      page.getByText(/^Reject$/i).first(),
    ];

    let clicked = false;
    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 1_500 }).catch(() => false)) {
        await candidate.click({ force: true }).catch(() => {});
        await page.waitForTimeout(250);
        clicked = true;
      }
    }

    if (clicked) {
      return;
    }

    await page.waitForTimeout(750);
  }
}

async function closeUpsellIfPresent(page: Page) {
  const closeCandidates: Locator[] = [
    page
      .locator('.UpsellModal__Header-sc-4b8c899b-3 > .UpsellModal__CloseButton-sc-4b8c899b-6')
      .first(),
    page.locator('[class*="UpsellModal__CloseButton"]').first(),
    page.getByRole('button', { name: /close/i }).first(),
  ];
  for (const close of closeCandidates) {
    if (await close.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await close.click({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
      return;
    }
  }
}

function getProductCard(page: Page, title: string): Locator {
  const titleNode = page.getByText(title, { exact: false }).first();
  return titleNode.locator(
    'xpath=ancestor::*[self::div or self::section][.//button[contains(normalize-space(.), "Add to cart")]][1]'
  );
}

async function clickQuickAddForProduct(page: Page, product: ProductTemplate): Promise<Locator> {
  const card = getProductCard(page, product.title);
  await expect(card, `Expected product card for ${product.title}`).toBeVisible({
    timeout: ASSERT_TIMEOUT,
  });

  if (product.openByTitleFirst) {
    const title = card.getByText(product.title, { exact: false }).first();
    if (await title.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await title.click({ force: true }).catch(() => {});
      await page.waitForTimeout(200);
    }
  }

  const addToCart = card.getByRole('button', { name: /^Add to cart$/i }).first();
  if (await addToCart.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await addToCart.click({ force: true });
    await page.waitForTimeout(200);
    return card;
  }

  const quickAdd = card.locator('.quickAdd').first();
  if (await quickAdd.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await quickAdd.click({ force: true });
    await page.waitForTimeout(200);
    return card;
  }

  const addFor = card.getByRole('button', { name: /Add to cart for/i }).first();
  if (await addFor.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return card;
  }

  throw new Error(`Unable to open quick add for ${product.title}`);
}

async function maybeSelectSize(card: Locator): Promise<string | null> {
  const sizeSeven = card.getByRole('button', { name: '7', exact: true }).first();
  if (await sizeSeven.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await sizeSeven.click({ force: true });
    await sizeSeven.page().waitForTimeout(300);
    return '7';
  }

  // Fallback: choose any visible numeric size button so flow can continue.
  const anySize = card
    .locator('button')
    .filter({ hasText: /^\s*(?:[5-9]|1[0-4])\s*$/ })
    .first();
  if (await anySize.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const selected = (await anySize.innerText()).replace(/\s+/g, ' ').trim() || 'unknown';
    await anySize.click({ force: true });
    await anySize.page().waitForTimeout(300);
    return selected;
  }

  return null;
}

async function clickAddToCartFor(page: Page, card: Locator, price: string) {
  const reviewCartNow = page.getByRole('button', { name: /Review cart/i }).first();
  if (await reviewCartNow.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  const addFor = card.getByRole('button', { name: /Add to cart for/i }).first();
  if (await addFor.isVisible({ timeout: 5_000 }).catch(() => false)) {
    if (!(await addFor.isEnabled().catch(() => false))) {
      const sizeSeven = card.getByRole('button', { name: '7', exact: true }).first();
      if (await sizeSeven.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await sizeSeven.click({ force: true }).catch(() => {});
      }
      if (!(await addFor.isEnabled().catch(() => false))) {
        const anySize = card
          .locator('button')
          .filter({ hasText: /^\s*(?:[5-9]|1[0-4])\s*$/ })
          .first();
        if (await anySize.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await anySize.click({ force: true }).catch(() => {});
        }
      }
    }

    await expect(addFor).toBeEnabled({ timeout: ASSERT_TIMEOUT });
    const text = await addFor.innerText();
    assertPriceMatch(text, price);
    await addFor.click({ force: true });
    await page.waitForTimeout(400);
    return;
  }

  const fallback = card.getByRole('button', { name: /Add to cart for/i }).first();
  if (await fallback.isVisible({ timeout: 4_000 }).catch(() => false)) {
    const text = await fallback.innerText();
    if (/\d/.test(text)) {
      assertPriceMatch(text, price);
    }
    await fallback.click({ force: true });
    await page.waitForTimeout(400);
    return;
  }

  const addToCartSimple = card.getByRole('button', { name: /^Add to cart$/i }).first();
  if (await addToCartSimple.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await addToCartSimple.click({ force: true });
    await page.waitForTimeout(400);
    return;
  }

  const reviewCartAfter = page.getByRole('button', { name: /Review cart/i }).first();
  await expect(reviewCartAfter, `Expected add-to-cart action to expose cart CTA for ${price}`).toBeVisible(
    { timeout: ASSERT_TIMEOUT }
  );
}

async function clickReviewCart(page: Page) {
  const cartListVisible = page.getByTestId('cart-list').first();
  if (await cartListVisible.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  const reviewCart = page.getByRole('button', { name: 'Review cart' }).first();
  if (await reviewCart.isVisible({ timeout: 6_000 }).catch(() => false)) {
    await reviewCart.click({ force: true });
    return;
  }

  await closeUpsellIfPresent(page);

  const reviewFallback = page.getByRole('button', { name: /Review cart/i }).first();
  if (await reviewFallback.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await reviewFallback.click({ force: true });
    return;
  }

  const cartHeading = page.getByRole('heading', { name: /Your cart/i }).first();
  if (await cartHeading.isVisible({ timeout: 3_000 }).catch(() => false)) {
    return;
  }

  const cartTriggers: Locator[] = [
    page.getByRole('button', { name: /cart/i }).first(),
    page.getByRole('link', { name: /cart/i }).first(),
    page.locator('[aria-label*="cart" i]').first(),
  ];
  for (const trigger of cartTriggers) {
    if (await trigger.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await trigger.click({ force: true }).catch(() => {});
      if (await cartListVisible.isVisible({ timeout: 4_000 }).catch(() => false)) {
        return;
      }
      if (await cartHeading.isVisible({ timeout: 1_500 }).catch(() => false)) {
        return;
      }
    }
  }

  // Cart drawer can appear with a delay after add-to-cart network call.
  await page.waitForTimeout(5_000);
  if (await cartListVisible.isVisible({ timeout: 1_500 }).catch(() => false)) {
    return;
  }
  if (await cartHeading.isVisible({ timeout: 1_500 }).catch(() => false)) {
    return;
  }

  throw new Error('Unable to open cart: no Review cart CTA or cart panel detected');
}

async function resolveCartContainer(page: Page): Promise<Locator> {
  const cartList = page.getByTestId('cart-list').first();
  if (await cartList.isVisible({ timeout: 3_000 }).catch(() => false)) {
    return cartList;
  }

  const cartPanel = page
    .locator('aside,section,div')
    .filter({ has: page.getByRole('heading', { name: /Your cart/i }).first() })
    .first();
  await expect(cartPanel, 'Expected cart panel to be visible').toBeVisible({
    timeout: ASSERT_TIMEOUT,
  });
  return cartPanel;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('Ring Stacking – Shop to Cart validation', () => {
  test.setTimeout(150_000);

  for (const region of REGIONS) {
    for (const product of PRODUCT_TEMPLATES) {
      const regionId = region.slug.toUpperCase();

      test(`${regionId} shop: ${product.title} cart validation`, async ({ page }, testInfo) => {
        let selectedSize: string | null = null;
        let pricingPagePrice = '';
        let cartDetectedPrices: string[] = [];
        let breakupDetectedPrices: string[] = [];

        await openShop(page, region.slug);
        await dismissCookieBanner(page);

        await test.step(`Add ${product.title} with size 7`, async () => {
          const productCard = await clickQuickAddForProduct(page, product);

          pricingPagePrice = await getProductCardDisplayedPrice(productCard, product.title);

          // ✅ Validate shop card price matches expected retail price for region + product
          const expectedPrice = EXPECTED_PRICES[region.slug as RegionSlug][product.title as ProductTitle];
          assertPriceMatch(pricingPagePrice, expectedPrice);

          selectedSize = await maybeSelectSize(productCard);
          await clickAddToCartFor(page, productCard, pricingPagePrice);
        });

        await test.step('Open review cart', async () => {
          await clickReviewCart(page);
        });

        await test.step('Validate product and price in cart list', async () => {
          const cartList = await resolveCartContainer(page);

          const cartProductRow = cartList.getByText(product.cartLabel, { exact: false }).first();
          await expect(cartProductRow).toBeVisible({ timeout: ASSERT_TIMEOUT });
          await cartProductRow.scrollIntoViewIfNeeded().catch(() => {});
          await cartProductRow.click({ force: true }).catch(() => {});

          const cartTextRaw = await cartList.innerText();
          const cartText = normalizeSpace(cartTextRaw);
          cartDetectedPrices = extractPriceTokens(cartTextRaw);

          const priceMatchesCart = cartDetectedPrices.some(
            (token) => normalizePriceDigits(token) === normalizePriceDigits(pricingPagePrice)
          );
          expect(
            priceMatchesCart,
            `Price mismatch for ${regionId} ${product.title}: pricing page ${pricingPagePrice}, cart prices [${cartDetectedPrices.join(
              ', '
            )}]`
          ).toBe(true);

          const cartPriceRow = cartList.getByText(priceRegex(pricingPagePrice)).first();
          if (await cartPriceRow.isVisible({ timeout: 1_500 }).catch(() => false)) {
            await cartPriceRow.scrollIntoViewIfNeeded().catch(() => {});
            await cartPriceRow.click({ force: true }).catch(() => {});
          }

          if (selectedSize) {
            expect(cartText).toContain(`/ ${selectedSize}`);
          }
        });

        await test.step('Validate breakup line item', async () => {
          const breakupToggle = page.getByText(/Show breakup|Hide breakup/i).first();
          await expect(breakupToggle).toBeVisible({ timeout: ASSERT_TIMEOUT });
          const toggleText = normalizeSpace(await breakupToggle.innerText());
          if (/show breakup/i.test(toggleText)) {
            await breakupToggle.click({ force: true });
            await page.waitForTimeout(300);
          }

          const priceDetails = page
            .locator('div,section,aside')
            .filter({ has: page.getByText(/Price details/i).first() })
            .first();
          await expect(priceDetails).toBeVisible({ timeout: ASSERT_TIMEOUT });

          const detailsText = normalizeSpace(await priceDetails.innerText());
          expect(detailsText).toContain(product.breakupLabel);
          breakupDetectedPrices = extractPriceTokens(detailsText);

          const priceMatchesBreakup = breakupDetectedPrices.some(
            (token) => normalizePriceDigits(token) === normalizePriceDigits(pricingPagePrice)
          );
          expect(
            priceMatchesBreakup,
            `Breakup mismatch for ${regionId} ${product.title}: pricing page ${pricingPagePrice}, breakup prices [${breakupDetectedPrices.join(
              ', '
            )}]`
          ).toBe(true);
        });

        await testInfo
          .attach(`shop-cart-${region.slug}-${product.title.replace(/\s+/g, '-').toLowerCase()}`, {
            body: JSON.stringify(
              {
                region,
                product,
                expectedPrice: EXPECTED_PRICES[region.slug as RegionSlug][product.title as ProductTitle],
                pricingPagePrice,
                cartDetectedPrices,
                breakupDetectedPrices,
              },
              null,
              2
            ),
            contentType: 'application/json',
          })
          .catch(() => {});
      });
    }
  }
});
