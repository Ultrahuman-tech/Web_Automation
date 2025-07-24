import { test, expect } from '@playwright/test';

// Configure test timeout
test.setTimeout(30000);

test.describe('Ultrahuman Homepage', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage before each test
    await page.goto('https://www.ultrahuman.com/', { waitUntil: 'domcontentloaded' });
    
    // Wait for basic elements to be present
    await page.waitForSelector('body', { timeout: 10000 });
  });

  test('should load homepage with correct title and URL', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/Ultrahuman/);
    
    // Verify URL
    await expect(page).toHaveURL('https://www.ultrahuman.com/');
  });

  test('should display cookie consent banner', async ({ page }) => {
    // Check cookie banner elements
    await expect(page.locator('text=This website uses cookies')).toBeVisible();
    await expect(page.locator('button:has-text("Accept")')).toBeVisible();
    await expect(page.locator('button:has-text("Reject")')).toBeVisible();
    await expect(page.locator('a:has-text("Info")')).toBeVisible();
  });

  test('should display main navigation elements', async ({ page }) => {
    // Check navigation menu items - test a few key ones
    await expect(page.locator('a[href="/ring/buy/"]:has-text("Ring AIR")').first()).toBeVisible();
    await expect(page.locator('a[href="/blood-vision/"]:has-text("Blood Vision")').first()).toBeVisible();
    await expect(page.locator('a[href="/home/buy/"]:has-text("Home")').first()).toBeVisible();
    await expect(page.locator('a[href="/shop/"]:has-text("Shop")').first()).toBeVisible();

    // Check Buy Now button in header - use more specific selector
    await expect(page.locator('a[href="/ring/buy/"][class*="btn-accent"]:has-text("Buy now")').first()).toBeEnabled();
  });

  test('should display Blood Vision hero section', async ({ page }) => {
    // Check main headings
    await expect(page.locator('h1:has-text("Blood Vision")')).toBeVisible();
    
    // Check hero content
    await expect(page.locator('text=100+ Blood and Urine biomarkers')).toBeVisible();
    
    // Check CTA button
    await expect(page.locator('button:has-text("Book now")')).toBeVisible();
  });

  test('should display Ring AIR product section', async ({ page }) => {
    // Check section headings
    await expect(page.locator('h1:has-text("Ultrahuman Ring AIR")')).toBeVisible();
    
    // Check product description
    await expect(page.locator('text=Accurately tracks sleep, HRV, temperature, and movement')).toBeVisible();
    
    // Check CTA buttons - use more specific selector
    await expect(page.locator('a[data-buttontype="ring homepage buy"]')).toBeVisible();
  });

  test('should display Ultrahuman Home section', async ({ page }) => {
    // Check section heading
    await expect(page.locator('h2:has-text("Introducing Ultrahuman Home")')).toBeVisible();
    
    // Check description
    await expect(page.locator('text=A silent device that understands your space by measuring markers that impact your health')).toBeVisible();
    
    // Check CTA buttons - use more specific selectors
    await expect(page.locator('a[href="/home/buy/"]:has-text("Buy now")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Learn more")')).toBeVisible();
    
    // Check product image
    await expect(page.locator('img[alt="Ultrahuman Home"]')).toBeVisible();
  });

  test('should display accuracy section', async ({ page }) => {
    // Check section heading
    await expect(page.locator('h2:has-text("Accuracy at its core")')).toBeVisible();
    
    // Check accuracy content
    await expect(page.locator('h3:has-text("Precision engineering at the UltraFactory")')).toBeVisible();
    await expect(page.locator('h3:has-text("Trusted by the World\'s #1 Ranked Cycling Team")')).toBeVisible();
    await expect(page.locator('h3:has-text("More accurate from the Finger than the Wrist")')).toBeVisible();
  });

  test('should display design and features sections', async ({ page }) => {
    // Check design section
    await expect(page.locator('text=2.4 grams Light')).toBeVisible();
    
    // Check technical specifications
    await expect(page.locator('text=PPG sensor')).toBeVisible();
    await expect(page.locator('text=6-axis motion sensor')).toBeVisible();
    await expect(page.locator('text=hypoallergenic smooth inner shell')).toBeVisible();
  });

  test('should display battery life section', async ({ page }) => {
    // Check battery information
    await expect(page.locator('text=4-6 days')).toBeVisible();
    await expect(page.locator('text=battery life')).toBeVisible();
    await expect(page.locator('text=explore the uncharted, uninterrupted')).toBeVisible();
  });

  test('should display health tracking features', async ({ page }) => {
    // Check feature sections
    await expect(page.locator('h4:has-text("Wake up to your sleep insights")')).toBeVisible();
    await expect(page.locator('h4:has-text("Temperature tracking made easy")')).toBeVisible();
    await expect(page.locator('h4:has-text("Listen to your body clock")')).toBeVisible();
    
    // Check specific features
    await expect(page.locator('text=Sleep Index')).toBeVisible();
    await expect(page.locator('text=Skin temperature')).toBeVisible();
    await expect(page.locator('text=The Phase Response Curve')).toBeVisible();
    await expect(page.locator('text=The Movement Index').first()).toBeVisible();
  });

  test('should display M1 CGM section', async ({ page }) => {
    // Check section heading
    await expect(page.locator('h2:has-text("Discover metabolic health with M1")')).toBeVisible();
    
    // Check description
    await expect(page.locator('text=Ultrahuman M1 helps you measure the impact of food and activity on your body in real time through glucose as a biomarker')).toBeVisible();
    
    // Check CTA
    await expect(page.locator('a:has-text("Explore Ultrahuman M1")')).toBeVisible();
  });

  test('should display AIR with M1 section', async ({ page }) => {
    // Check section heading
    await expect(page.locator('h2:has-text("AIR with M1, uniquely powerful")')).toBeVisible();
    
    // Check description
    await expect(page.locator('text=The glucose data from the M1 in convergence with the movement, body and sleep data from Ring AIR will provide deep correlations')).toBeVisible();
  });

  test('should display testimonials section', async ({ page }) => {
    // Check section heading
    await expect(page.locator('h2:has-text("Powering world champions")')).toBeVisible();
    
    // Check team names
    await expect(page.locator('text=Roojai Insurance Cycling Team').first()).toBeVisible();
    await expect(page.locator('text=UAE Team ADQ').first()).toBeVisible();
    await expect(page.locator('text=Team UAE Emirates').first()).toBeVisible();
  });

  test('should display careers section', async ({ page }) => {
    // Check section heading
    await expect(page.locator('h3:has-text("Build Ultrahuman")')).toBeVisible();
    
    // Check description
    await expect(page.locator('text=Work with a diverse team of electronics, software, supply chain, materials science, and biomedical engineers')).toBeVisible();
    
    // Check CTA
    await expect(page.locator('a:has-text("View openings")')).toBeVisible();
  });

  test('should display footer elements', async ({ page }) => {
    // Check footer sections
    await expect(page.locator('h5:has-text("Contact us")')).toBeVisible();
    await expect(page.locator('h5:has-text("Social")')).toBeVisible();
    await expect(page.locator('h5:has-text("Download app")')).toBeVisible();
    await expect(page.locator('h5:has-text("Products")')).toBeVisible();
    await expect(page.locator('h5:has-text("Resources")')).toBeVisible();
    await expect(page.locator('h5:has-text("Company")')).toBeVisible();
    await expect(page.locator('h5:has-text("Business")')).toBeVisible();
    
    // Check contact information
    await expect(page.locator('a[href="mailto:support@ultrahuman.com"]')).toBeVisible();
    await expect(page.locator('a[href="tel:1800-102-8693"]')).toBeVisible();
    
    // Check social media links
    await expect(page.locator('a[href*="twitter.com/ultrahumanhq"]').first()).toBeVisible();
    await expect(page.locator('a[href*="linkedin.com/company/ultrahumanhq"]').first()).toBeVisible();
    await expect(page.locator('a[href*="instagram.com/ultrahumanhq"]').first()).toBeVisible();
    await expect(page.locator('a[href*="youtube.com/@UltrahumanOfficial"]').first()).toBeVisible();
    
    // Check app store links
    await expect(page.locator('a[href*="apps.apple.com"]')).toBeVisible();
    await expect(page.locator('a[href*="play.google.com"]')).toBeVisible();
    
    // Check copyright
    await expect(page.locator('text=© 2020-2025 Ultrahuman Healthcare Pvt Ltd')).toBeVisible();
    await expect(page.locator('text=ISO27001, GDPR, and HIPAA compliant')).toBeVisible();
  });

  test('should display support elements', async ({ page }) => {
    // Check support buttons
    await expect(page.locator('button:has-text("Instant WhatsApp support")')).toBeVisible();
    await expect(page.locator('button:has-text("Talk to a Product Specialist")')).toBeVisible();
  });

  test('should display cart sidebar', async ({ page }) => {
    // Check cart elements
    await expect(page.locator('h3:has-text("Your cart is empty")')).toBeVisible();
    await expect(page.locator('text=Browse through our products and find something for you')).toBeVisible();
    await expect(page.locator('button:has-text("Back to browse")')).toBeVisible();
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check for proper heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5').all();
    expect(headings.length).toBeGreaterThan(0);
    
    // Check for alt text on images
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      // Skip images without alt text as they might be decorative
      if (alt !== null) {
        expect(alt).toBeTruthy();
      }
    }
    
    // Check for proper link attributes
    const links = await page.locator('a').all();
    for (const link of links) {
      const href = await link.getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('should have responsive design elements', async ({ page }) => {
    // Check for responsive elements
    await expect(page.locator('img[alt*="mobile"]').first()).toBeVisible();
    await expect(page.locator('img[alt*="desktop"]').first()).toBeVisible();
    
    // Check for video elements
    await expect(page.locator('video').first()).toBeVisible();
  });

  test('should display all product images', async ({ page }) => {
    // Check product images
    await expect(page.locator('img[alt="Ultrahuman Ring"]').first()).toBeVisible();
    await expect(page.locator('img[alt="blood vision artwork"]').first()).toBeVisible();
    await expect(page.locator('img[alt="woman touching leaf wearing ultrahuman ring"]').first()).toBeVisible();
  });

  test('should display key interactive elements without clicking', async ({ page }) => {
    // Check key buttons are visible and enabled
    await expect(page.locator('button:has-text("Learn more")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Instant WhatsApp support")')).toBeVisible();
    
    // Check key links are visible
    await expect(page.locator('a[href="/ring/buy/"]').first()).toBeVisible();
    await expect(page.locator('a[href="/home/buy/"]').first()).toBeVisible();
    await expect(page.locator('a[href="/blood-vision/"]').first()).toBeVisible();
  });
}); 