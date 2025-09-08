import { Page, expect, test } from '@playwright/test';

// Japanese-specific utilities based on the actual website structure
export async function addRingToCartJapanese(
  page: Page,
  opts: { 
    color: string; 
    size?: string; 
    addonPlan?: string; 
    uhxPlan?: string;
  }
) {
  await test.step(`Select ring color: ${opts.color}`, async () => {
    // Click color selection
    const colorSelector = `[data-testid="ring-color-${opts.color}"]`;
    await page.getByTestId(`ring-color-${opts.color}`).click();
    await page.waitForTimeout(1000);
    
    // Check for continue button after color selection
    const continueButton = page.locator('button:has-text("続く"), [data-buttontype="go to next step"]');
    if (await continueButton.isVisible({ timeout: 3000 })) {
      console.log('Continue button appeared after color selection, clicking it');
      await continueButton.click();
      await page.waitForTimeout(1000);
    }
  });

  // Handle any continue buttons that might be blocking size selection
  await test.step('Handle blocking continue buttons', async () => {
    try {
      // Look for continue buttons that might be blocking other elements
      const continueButton = page.locator('button:has-text("続く"), [data-buttontype="go to next step"]');
      if (await continueButton.isVisible({ timeout: 2000 })) {
        console.log('Continue button detected before size selection, clicking it');
        await continueButton.click();
        await page.waitForTimeout(2000); // Wait longer for page to update
      }
    } catch (error) {
      console.log('No blocking continue button found');
    }
  });

  if (opts.size) {
    await test.step(`Select ring size: ${opts.size}`, async () => {
      // Handle overlapping elements in Japanese page
      try {
        // First try to scroll the element into view
        await page.getByTestId(`ring-size-${opts.size}`).scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        
        // Try to click with force if there are overlapping elements
        await page.getByTestId(`ring-size-${opts.size}`).click({ force: true });
        await page.waitForTimeout(1000);
      } catch (error) {
        // If force click fails, try alternative approach
        console.log(`Size selection failed, trying alternative approach for ${opts.size}`);
        
        // Try clicking on the parent container or using different selector
        const sizeButton = page.locator(`[data-testid="ring-size-${opts.size}"]`);
        if (await sizeButton.isVisible()) {
          await sizeButton.evaluate((el: any) => el.click());
          await page.waitForTimeout(1000);
        }
      }
      
      // Check for continue button after size selection
      const continueButton = page.locator('button:has-text("続く"), [data-buttontype="go to next step"]');
      if (await continueButton.isVisible({ timeout: 3000 })) {
        console.log('Continue button appeared after size selection, clicking it');
        await continueButton.click();
        await page.waitForTimeout(2000); // Wait longer for page to update
      }
    });
  }

  if (opts.addonPlan) {
    await test.step(`Select addon plan: ${opts.addonPlan}`, async () => {
      // Use correct test ID for addon plans
      const addonTestId = `ring-addon-${opts.addonPlan}`;
      await page.getByTestId(addonTestId).click();
      await page.waitForTimeout(1000);
      
      // Check for continue button after addon selection
      const continueButton = page.locator('button:has-text("続く"), [data-buttontype="go to next step"]');
      if (await continueButton.isVisible({ timeout: 3000 })) {
        console.log('Continue button appeared after addon selection, clicking it');
        await continueButton.click();
        await page.waitForTimeout(1000);
      }
    });
  }

  if (opts.uhxPlan) {
    await test.step(`Select UHX plan: ${opts.uhxPlan}`, async () => {
      // Use correct test ID for UHX plans
      const uhxTestId = `ring-uhx-${opts.uhxPlan}`;
      await page.getByTestId(uhxTestId).click();
      await page.waitForTimeout(1000);
      
      // Check for continue button after UHX selection
      const continueButton = page.locator('button:has-text("続く"), [data-buttontype="go to next step"]');
      if (await continueButton.isVisible({ timeout: 3000 })) {
        console.log('Continue button appeared after UHX selection, clicking it');
        await continueButton.click();
        await page.waitForTimeout(1000);
      }
    });
  }

  // Handle any remaining continue buttons
  await test.step('Handle remaining continue buttons', async () => {
    try {
      // Wait for any remaining continue buttons
      const continueButton = page.locator('button:has-text("続く"), [data-buttontype="go to next step"]');
      if (await continueButton.isVisible({ timeout: 3000 })) {
        console.log('Final continue button detected, clicking it');
        await continueButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log('No more continue buttons found');
    }
  });

  await test.step('Add to cart and proceed to checkout', async () => {
    // Wait for add to cart button to be enabled
    const addToCartButton = page.getByTestId('ring-add-to-cart');
    await expect(addToCartButton).toBeEnabled({ timeout: 50000 });
    
    // Click add to cart
    await addToCartButton.click();
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for cart to load and validate
    await page.waitForSelector('[data-testid="cart-list"], [class*="cart"]', { timeout: 10000 });
    
    // Proceed to checkout
    const checkoutButton = page.getByTestId('cart-checkout-button');
    await expect(checkoutButton).toBeVisible({ timeout: 10000 });
    await checkoutButton.click();
    
    // Wait for checkout page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Additional wait for checkout page
  });
}

// Japanese-specific navigation
export async function navigateToJapanesePurchasePage(
  page: Page,
  country: string
) {
  await test.step(`Navigate to Japanese ${country} purchase page`, async () => {
    const purchaseUrl = `https://ultrahuman.com/ja/ring/buy/${country}/`;
    
    await page.goto(purchaseUrl, {
      waitUntil: 'domcontentloaded',
    });
    
    // Wait for key elements to be present
    await page.waitForSelector('[data-testid*="ring-color"], [class*="color"]', { timeout: 15000 });
    await page.waitForTimeout(2000); // Additional wait for page to stabilize
  });
}
