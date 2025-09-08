/**
 * Configuration file for Ultrahuman test automation
 * 
 * This file contains all configurable settings that can be easily modified
 * without changing the test logic.
 */

// Base URL configuration - Change this to test different environments
export const CONFIG = {
  // Main base URL - easily changeable for different environments
  BASE_URL: 'https://www.ultrahuman.com',
  
  // Alternative URLs for different environments (uncomment to use)
  // BASE_URL: 'https://website-production-git-localization-ssr-ultrahuman.vercel.app',  // Staging environment
  // BASE_URL: 'https://dev.ultrahuman.com',      // Development environment
  // BASE_URL: 'http://localhost:3000',           // Local development
  
  // Test settings
  DEFAULT_TIMEOUT: 10000,
  SCREENSHOT_PATH: 'test-results',
  
  // Language settings
  DEFAULT_LANGUAGE: 'en',
  SUPPORTED_LANGUAGES: ['en', 'ja', 'de', 'th'] as const,
  
  // Test data
  TEST_USER: {
    email: 'test@example.com',
    name: 'Test User'
  }
} as const;

// Language-specific URLs derived from base URL
export const LANGUAGE_URLS = {
  en: `${CONFIG.BASE_URL}/`,
  ja: `${CONFIG.BASE_URL}/ja/`,
  de: `${CONFIG.BASE_URL}/de/`,
  th: `${CONFIG.BASE_URL}/th/`
} as const;

// Helper functions
export function getBaseUrl(): string {
  return CONFIG.BASE_URL;
}

export function getLanguageUrl(language: string): string {
  return LANGUAGE_URLS[language as keyof typeof LANGUAGE_URLS] || LANGUAGE_URLS.en;
}

export function getSupportedLanguages(): readonly string[] {
  return CONFIG.SUPPORTED_LANGUAGES;
}

export function isLanguageSupported(language: string): boolean {
  return CONFIG.SUPPORTED_LANGUAGES.includes(language as any);
}

// Environment-specific configurations
export const ENVIRONMENTS = {
  production: {
    BASE_URL: 'https://www.ultrahuman.com',
    description: 'Production environment'
  },
  staging: {
    BASE_URL: 'https://staging.ultrahuman.com',
    description: 'Staging environment'
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

// Function to switch environment
export function setEnvironment(env: keyof typeof ENVIRONMENTS): void {
  const envConfig = ENVIRONMENTS[env];
  if (envConfig) {
    // This would need to be implemented based on your test runner
    console.log(`Switching to ${env} environment: ${envConfig.BASE_URL}`);
    console.log(`Description: ${envConfig.description}`);
  }
}
