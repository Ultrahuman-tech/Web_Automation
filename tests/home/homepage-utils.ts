import { Page, expect } from '@playwright/test';
import { CONFIG, LANGUAGE_URLS as CONFIG_LANGUAGE_URLS, REGION_URLS as CONFIG_REGION_URLS, getRegionUrl as configGetRegionUrl } from './config';

export interface LanguageTranslations {
  ringAir: string;
  buyNow: string;
  worldMostComfortable: string;
  sleepIndex: string;
  temperatureTracking: string;
  movementIndex: string;
  hrvInsights: string;
  personalizedNudges: string;
  discoverMetabolic: string;
  poweringWorldChampions: string;
  contactUs: string;
  downloadApp: string;
  products: string;
  resources: string;
  company: string;
  business: string;
  shop: string;
  forBusiness: string;
  healthcare: string;
  distributors: string;
  sportsTeams: string;
  creators: string;
  aboutUs: string;
  careers: string;
  privacyPolicy: string;
  termsOfUse: string;
  // Cookie banner elements
  cookieNotice: string;
  reject: string;
  accept: string;
  // Additional navigation
  ovulationTracking: string;
  m1CGM: string;
  ultraWork: string;
  // Additional headings
  introducingHome: string;
  accuracyCore: string;
}

// Re-export from config for backward compatibility
export const BASE_URL = CONFIG.BASE_URL;
export const LANGUAGE_URLS = CONFIG_LANGUAGE_URLS;
export const REGION_URLS = CONFIG_REGION_URLS;

