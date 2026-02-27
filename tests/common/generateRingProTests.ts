import { test } from '@playwright/test';
import { openRingProLanding, addRingProToCart, RING_PRO_COLORS, RING_PRO_SIZES } from './ring-pro-utils';

export function generateRingProTestsForCountry(country: string) {
  test.describe.parallel(`Ultrahuman Ring Pro – ${country}`, () => {
    for (const color of RING_PRO_COLORS) {
      for (const size of RING_PRO_SIZES) {
        test(`Ring Pro – ${color} / size ${size}`, async ({ page }) => {
          await openRingProLanding(page, country);
          await addRingProToCart(page, { color, size });
        });
      }
    }
  });
}
