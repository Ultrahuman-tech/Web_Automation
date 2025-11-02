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

const BASE_RING_URL = process.env.RING_BASE_URL ?? 'https://ultrahuman.com/ring/buy/';

export async function openLanding(page: Page, country: string) {
  await test.step(`Navigate to ${country} landing page`, async () => {
    const base = BASE_RING_URL.endsWith('/') ? BASE_RING_URL : `${BASE_RING_URL}/`;
    const url = `${base}${country}/`;
    // best-effort navigation: try primary, then retry once with a longer timeout and different waitUntil
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (err) {
      // transient navigation errors (ERR_ABORTED/frame detached) happen; retry once with 'load'
      try {
        await page.waitForTimeout(1000);
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      } catch (err2) {
        // rethrow original error for visibility
        throw err;
      }
    }
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

    // Robust checkout flow: try multiple fallbacks for different locales / UI states
    const clickCheckout = async () => {
      const cart = page.getByTestId('cart-list');

      // helper: remove any overlay that intercepts clicks at the locator's center
      const disableCoveringElement = async (locator: any) => {
        try {
          const box = await locator.first().boundingBox();
          if (!box) return;
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          await page.evaluate(({ cx, cy }) => {
            const top = document.elementFromPoint(cx, cy) as HTMLElement | null;
            if (top && top.getAttribute && top.getAttribute('data-test-pointer-disabled') !== 'true') {
              top.style.pointerEvents = 'none';
              top.setAttribute('data-test-pointer-disabled', 'true');
            }
          }, { cx, cy });
        } catch (e) {
          // ignore failures; best-effort only
        }
      };

      // helper: perform a JS click on the first element matching the locator to bypass pointer interception
      const jsClick = async (locator: any) => {
        try {
          const handle = await locator.first().elementHandle();
          if (!handle) return false;
          await page.evaluate((el) => (el as HTMLElement).click(), handle);
          return true;
        } catch (e) {
          return false;
        }
      };

      // Primary: explicit test id
      const primary = page.getByTestId('cart-checkout-button');
      if (await primary.isVisible().catch(() => false)) {
        await disableCoveringElement(primary);
        // first try normal click, then JS click, then force click
        try {
          await primary.click();
          return;
        } catch (err) {
          if (await jsClick(primary)) return;
          await primary.click({ force: true });
          return;
        }
      }

      // Try expanding the cart review modal which may reveal the checkout action
      const reviewBtn = page.getByRole('button', { name: /Review cart/i });
      if (await reviewBtn.isVisible().catch(() => false)) {
        await reviewBtn.click().catch(() => {});
        await page.waitForTimeout(300);
      }

      // Exact text match for 'Checkout'
      const exactCheckout = page.locator('div').filter({ hasText: /^Checkout$/ }).first();
      if (await exactCheckout.isVisible().catch(() => false)) {
        await disableCoveringElement(exactCheckout);
        try {
          await exactCheckout.click();
          return;
        } catch (err) {
          if (await jsClick(exactCheckout)) return;
          await exactCheckout.click({ force: true });
          return;
        }
      }

      // Role based fallbacks for buttons / links
      const btn = page.getByRole('button', {
        name: /checkout|proceed to checkout|proceed|place order|continue to checkout|pay now/i,
      });
      if (await btn.isVisible().catch(() => false)) {
        await disableCoveringElement(btn);
        try {
          await btn.click();
          return;
        } catch (err) {
          if (await jsClick(btn)) return;
          await btn.click({ force: true });
          return;
        }
      }

      const link = page.getByRole('link', {
        name: /checkout|proceed to checkout|continue to checkout|pay now/i,
      });
      if (await link.isVisible().catch(() => false)) {
        await disableCoveringElement(link);
        try {
          await link.click();
          return;
        } catch (err) {
          if (await jsClick(link)) return;
          await link.click({ force: true });
          return;
        }
      }

      // Try clicking any checkout-like text inside the cart element
      const inside = cart.getByText(/checkout|proceed|place order|continue|pay now|pay/i);
      if (await inside.first().isVisible().catch(() => false)) {
        await disableCoveringElement(inside.first());
        try {
          await inside.first().click();
          return;
        } catch (err) {
          if (await jsClick(inside.first())) return;
          await inside.first().click({ force: true });
          return;
        }
      }

      // Final attempt: page-wide text
      const pageWide = page.getByText(/checkout|proceed to checkout|proceed|place order|continue to checkout|pay now|pay/i);
      if (await pageWide.first().isVisible().catch(() => false)) {
        await disableCoveringElement(pageWide.first());
        try {
          await pageWide.first().click();
          return;
        } catch (err) {
          if (await jsClick(pageWide.first())) return;
          await pageWide.first().click({ force: true });
          return;
        }
      }

      throw new Error('Checkout action not found');
    };

    try {
      await clickCheckout();
    } catch (error) {
      await page.screenshot({ path: `errors/cart-checkout-failure-${Date.now()}.png`, fullPage: true }).catch(() => {});
      console.error('Checkout click failed', error);
      throw error;
    }
  });
}