export const TRANSLATIONS: Record<string, LanguageTranslations> = {
  en: {
    ringAir: 'Ultrahuman Ring AIR®',
    buyNow: 'Buy now',
    worldMostComfortable: 'Cycle & Ovulation PowerPlug now on  Ultrahuman Ring',
    sleepIndex: 'Wake up to your sleep insights',
    temperatureTracking: 'Temperature tracking made easy',
    movementIndex: "Here's to a more active you",
    hrvInsights: 'Maximize recovery with key HRV insights',
    personalizedNudges: 'The only nudges that you need',
    discoverMetabolic: 'Discover metabolic health with M1',
    poweringWorldChampions: 'Powering world champions',
    contactUs: 'Contact us',
    downloadApp: 'Download app',
    products: 'Products',
    resources: 'Resources',
    company: 'Company',
    business: 'Business',
    shop: 'Shop',
    forBusiness: 'For Business',
    healthcare: 'Healthcare',
    distributors: 'Distributors',
    sportsTeams: 'Sports Teams',
    creators: 'Creators',
    aboutUs: 'About Us',
    careers: 'Careers',
    privacyPolicy: 'Privacy Policy',
    termsOfUse: 'Terms of Use',
    // Cookie banner elements - these may not be present on all pages
    cookieNotice: 'This website uses cookies',
    reject: 'Reject',
    accept: 'Accept',
    // Additional navigation
    ovulationTracking: 'Ovulation Tracking',
    m1CGM: 'M1 CGM',
    ultraWork: 'UltraWork',
    // Additional headings
    introducingHome: 'Introducing Ultrahuman Home',
    accuracyCore: 'Accuracy at its core'
  },
  ja: {
    ringAir: 'Ultrahuman Ring AIR®',
    buyNow: '今すぐに購入',
    worldMostComfortable: '世界最軽量クラスのスマートリング',
    sleepIndex: 'を把握することの重要性',
    temperatureTracking: '体表面温度の変化を簡単に記録',
    movementIndex: 'よりアクティブな自分になるために',
    hrvInsights: '心拍変動と回復の深い関係を知ろう',
    personalizedNudges: '睡眠に関する1番重要なアドバイス',
    discoverMetabolic: '代謝に関する健康度を Ultrahuman M1で 可視化しよう',
    poweringWorldChampions: '世界中を元気にしてくれる チャンピオンたち',
    contactUs: 'お問い合わせ',
    downloadApp: 'アプリをダウンロード',
    products: '製品',
    resources: 'Resources',
    company: '会社概要',
    business: 'Business',
    shop: 'ストア',
    forBusiness: 'ビジネス向け',
    healthcare: 'ヘルスケア関係者様へ',
    distributors: '販売代理店様へ',
    sportsTeams: 'スポーツチーム様へ',
    creators: 'Creators',
    aboutUs: '当社について',
    careers: '採用情報',
    privacyPolicy: 'プライバシーポリシー',
    termsOfUse: '利用規約',
    // Cookie banner elements
    cookieNotice: 'このウェブサイトはクッキーを使用しています',
    reject: '拒否',
    accept: '同意する',
    // Additional navigation
    ovulationTracking: 'Ovulation Tracking',
    m1CGM: 'M1 CGM',
    ultraWork: 'UltraWork',
    // Additional headings
    introducingHome: 'Introducing Ultrahuman Home',
    accuracyCore: '精度へのこだわり'
  },
  de: {
    ringAir: 'Ultrahuman Ring AIR®',
    buyNow: 'Jetzt kaufen',
    worldMostComfortable: 'Der bequemste Schlaf-Tracker der Welt',
    sleepIndex: 'Wachen Sie mit Ihren Schlafdaten auf',
    temperatureTracking: 'Die einfache Temperatur-überwachung ist unerlässlich',
    movementIndex: 'Für ein aktiveres Leben wurde entwickelt',
    hrvInsights: 'Optimieren Sie Ihre Erholung mit wichtigen Informationen zur HRV',
    personalizedNudges: 'Die einzigen Anreize, die Sie brauchen',
    discoverMetabolic: 'Stoffwechsel- gesundheit mit M1',
    poweringWorldChampions: 'Im Dienste der Weltmeister',
    contactUs: 'Contact us',
    downloadApp: 'Download app',
    products: 'Products',
    resources: 'Resources',
    company: 'Company',
    business: 'Business',
    shop: 'Shop',
    forBusiness: 'For Business',
    healthcare: 'For Healthcare',
    distributors: 'For Distributors',
    sportsTeams: 'For Sports Teams',
    creators: 'Creators',
    aboutUs: 'About Us',
    careers: 'Careers',
    privacyPolicy: 'Privacy Policy',
    termsOfUse: 'Terms of Use',
    // Cookie banner elements
    cookieNotice: 'Diese Website verwendet Cookies',
    reject: 'Ablehnen',
    accept: 'Akzeptieren',
    // Additional navigation
    ovulationTracking: 'Ovulation Tracking',
    m1CGM: 'M1 CGM',
    ultraWork: 'UltraWork',
    // Additional headings
    introducingHome: 'Introducing Ultrahuman Home',
    accuracyCore: 'Präzision im Herzen unserer Technologie'
  },
  th: {
    ringAir: 'Ultrahuman Ring AIR®',
    buyNow: 'ซื้อเลยตอนนี้',
    worldMostComfortable: 'เครื่องติดตามการนอนหลับที่สะดวกสบายที่สุดในโลก',
    sleepIndex: 'ตื่นขึ้นพร้อมกับข้อมูลเชิงลึกเกี่ยวกับการนอนหลับของคุณ',
    temperatureTracking: 'การติดตามอุณหภูมิที่ง่ายดาย',
    movementIndex: 'นี่จะช่วยให้คุณมีความกระตือรือร้นมากขึ้น',
    hrvInsights: 'เพิ่มการฟื้นตัวสูงสุดด้วยข้อมูลเชิงลึกที่สำคัญของ HRV',
    personalizedNudges: 'การกระตุ้นเพียงอย่างเดียวที่คุณต้องการ',
    discoverMetabolic: 'ค้นพบ สุขภาพการเผาผลาญ ด้วย M1',
    poweringWorldChampions: 'พลังแห่ง แชมเปี้ยนโลก',
    contactUs: 'ติดต่อเรา',
    downloadApp: 'ดาวน์โหลดแอป',
    products: 'สินค้าต่างๆ',
    resources: 'ทรัพยากร',
    company: 'บริษัท',
    business: 'ธุรกิจ',
    shop: 'ร้านค้า',
    forBusiness: 'สำหรับธุรกิจ',
    healthcare: 'เพื่อการดูแลสุขภาพ',
    distributors: 'สำหรับตัวแทนจำหน่าย',
    sportsTeams: 'สำหรับทีมกีฬา',
    creators: 'ผู้สร้างสรรค์',
    aboutUs: 'เกี่ยวกับเรา',
    careers: 'อาชีพการงาน',
    privacyPolicy: 'นโยบายความเป็นส่วนตัว',
    termsOfUse: 'เงื่อนไขการใช้งาน',
    // Cookie banner elements
    cookieNotice: 'เว็บไซต์นี้ใช้คุกกี้',
    reject: 'ปฏิเสธ',
    accept: 'ยอมรับ',
    // Additional navigation
    ovulationTracking: 'การติดตามการตกไข่',
    m1CGM: 'M1 CGM',
    ultraWork: 'UltraWork',
    // Additional headings
    introducingHome: 'Introducing Ultrahuman Home',
    accuracyCore: 'ความแม่นยำคือสิ่งสำคัญ'
  }
};

