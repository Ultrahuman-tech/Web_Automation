import { Page, expect, test } from '@playwright/test';

export const COLORS = [
  'ROSE_GOLD',
  'RAW_TITANIUM',
  'ASTER_BLACK',
  'MATTE_GREY',
  'BIONIC_GOLD',
  'SPACE_SILVER',
];

export const SIZES = ['open', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'];

export const ADDON_PLANS = ['1', '2'];

export async function openLanding(page: Page, country: string) {
  await test.step(`Navigate to ${country} landing page`, async () => {
    await page.goto(`https://ultrahuman.com/ring/buy/${country}/`, {
      waitUntil: 'domcontentloaded',
    });
  });
}

export async function addRingToCart(
  page: Page,
  opts: { color: string; size?: string; addonPlan?: string; uhxPlan?: string }
) {
  await test.step(`Select ring color: ${opts.color}`, async () => {
    await page.getByTestId(`ring-color-${opts.color}`).click();
  });

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

  if (opts.addonPlan) {
    await test.step(`Select add-on plan: ${opts.addonPlan} year`, async () => {
      await page.getByTestId(`ring-addon-${opts.addonPlan}-year`).click();
    });
  }

  if (opts.uhxPlan) {
    await test.step(`Select UHX plan: ${opts.uhxPlan} year`, async () => {
      await page.getByTestId(`ring-uhx-${opts.uhxPlan}-year`).click();
    });
  }

  await test.step('Handle upsell modals', async () => {
    try {
      const proactiveBtn = page.getByRole('button', { name: /No, I don’t want proactive/i });
      if (await proactiveBtn.isVisible({ timeout: 3000 })) {
        await proactiveBtn.click();
      }

      const protectBtn = page.getByRole('button', { name: /No, I don’t want to protect/i });
      if (await protectBtn.isVisible({ timeout: 3000 })) {
        await protectBtn.click();
      }
    } catch {
      // silently ignore if upsell modals don't appear
    }
  });

  await test.step('Add to cart and proceed to checkout', async () => {
    console.log(`Adding to cart: ${JSON.stringify(opts)}`);
    await expect(page.getByTestId('ring-add-to-cart')).toBeEnabled({ timeout: 50000 });
    await page.getByTestId('ring-add-to-cart').click();

    // Optional wait for network, spinner, etc.
    await page.waitForLoadState('domcontentloaded'); // replaces 'networkidle'

    // Wait for cart list with extended timeout and screenshot on failure
    try {
      await page.waitForSelector('[data-testid="cart-list"]', { state: 'visible', timeout: 50000 });
    } catch (error) {
      await page.screenshot({
        path: `errors/cart-list-failure-${Date.now()}.png`,
        fullPage: true,
      });
      console.error('Cart list not visible after Add to Cart:', error);
      throw error;
    }

    const titles = await page.getByTestId('cart-list').locator('.title').allTextContents();
    expect(
      titles.some((t) => t.includes('Ultrahuman Ring AIR')),
      'Expected "Ultrahuman Ring AIR" in cart titles'
    ).toBe(true);

    // Some locales show an intermediate "Review cart" button before the checkout button.
    // Click it if present to expose the checkout actions.
    const reviewCartBtn = page.getByRole('button', { name: 'Review cart' });
    if (await reviewCartBtn.isVisible().catch(() => false)) {
      await expect(reviewCartBtn).toBeEnabled({ timeout: 10000 });
      await reviewCartBtn.click();
      // give the UI a moment to update (checkout button may appear)
      await page.waitForTimeout(500);
    }

    // Robust checkout flow: wait for checkout button (with fallbacks), verify cart summary elements,
    // take a screenshot and throw a clear error if something is missing.
    const takeScreenshot = async (name: string) => {
      const file = `errors/manual-open-after-add-${Date.now()}-${name}.png`;
      try {
        await page.screenshot({ path: file, fullPage: true });
      } catch (screenshotErr) {
        console.error('Failed to take screenshot:', screenshotErr);
      }
    };

    // Check for common cart/order elements to ensure the flow is intact
    const cartList = page.getByTestId('cart-list');

    const checkCartFor = async (testId?: string, selector?: string, textRegex?: RegExp) => {
      if (testId) {
        const el = cartList.locator(`[data-testid="${testId}"]`);
        if (await el.isVisible().catch(() => false)) return true;
      }
      if (selector) {
        if (await cartList.locator(selector).isVisible().catch(() => false)) return true;
      }
      if (textRegex) {
        if (await cartList.getByText(textRegex).isVisible().catch(() => false)) return true;
        if (await page.getByText(textRegex).isVisible().catch(() => false)) return true;
      }
      return false;
    };

    const currencyRegex = /(?:AED|USD|INR|GBP|EUR|\$|₹)\s?[\d,]+/i;
    const subtotalLabelRegex = /\b(subtotal|total|amount payable|order summary)\b/i;

    const hasItemPrice = await checkCartFor('cart-item-price', '.price', currencyRegex);
    const hasSubtotal =
      (await checkCartFor('cart-subtotal', '.cart-subtotal, .subtotal', subtotalLabelRegex)) ||
      (await checkCartFor(undefined, undefined, currencyRegex));
    const hasOrderSummary = await checkCartFor('order-summary', undefined, /Order summary|Almost there/i);

    if (!hasItemPrice || !hasSubtotal || !hasOrderSummary) {
      await takeScreenshot('cart-summary-missing');
      const details = { hasItemPrice, hasSubtotal, hasOrderSummary };
      console.error('One or more cart summary elements are missing', details);
      throw new Error(`Cart summary validation failed: ${JSON.stringify(details)}`);
    }

    // Try the primary testid first, then fall back to role/text-based selectors
    const clickCheckoutButton = async () => {
      const primary = page.getByTestId('cart-checkout-button');
      if (await primary.isVisible().catch(() => false)) {
        await expect(primary).toBeEnabled({ timeout: 30000 });
        await primary.click();
        return;
      }

      // If a 'Show breakup' expander exists, open it to reveal checkout actions
      const showBreakup = page.getByText('Show breakup');
      if (await showBreakup.isVisible().catch(() => false)) {
        try {
          await showBreakup.click();
          await page.waitForTimeout(300);
        } catch {
          // ignore click failure
        }
      }

      // Direct exact 'Checkout' button/text (common in flow)
      const exactCheckout = page.getByText('Checkout', { exact: true });
      if (await exactCheckout.isVisible().catch(() => false)) {
        try {
          await exactCheckout.click();
          return;
        } catch {
          // continue to other fallbacks
        }
      }

      // Fallback to common button labels (buttons and links)
      const fallbackNames = [/checkout/i, /proceed to checkout/i, /proceed/i, /place order/i, /continue to checkout/i, /pay now/i];
      for (const name of fallbackNames) {
        const btn = page.getByRole('button', { name });
        if (await btn.isVisible().catch(() => false)) {
          await expect(btn).toBeEnabled({ timeout: 30000 });
          await btn.click();
          return;
        }
        const link = page.getByRole('link', { name });
        if (await link.isVisible().catch(() => false)) {
          await link.click();
          return;
        }
      }

      // If a cost summary region exists, try clicking Checkout inside it
      const costSummary = page.getByLabel('Cost summary');
      if (await costSummary.isVisible().catch(() => false)) {
        const insideCheckout = costSummary.getByText(/checkout|proceed|pay now|pay/i);
        if (await insideCheckout.first().isVisible().catch(() => false)) {
          try {
            await insideCheckout.first().click();
            return;
          } catch {
            // continue
          }
        }
      }

      // Fallback: any element with data-testid containing checkout/proceed/place-order
      const dataTestBtns = page.locator('[data-testid*="checkout"], [data-testid*="proceed"], [data-testid*="place-order"]');
      const dtCount = await dataTestBtns.count().catch(() => 0);
      for (let i = 0; i < dtCount; i++) {
        const b = dataTestBtns.nth(i);
        if (await b.isVisible().catch(() => false) && (await b.isEnabled().catch(() => false))) {
          await b.click();
          return;
        }
      }

      // Fallback: search inside cartList for any clickable text matching checkout keywords
      const insideCheckout = cartList.getByText(/checkout|proceed|place order|continue|pay now|pay/i);
      if (await insideCheckout.first().isVisible().catch(() => false)) {
        try {
          await insideCheckout.first().click();
          return;
        } catch {
          // if click fails, continue to next fallback
        }
      }

      // Final fallback: page-wide text matcher (anchors/buttons/inputs)
      const pageWide = page.getByText(/checkout|proceed to checkout|proceed|place order|continue to checkout|pay now|pay/i);
      if (await pageWide.first().isVisible().catch(() => false)) {
        try {
          await pageWide.first().click();
          return;
        } catch {
          // fall through
        }
      }

      // As last attempt, try any input/button with value or aria-label containing checkout keywords
      const inputs = page.locator('input[value]');
      const icount = await inputs.count().catch(() => 0);
      for (let i = 0; i < icount; i++) {
        const el = inputs.nth(i);
        const val = (await el.getAttribute('value')) || '';
        if (/checkout|proceed|place order|pay/i.test(val)) {
          try {
            await el.click();
            return;
          } catch {
            // continue
          }
        }
      }

      await takeScreenshot('checkout-button-not-found');
      throw new Error('Checkout button not found (no primary testid or fallback button matched)');
    };

    try {
      await clickCheckoutButton();
    } catch (err) {
      await takeScreenshot('failed-click-checkout');
      console.error('Failed to click checkout button', err);
      throw err;
    }
  });
}

