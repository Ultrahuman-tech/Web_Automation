import { test, expect } from '@playwright/test';
import { getPurchaseUrl } from './config';
import { getRealLanguageElements } from './real-language-elements';

// Test configuration
const TEST_LANGUAGE = process.env.LANGUAGE || 'en';
const TEST_COUNTRY = process.env.COUNTRY || 'in';

test.describe(`Ultrahuman Ring AIR - Working Multi Language Test (${TEST_COUNTRY.toUpperCase()} ${TEST_LANGUAGE.toUpperCase()})`, () => {
  test('Complete ring purchase flow in different language', async ({ page }) => {
    const languageElements = getRealLanguageElements(TEST_LANGUAGE);
    const purchaseUrl = getPurchaseUrl(TEST_LANGUAGE, TEST_COUNTRY);
    
    console.log(`🌍 Testing ${TEST_LANGUAGE} language for ${TEST_COUNTRY} country`);
    console.log(`🔗 URL: ${purchaseUrl}`);
    
    // Navigate to purchase page
    await test.step('Navigate to purchase page', async () => {
      await page.goto(purchaseUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    });
    
    // Accept cookies if present
    await test.step('Accept cookies', async () => {
      const agreeButton = page.locator(`button:has-text("${languageElements.agree}")`);
      if (await agreeButton.isVisible({ timeout: 5000 })) {
        console.log(`🍪 Accepting cookies with text: "${languageElements.agree}"`);
        await agreeButton.click();
        await page.waitForTimeout(1000);
      }
    });
    
    // Select color
    await test.step('Select ring color', async () => {
      const color = 'ROSE_GOLD';
      const colorText = languageElements.colors[color];
      console.log(`🎨 Selecting color: "${colorText}"`);
      
      const colorButton = page.locator(`button:has-text("${colorText}")`);
      await colorButton.click();
      await page.waitForTimeout(1000);
      
      // Check for continue button (be more specific to avoid strict mode violations)
      const continueButton = page.locator(`button[data-buttontype="go to next step"]:has-text("${languageElements.continue}")`);
      if (await continueButton.isVisible({ timeout: 3000 })) {
        console.log(`✅ Continue button found, clicking it`);
        await continueButton.click();
        await page.waitForTimeout(1000);
      }
    });
    
    // Handle sizing kit selection
    await test.step('Handle sizing kit selection', async () => {
      const iHaveKitText = languageElements.sizing.iHaveKit;
      console.log(`📦 Looking for sizing kit button: "${iHaveKitText}"`);
      
      const sizingKitButton = page.locator(`button:has-text("${iHaveKitText}")`);
      if (await sizingKitButton.isVisible({ timeout: 3000 })) {
        console.log(`✅ Found sizing kit button, clicking it`);
        await sizingKitButton.click();
        await page.waitForTimeout(1000);
      }
    });
    
    // Select size
    await test.step('Select ring size', async () => {
      const size = '5';
      console.log(`📏 Selecting size: ${size}`);
      
      const sizeButton = page.getByTestId(`ring-size-${size}`);
      await sizeButton.click();
      await page.waitForTimeout(1000);
      
      // Look for "I know my size" button
      const iKnowMySizeText = languageElements.sizing.iKnowMySize;
      const knowMySizeButton = page.getByText(iKnowMySizeText);
      if (await knowMySizeButton.isVisible({ timeout: 3000 })) {
        console.log(`✅ Found "I know my size" button, clicking it`);
        await knowMySizeButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Look for "Get free sizing kit" button (appears after size selection)
      const getFreeKitText = languageElements.sizing.getFreeKit;
      if (getFreeKitText) {
        console.log(`📦 Looking for get free sizing kit button: "${getFreeKitText}"`);
        const getFreeKitButton = page.locator(`button:has-text("${getFreeKitText}")`);
        if (await getFreeKitButton.isVisible({ timeout: 3000 })) {
          console.log(`✅ Found get free sizing kit button, clicking it`);
          await getFreeKitButton.click();
          await page.waitForTimeout(1000);
        }
      }
    });
    
    // Select charger (required)
    await test.step('Select charger', async () => {
      const standardChargerText = languageElements.chargers.standard;
      console.log(`🔌 Selecting standard charger: "${standardChargerText}"`);
      
      const chargerButton = page.locator(`button:has-text("${standardChargerText}")`);
      if (await chargerButton.isVisible({ timeout: 3000 })) {
        console.log(`✅ Found standard charger button, clicking it`);
        try {
          await chargerButton.click();
        } catch (error) {
          console.log('Regular click failed, trying force click');
          await chargerButton.click({ force: true });
        }
        await page.waitForTimeout(1000);
      }
    });
    
    // Select coverage (required)
    await test.step('Select coverage', async () => {
      const noCoverageText = languageElements.coverage.none;
      console.log(`🛡️ Selecting no coverage: "${noCoverageText}"`);
      
      const coverageButton = page.locator(`button:has-text("${noCoverageText}")`);
      if (await coverageButton.isVisible({ timeout: 3000 })) {
        console.log(`✅ Found no coverage button, clicking it`);
        try {
          await coverageButton.click();
        } catch (error) {
          console.log('Regular click failed, trying force click');
          await coverageButton.click({ force: true });
        }
        await page.waitForTimeout(1000);
      }
    });
    
    // Handle upsell modals
    await test.step('Handle upsell modals', async () => {
      try {
        // Look for "No, I don't want proactive" button
        const proactiveBtn = page.getByRole('button', { name: /No, I don't want proactive/i });
        if (await proactiveBtn.isVisible({ timeout: 3000 })) {
          console.log('✅ Found proactive button, clicking it');
          await proactiveBtn.click();
          await page.waitForTimeout(1000);
        }

        // Look for "No, I don't want to protect" button
        const protectBtn = page.getByRole('button', { name: /No, I don't want to protect/i });
        if (await protectBtn.isVisible({ timeout: 3000 })) {
          console.log('✅ Found protect button, clicking it');
          await protectBtn.click();
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        console.log('No upsell modals found or error occurred');
      }
    });
    
    // Check add to cart button
    await test.step('Check add to cart button', async () => {
      const addToCartText = languageElements.addToCart;
      console.log(`🛒 Looking for add to cart button: "${addToCartText}"`);
      
      const addToCartButton = page.getByTestId('ring-add-to-cart');
      const isEnabled = await addToCartButton.isEnabled();
      console.log(`🛒 Add to cart button enabled: ${isEnabled}`);
      
      if (isEnabled) {
        console.log('✅ Add to cart button is enabled - test passed!');
        await addToCartButton.click();
        await page.waitForTimeout(2000);
        
        // Check if we can proceed to checkout
        const checkoutButton = page.getByTestId('cart-checkout-button');
        if (await checkoutButton.isVisible({ timeout: 5000 })) {
          console.log('✅ Checkout button found - full flow working!');
        }
      } else {
        console.log('❌ Add to cart button is disabled - test failed');
        await page.screenshot({ path: `debug-${TEST_LANGUAGE}-${TEST_COUNTRY}.png` });
        throw new Error('Add to cart button is disabled');
      }
    });
  });
});