export async function navigateToHomepage(page: Page, regionOrLanguage: string = 'us') {
  // Try region first, then fall back to language URL
  const url = REGION_URLS[regionOrLanguage as keyof typeof REGION_URLS]
    || LANGUAGE_URLS[regionOrLanguage as keyof typeof LANGUAGE_URLS]
    || REGION_URLS.us;
  await page.goto(url, {
    waitUntil: 'domcontentloaded'
  });
}

export async function navigateToRegionPage(page: Page, region: string) {
  const url = REGION_URLS[region as keyof typeof REGION_URLS];
  if (!url) {
    throw new Error(`Region ${region} is not supported. Available regions: ${Object.keys(REGION_URLS).join(', ')}`);
  }
  await page.goto(url, {
    waitUntil: 'domcontentloaded'
  });
}

export async function navigateToLanguagePage(page: Page, language: string) {
  const url = LANGUAGE_URLS[language as keyof typeof LANGUAGE_URLS];
  if (!url) {
    throw new Error(`Language ${language} is not supported. Available languages: ${Object.keys(LANGUAGE_URLS).join(', ')}`);
  }
  await page.goto(url, {
    waitUntil: 'domcontentloaded'
  });
}

export async function scrollToLanguageSwitcher(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
}

export async function findLanguageSwitcher(page: Page) {
  // Try multiple selectors to find the language switcher
  const selectors = [
    'text=EN',
    '[data-testid*="language"]',
    'select',
    '.language-switcher',
    '.language-selector',
    '[aria-label*="language"]',
    '[title*="language"]'
  ];
  
  for (const selector of selectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 2000 })) {
      return element;
    }
  }
  
  throw new Error('Language switcher not found');
}

export async function switchToLanguage(page: Page, languageCode: string) {
  await scrollToLanguageSwitcher(page);
  
  const languageSwitcher = await findLanguageSwitcher(page);
  await languageSwitcher.click();
  
  // Try different ways to select the language
  const languageSelectors = [
    `text=${languageCode.toUpperCase()}`,
    `text=${getLanguageName(languageCode)}`,
    `option[value*="${languageCode}"]`,
    `[data-value*="${languageCode}"]`
  ];
  
  for (const selector of languageSelectors) {
    const option = page.locator(selector).first();
    if (await option.isVisible({ timeout: 2000 })) {
      await option.click();
      break;
    }
  }
  
  await page.waitForLoadState('domcontentloaded');
}

export function getLanguageName(code: string): string {
  const languageNames: Record<string, string> = {
    'de': 'German',
    'fr': 'French',
    'es': 'Spanish',
    'it': 'Italian',
    'pt': 'Portuguese',
    'nl': 'Dutch',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese'
  };
  return languageNames[code] || code.toUpperCase();
}

