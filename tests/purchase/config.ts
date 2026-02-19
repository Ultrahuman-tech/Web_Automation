/**
 * Purchase Flow Configuration
 * 
 * This file contains all purchase-specific configuration settings
 * for the Ultrahuman Ring AIR purchase flow testing.
 */

// Environment configuration - Set this to switch between environments
export const ENVIRONMENT = process.env.TEST_ENV || 'production';

// Custom base URL support - takes precedence over environment selection
export const CUSTOM_BASE_URL = process.env.CUSTOM_BASE_URL;

// Environment-specific configurations
export const ENVIRONMENTS = {
  production: {
    BASE_URL: 'https://www.ultrahuman.com',
    description: 'Production environment'
  },
  staging: {
    BASE_URL: 'https://www.ultrahuman.com',
    description: 'Staging environment (region-prefix refactor)'
  },
  development: {
    BASE_URL: 'https://dev.ultrahuman.com',
    description: 'Development environment'
  },
  local: {
    BASE_URL: 'http://localhost:3000',
    description: 'Local development environment'
  }
} as const;

// Purchase flow specific configuration
export const PURCHASE_CONFIG = {
  // Base URL priority: 1. Custom URL, 2. Environment URL, 3. Production fallback
  BASE_URL: CUSTOM_BASE_URL || ENVIRONMENTS[ENVIRONMENT as keyof typeof ENVIRONMENTS]?.BASE_URL || ENVIRONMENTS.production.BASE_URL,
  
  // Test settings
  DEFAULT_TIMEOUT: 10000,
  SCREENSHOT_PATH: 'test-results',
  
  // Language settings
  DEFAULT_LANGUAGE: 'en',
  SUPPORTED_LANGUAGES: ['en', 'ja', 'de', 'th'] as const,
  
  // Country/region settings (new region-prefix format; 'global' maps to 'us')
  SUPPORTED_COUNTRIES: ['in', 'us', 'ae', 'at', 'au', 'ca', 'gb', 'mx', 'sa', 'za', 'de', 'jp'] as const,
  
  // Test data
  TEST_USER: {
    email: 'test@example.com',
    name: 'Test User'
  },
  
  // Purchase flow specific settings
  MAX_COMBINATIONS: 330, // Total combinations per language-country
  DEFAULT_WORKERS: 3,
  DEFAULT_MAX_COMBINATIONS: 10, // Default for quick testing
  
  // Ring configuration
  RING_COLORS: ['ROSE_GOLD', 'RAW_TITANIUM', 'ASTER_BLACK', 'MATTE_GREY', 'BIONIC_GOLD'] as const,
  RING_SIZES: ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'] as const,
  CHARGER_TYPES: ['standard', 'voyager'] as const,
  COVERAGE_TYPES: ['none', '1-year', '2-year'] as const,
  
  // Currency configuration
  CURRENCY_CONFIG: {
    in: { symbol: '₹', code: 'INR', name: 'Indian Rupee' },
    us: { symbol: '$', code: 'USD', name: 'US Dollar' },
    ae: { symbol: 'AED', code: 'AED', name: 'UAE Dirham' },
    at: { symbol: '€', code: 'EUR', name: 'Euro' },
    global: { symbol: '$', code: 'USD', name: 'US Dollar' }
  }
} as const;

// Dynamic purchase flow URLs based on environment
// NEW FORMAT: /{region}/ring/buy/  (region prefix at start of path)
// Language is no longer a URL path prefix — all languages share the same region URL.
const _base = PURCHASE_CONFIG.BASE_URL.replace(/\/+$/, '');

export const PURCHASE_URLS = {
  // English purchase URLs — region prefix format
  en: {
    in: `${_base}/in/ring/buy/`,
    us: `${_base}/us/ring/buy/`,
    ae: `${_base}/ae/ring/buy/`,
    at: `${_base}/at/ring/buy/`,
    au: `${_base}/au/ring/buy/`,
    ca: `${_base}/ca/ring/buy/`,
    gb: `${_base}/gb/ring/buy/`,
    mx: `${_base}/mx/ring/buy/`,
    sa: `${_base}/sa/ring/buy/`,
    za: `${_base}/za/ring/buy/`,
    de: `${_base}/de/ring/buy/`,
    jp: `${_base}/jp/ring/buy/`,
  },
  // Japanese — same region URLs (language handled by app, not URL path)
  ja: {
    in: `${_base}/in/ring/buy/`,
    us: `${_base}/us/ring/buy/`,
    ae: `${_base}/ae/ring/buy/`,
    at: `${_base}/at/ring/buy/`,
    jp: `${_base}/jp/ring/buy/`,
  },
  // German — same region URLs
  de: {
    in: `${_base}/in/ring/buy/`,
    us: `${_base}/us/ring/buy/`,
    ae: `${_base}/ae/ring/buy/`,
    at: `${_base}/at/ring/buy/`,
    de: `${_base}/de/ring/buy/`,
    'de-en': `${_base}/de-en/ring/buy/`,
  },
  // Thai — same region URLs
  th: {
    in: `${_base}/in/ring/buy/`,
    us: `${_base}/us/ring/buy/`,
    ae: `${_base}/ae/ring/buy/`,
    at: `${_base}/at/ring/buy/`,
    th: `${_base}/th/ring/buy/`,
  }
} as const;

