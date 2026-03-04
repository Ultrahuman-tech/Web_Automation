import { test, expect, Page, Locator } from '@playwright/test';

const ASSERT_TIMEOUT = 30_000;
const BASE_URL = process.env.SUPPLEMENTS_BASE_URL
  ? process.env.SUPPLEMENTS_BASE_URL.replace(/\/+$/, '')
  : 'https://www.ultrahuman.com';
const SHOP_PATH = '/us/shop/';
const PRICE_TOKEN_REGEX =
  /(?:\$)\s*[\d.,]+/gi;

type ThorneProduct = {
  name: string;
  cartName: string;
  formSize: string;
  sku: string;
  retailPrice: string;
};

const THORNE_PRODUCTS: ThorneProduct[] = [
  { name: 'Thorne - Super EPA Pro', cartName: 'Thorne Super EPA Pro', formSize: '120 Gelcaps', sku: 'SP610', retailPrice: '$93.00' },
  { name: 'Thorne - Vitamin D + K2 Liquid', cartName: 'Thorne Vitamin D + K2 Liquid', formSize: 'Drops 1oz (1200 drops)', sku: 'KD500', retailPrice: '$34.00' },
  { name: 'Thorne - Magnesium Bisglycinate', cartName: 'Thorne Magnesium Bisglycinate', formSize: '60 Scoops', sku: 'M204', retailPrice: '$52.00' },
  { name: 'Thorne - Creatine (NSF Certified)', cartName: 'Thorne Creatine', formSize: '90 Servings', sku: 'SF903', retailPrice: '$44.00' },
  { name: 'Thorne - Theanine', cartName: 'Thorne Theanine', formSize: '90 Capsules', sku: 'SA508', retailPrice: '$68.00' },
  { name: 'Thorne - Zinc Picolinate 15 mg', cartName: 'Thorne Zinc Picolinate 15 mg', formSize: '60 Capsules', sku: 'M210', retailPrice: '$15.00' },
  { name: 'Thorne - ResveraCel', cartName: 'Thorne ResveraCel', formSize: '60 Capsules', sku: 'SB302', retailPrice: '$60.00' },
  { name: 'Thorne - CoQ10', cartName: 'Thorne CoQ10', formSize: '60 Gelcaps', sku: 'SP624', retailPrice: '$53.00' },
  { name: 'Thorne - Selenium', cartName: 'Thorne Selenium', formSize: '60 Capsules', sku: 'M225', retailPrice: '$14.00' },
  { name: 'Thorne - Curcumin Phytosome', cartName: 'Thorne Curcumin Phytosome', formSize: '120 Capsules', sku: 'SF815', retailPrice: '$49.00' },
  { name: 'Thorne - Plant Protein (Vanilla)', cartName: 'Thorne Plant Protein', formSize: '~30 Scoops', sku: 'SP120', retailPrice: '$49.00' },
  { name: 'Thorne - NAC N-Acetylcysteine', cartName: 'Thorne NAC', formSize: '90 Capsules', sku: 'SA560', retailPrice: '$33.00' },
  { name: 'Thorne - Quercetin Phytosome', cartName: 'Thorne Quercetin Phytosome', formSize: '60 Capsules', sku: 'SB335', retailPrice: '$46.00' },
  { name: 'Thorne - Broccoli Seed Extract', cartName: 'Thorne Broccoli Seed Extract', formSize: '60 Capsules', sku: 'SP660', retailPrice: '$67.00' },
  { name: 'Thorne - 5-MTHF 1 mg', cartName: 'Thorne 5-MTHF 1 mg', formSize: '60 Capsules', sku: 'B129', retailPrice: '$24.00' },
  { name: 'Thorne - Meta-Balance', cartName: 'Thorne Meta-Balance', formSize: '60 Capsules', sku: 'SF711', retailPrice: '$48.00' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeSpace(text: string): string {
  return text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
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

/**
 * Normalize a price string to a canonical integer-cents value for comparison.
 * "$93" → "9300", "$93.00" → "9300", "$14" → "1400", "$14.50" → "1450"
 */
function priceToCents(text: string): string {
  const digits = text.replace(/[^\d.]/g, '');
  const parts = digits.split('.');
  const whole = parts[0] || '0';
  const frac = (parts[1] || '').padEnd(2, '0').slice(0, 2);
  return `${whole}${frac}`;
}

function assertPriceMatch(actualText: string, expectedPrice: string) {
  const actual = normalizeSpace(actualText);
  const expected = normalizeSpace(expectedPrice);
  if (actual.includes(expected)) return;
  // Compare as cents so "$93" matches "$93.00"
  expect(priceToCents(actual)).toBe(priceToCents(expected));
}

// ── Page Actions ─────────────────────────────────────────────────────────────

async function openShop(page: Page) {
  const url = `${BASE_URL}${SHOP_PATH}`;
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

    if (clicked) return;
    await page.waitForTimeout(750);
  }
}

function getProductCard(page: Page, productName: string): Locator {
  const titleNode = page.getByText(productName, { exact: false }).first();
  return titleNode.locator(
    'xpath=ancestor::*[self::div or self::section][.//button[contains(normalize-space(.), "Add to cart")]][1]'
  );
}

async function getProductCardDisplayedPrice(card: Locator, productName: string): Promise<string> {
  const cardText = await card.innerText();
  const price = pickFirstPriceToken(cardText);
  if (!price) {
    throw new Error(`Unable to read displayed price from shop card for "${productName}"`);
  }
  return price;
}

async function clickAddToCart(page: Page, card: Locator, productName: string) {
  await card.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(300);

  const addToCart = card.getByRole('button', { name: /Add to cart/i }).first();
  await expect(addToCart, `Expected "Add to cart" button for ${productName}`).toBeVisible({ timeout: ASSERT_TIMEOUT });
  await addToCart.scrollIntoViewIfNeeded().catch(() => {});
  await addToCart.click();
  await page.waitForTimeout(500);
}

async function waitForCartDrawer(page: Page) {
  const bagText = page.getByText('Your Bag', { exact: false }).first();
  const checkout = page.getByRole('button', { name: /Checkout/i }).first();

  // After add-to-cart, the cart drawer ("Your Bag" + "Checkout") appears
  // once the Shopify API call completes. Use waitFor which actually waits.
  try {
    await bagText.waitFor({ state: 'visible', timeout: ASSERT_TIMEOUT });
    return;
  } catch {
    // bagText not found, try checkout button
  }

  try {
    await checkout.waitFor({ state: 'visible', timeout: 5_000 });
    return;
  } catch {
    // checkout not found either
  }

  // Try clicking "Review cart" if it appeared instead
  const reviewCart = page.getByRole('button', { name: /Review cart/i }).first();
  try {
    await reviewCart.waitFor({ state: 'visible', timeout: 5_000 });
    await reviewCart.click();
    await bagText.waitFor({ state: 'visible', timeout: ASSERT_TIMEOUT });
    return;
  } catch {
    // review cart not found
  }

  throw new Error('Unable to open cart drawer: neither "Your Bag" nor "Review cart" appeared');
}

async function resolveCartContainer(page: Page): Promise<Locator> {
  // The cart drawer contains "Your Bag" heading and product items with prices.
  // Find the nearest container that holds the bag heading.
  const bagHeading = page.getByText('Your Bag', { exact: false }).first();
  await expect(bagHeading, 'Expected "Your Bag" heading to be visible').toBeVisible({ timeout: ASSERT_TIMEOUT });

  // The cart drawer is the parent container holding heading + items + price details
  const cartDrawer = bagHeading.locator('xpath=ancestor::div[.//button[contains(normalize-space(.), "Checkout")]][1]');
  if (await cartDrawer.isVisible({ timeout: 3_000 }).catch(() => false)) {
    return cartDrawer;
  }

  // Fallback: broader container
  const cartPanel = page
    .locator('aside,section,div')
    .filter({ has: bagHeading })
    .filter({ has: page.getByRole('button', { name: /Checkout/i }).first() })
    .first();
  await expect(cartPanel, 'Expected cart panel to be visible').toBeVisible({ timeout: ASSERT_TIMEOUT });
  return cartPanel;
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Thorne Supplements – Shop to Cart price validation', () => {
  test.setTimeout(150_000);

  for (const product of THORNE_PRODUCTS) {
    test(`US shop: ${product.name} (${product.sku}) cart validation`, async ({ page }, testInfo) => {
      let shopDisplayedPrice = '';
      let cartDetectedPrices: string[] = [];

      await openShop(page);
      await dismissCookieBanner(page);

      await test.step(`Locate ${product.name} and verify shop price`, async () => {
        const card = getProductCard(page, product.name);
        await expect(card, `Expected product card for ${product.name}`).toBeVisible({ timeout: ASSERT_TIMEOUT });
        await card.scrollIntoViewIfNeeded().catch(() => {});

        shopDisplayedPrice = await getProductCardDisplayedPrice(card, product.name);
        assertPriceMatch(shopDisplayedPrice, product.retailPrice);
      });

      await test.step(`Add ${product.name} to cart`, async () => {
        const card = getProductCard(page, product.name);
        await clickAddToCart(page, card, product.name);
      });

      await test.step('Open cart drawer', async () => {
        await waitForCartDrawer(page);
      });

      await test.step('Validate product and price in cart', async () => {
        const cartContainer = await resolveCartContainer(page);

        // Cart uses names without the dash (e.g. "Thorne Selenium" not "Thorne - Selenium")
        const cartProductRow = cartContainer.getByText(product.cartName, { exact: false }).first();
        await expect(
          cartProductRow,
          `Expected "${product.cartName}" to appear in cart`
        ).toBeVisible({ timeout: ASSERT_TIMEOUT });
        await cartProductRow.scrollIntoViewIfNeeded().catch(() => {});

        const cartTextRaw = await cartContainer.innerText();
        cartDetectedPrices = extractPriceTokens(cartTextRaw);

        const expectedCents = priceToCents(product.retailPrice);
        const priceMatchesCart = cartDetectedPrices.some(
          (token) => priceToCents(token) === expectedCents
        );
        expect(
          priceMatchesCart,
          `Price mismatch for ${product.name}: expected ${product.retailPrice}, cart prices [${cartDetectedPrices.join(', ')}]`
        ).toBe(true);
      });

      await testInfo.attach(
        `thorne-cart-${product.sku.toLowerCase()}`,
        {
          body: JSON.stringify(
            {
              product,
              shopDisplayedPrice,
              cartDetectedPrices,
            },
            null,
            2
          ),
          contentType: 'application/json',
        }
      ).catch(() => {});
    });
  }
});