export async function verifyTranslations(page: Page, languageCode: string, keyPhrases: string[] = []) {
  const translations = TRANSLATIONS[languageCode];
  if (!translations) {
    throw new Error(`No translations defined for language: ${languageCode}`);
  }
  
  // Default key phrases to verify if none provided
  const phrasesToCheck = keyPhrases.length > 0 ? keyPhrases : [
    'buyNow',
    'contactUs',
    'downloadApp',
    'products'
  ];
  
  for (const phrase of phrasesToCheck) {
    const translation = translations[phrase as keyof LanguageTranslations];
    if (translation) {
      await expect(page.locator(`text=${translation}`).first()).toBeVisible({ 
        timeout: 10000 
      });
    }
  }
}

export async function getAllAvailableLanguages(page: Page): Promise<string[]> {
  await scrollToLanguageSwitcher(page);
  
  const languageSwitcher = await findLanguageSwitcher(page);
  await languageSwitcher.click();
  
  // Get all available language options
  const languageOptions = await page.locator('option, [role="option"], .language-option').allTextContents();
  
  return languageOptions
    .map(option => option.trim())
    .filter(option => option && option.length > 0);
}

export async function takeLanguageScreenshot(page: Page, languageCode: string) {
  await page.screenshot({ 
    path: `test-results/homepage-${languageCode}.png`, 
    fullPage: true 
  });
}

export async function validateLanguagePage(page: Page, languageCode: string) {
  const translations = TRANSLATIONS[languageCode];
  if (!translations) {
    throw new Error(`No translations defined for language: ${languageCode}`);
  }

  // Validate key elements are present and translated
  const keyValidations = [
    { key: 'buyNow', description: 'Buy Now button' },
    { key: 'contactUs', description: 'Contact Us link' },
    { key: 'downloadApp', description: 'Download App link' },
    { key: 'products', description: 'Products section' },
    { key: 'shop', description: 'Shop link' },
    { key: 'forBusiness', description: 'For Business link' }
  ];

  let foundElements = 0;
  for (const validation of keyValidations) {
    const translation = translations[validation.key as keyof LanguageTranslations];
    if (translation) {
      // Check if any element with this text exists and is visible
      const elements = await page.locator(`text=${translation}`).all();
      let elementFound = false;
      
      for (const element of elements) {
        if (await element.isVisible()) {
          elementFound = true;
          foundElements++;
          console.log(`✅ ${languageCode.toUpperCase()} - ${validation.description}: "${translation}"`);
          break;
        }
      }
      
      if (!elementFound) {
        console.log(`⚠️ ${languageCode.toUpperCase()} - ${validation.description}: "${translation}" not visible`);
      }
    }
  }

  // Validate page title contains expected language elements
  const title = await page.title();
  expect(title).toBeTruthy();
  
  // Validate URL contains correct language path
  const currentUrl = page.url();
  const expectedUrl = LANGUAGE_URLS[languageCode as keyof typeof LANGUAGE_URLS];
  expect(currentUrl).toContain(expectedUrl);
  
  // At least some elements should be found
  expect(foundElements).toBeGreaterThan(0);
}

export async function validateAllLanguages(page: Page) {
  const languages = Object.keys(LANGUAGE_URLS);
  const results: Record<string, boolean> = {};

  for (const language of languages) {
    try {
      await navigateToLanguagePage(page, language);
      await validateLanguagePage(page, language);
      await takeLanguageScreenshot(page, language);
      results[language] = true;
      console.log(`✅ ${language.toUpperCase()} validation passed`);
    } catch (error) {
      results[language] = false;
      console.error(`❌ ${language.toUpperCase()} validation failed:`, error);
    }
  }

  return results;
}

export function getSupportedLanguages(): string[] {
  return Object.keys(LANGUAGE_URLS);
}

export function getLanguageUrl(language: string): string {
  return LANGUAGE_URLS[language as keyof typeof LANGUAGE_URLS] || LANGUAGE_URLS.en;
}

export function getRegionUrl(region: string): string {
  return configGetRegionUrl(region);
}
