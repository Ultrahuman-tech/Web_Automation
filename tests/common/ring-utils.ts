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

    await page.getByTestId('cart-checkout-button').click();
  });
}

