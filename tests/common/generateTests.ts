import { test } from '@playwright/test';
import { openLanding, addRingToCart, COLORS, SIZES, ADDON_PLANS } from './ring-utils';

export function generateTestsForCountry(country: string) {
    test.describe.parallel(`Ultrahuman Ring AIR – ${country}`, () => {
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

            test(`UHX plan – ${plan} year`, async ({ page }) => {
                await openLanding(page, country);
                await addRingToCart(page, { color: 'BIONIC_GOLD', uhxPlan: plan });
            });
        }
    });
}