// Helper functions
export function getBaseUrl(): string {
  return PURCHASE_CONFIG.BASE_URL;
}

export function getSupportedLanguages(): readonly string[] {
  return PURCHASE_CONFIG.SUPPORTED_LANGUAGES;
}

export function getSupportedCountries(): readonly string[] {
  return PURCHASE_CONFIG.SUPPORTED_COUNTRIES;
}

export function isLanguageSupported(language: string): boolean {
  return PURCHASE_CONFIG.SUPPORTED_LANGUAGES.includes(language as any);
}

export function isCountrySupported(country: string): boolean {
  return PURCHASE_CONFIG.SUPPORTED_COUNTRIES.includes(country as any);
}

// Purchase URL helper functions
export function getPurchaseUrl(language: string, country: string): string {
  // Map legacy 'global' to 'us'
  const region = country === 'global' ? 'us' : country;
  const langUrls = PURCHASE_URLS[language as keyof typeof PURCHASE_URLS];
  if (!langUrls) {
    console.warn(`Language ${language} not supported, falling back to English`);
    return PURCHASE_URLS.en[region as keyof typeof PURCHASE_URLS.en] || PURCHASE_URLS.en.in;
  }
  return langUrls[region as keyof typeof langUrls] || PURCHASE_URLS.en[region as keyof typeof PURCHASE_URLS.en] || langUrls.in;
}

// Environment management functions
export function getCurrentEnvironment(): string {
  return ENVIRONMENT;
}

export function getEnvironmentInfo(): { name: string; baseUrl: string; description: string; isCustom: boolean } {
  const env = ENVIRONMENTS[ENVIRONMENT as keyof typeof ENVIRONMENTS];
  const isCustom = !!CUSTOM_BASE_URL;
  return {
    name: isCustom ? 'custom' : ENVIRONMENT,
    baseUrl: PURCHASE_CONFIG.BASE_URL,
    description: isCustom ? `Custom URL: ${CUSTOM_BASE_URL}` : (env?.description || 'Unknown environment'),
    isCustom
  };
}

export function logEnvironmentInfo(): void {
  const info = getEnvironmentInfo();
  console.log(`🌍 Environment: ${info.name}`);
  console.log(`🔗 Base URL: ${info.baseUrl}`);
  console.log(`📝 Description: ${info.description}`);
  if (info.isCustom) {
    console.log(`🎯 Using custom base URL (overrides environment selection)`);
  }
}

// Purchase flow specific helper functions
export function getMaxCombinations(): number {
  return parseInt(process.env.MAX_COMBINATIONS || PURCHASE_CONFIG.DEFAULT_MAX_COMBINATIONS.toString());
}

export function getWorkers(): number {
  return parseInt(process.env.WORKERS || PURCHASE_CONFIG.DEFAULT_WORKERS.toString());
}

export function getCurrencyConfig(country: string) {
  return PURCHASE_CONFIG.CURRENCY_CONFIG[country as keyof typeof PURCHASE_CONFIG.CURRENCY_CONFIG] || PURCHASE_CONFIG.CURRENCY_CONFIG.in;
}

export function getAllRingColors(): readonly string[] {
  return PURCHASE_CONFIG.RING_COLORS;
}

export function getAllRingSizes(): readonly string[] {
  return PURCHASE_CONFIG.RING_SIZES;
}

export function getAllChargerTypes(): readonly string[] {
  return PURCHASE_CONFIG.CHARGER_TYPES;
}

export function getAllCoverageTypes(): readonly string[] {
  return PURCHASE_CONFIG.COVERAGE_TYPES;
}

// Custom base URL validation
export function validateCustomBaseUrl(url?: string): boolean {
  if (!url) return true; // No custom URL is valid
  
  try {
    const parsedUrl = new URL(url);
    // Must be http or https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      console.error(`❌ Custom base URL must use HTTP or HTTPS protocol. Got: ${parsedUrl.protocol}`);
      return false;
    }
    
    // Must have a hostname
    if (!parsedUrl.hostname) {
      console.error(`❌ Custom base URL must have a valid hostname. Got: ${url}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Invalid custom base URL format: ${url}`);
    return false;
  }
}

// Test configuration validation
export function validateTestConfig(language: string, country: string): boolean {
  // Validate custom base URL first
  if (!validateCustomBaseUrl(CUSTOM_BASE_URL)) {
    return false;
  }
  
  if (!isLanguageSupported(language)) {
    console.error(`❌ Language '${language}' is not supported. Supported languages: ${getSupportedLanguages().join(', ')}`);
    return false;
  }
  
  if (!isCountrySupported(country)) {
    console.error(`❌ Country '${country}' is not supported. Supported countries: ${getSupportedCountries().join(', ')}`);
    return false;
  }
  
  return true;
}
