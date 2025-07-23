import { test, expect, Page } from '@playwright/test';

const COUNTRIES = ['us', 'in', 'ae', 'at', 'global'];
const COLORS = [
    'ROSE_GOLD',
    'RAW_TITANIUM',
    'ASTER_BLACK',
    'MATTE_GREY',
    'BIONIC_GOLD',
    'SPACE_SILVER',
];
const SIZES = ['open', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'];
const ADDON_PLANS = ['1', '2'];

async function openLanding(page: Page, country: string) {
    await page.goto(`https://ultrahuman.com/ring/buy/${country}/`, {
        waitUntil: 'domcontentloaded',
    });
}

async function addRingToCart(
    page: Page,
    opts: { color: string; size?: string; addonPlan?: string; uhxPlan?: string }
) {
    await page.getByTestId(`ring-color-${opts.color}`).click();

    if (opts.size) {
        await page.getByRole('button', { name: /I have a ring sizing kit/i }).click();
        await page.getByTestId(`ring-size-${opts.size}`).click();

        const knowMySize = page.getByText('I know my size');
        if (await knowMySize.isVisible()) await knowMySize.click();
    }

    if (opts.addonPlan) {
        await page.getByTestId(`ring-addon-${opts.addonPlan}-year`).click();
    }
    if (opts.uhxPlan) {
        await page.getByTestId(`ring-uhx-${opts.uhxPlan}-year`).click();
    }

    await page.getByRole('button', { name: /No, I don’t want proactive/i }).click();
    await page.getByRole('button', { name: /No, I don’t want to protect/i }).click();

    await page.getByTestId('ring-add-to-cart').click();
    await expect(page.getByTestId('cart-list')).toBeVisible();

    const titles = await page.getByTestId('cart-list').locator('.title').allTextContents();
    expect(titles.some(t => t.includes('Ultrahuman Ring AIR'))).toBe(true);

    await page.getByTestId('cart-checkout-button').click();
}

test.describe.parallel('Ultrahuman Ring AIR purchase flow', () => {
    for (const country of COUNTRIES) {
        test.describe(`Country: ${country}`, () => {
            for (const color of COLORS) {
                for (const size of SIZES) {
                    test(`Ring – ${color} / size ${size}`, async ({ page }) => {
                        await openLanding(page, country);
                        await addRingToCart(page, { color, size });
                    });
                }
            }
            for (const plan of ADDON_PLANS) {
                test(`Add-on plan – ${plan} year`, async ({ page }) => {
                    await openLanding(page, country);
                    await addRingToCart(page, { color: 'BIONIC_GOLD', addonPlan: plan });
                });
            }

            for (const plan of ADDON_PLANS) {
                test(`UHX plan – ${plan} year`, async ({ page }) => {
                    await openLanding(page, country);
                    await addRingToCart(page, { color: 'BIONIC_GOLD', uhxPlan: plan });
                });
            }
        });
    }
});