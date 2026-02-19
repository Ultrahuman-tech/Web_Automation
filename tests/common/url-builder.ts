/**
 * Central URL Builder for Region-Prefixed URLs
 *
 * New URL format: /{region}/page/
 * Old URL format: /page/{region}/ (deprecated, handled by redirects)
 *
 * Usage:
 *   import { regionUrl, ringBuyUrl, getBaseUrl } from '../common/url-builder';
 *   const url = ringBuyUrl(getBaseUrl(), 'in');  // → https://…/in/ring/buy/
 */

// ── Base URL Resolution ──────────────────────────────────────────────────────

const DEFAULT_BASE_URL = 'https://www.ultrahuman.com';

const ENVIRONMENTS: Record<string, string> = {
  production: 'https://www.ultrahuman.com',
  staging: DEFAULT_BASE_URL,
  development: 'https://dev.ultrahuman.com',
  local: 'http://localhost:3000',
};

/**
 * Resolve the base URL from environment variables.
 * Priority: CUSTOM_BASE_URL > BASE_URL > TEST_ENV lookup > default staging
 */
export function getBaseUrl(): string {
  const custom = process.env.CUSTOM_BASE_URL || process.env.BASE_URL;
  if (custom) return ensureProtocol(custom).replace(/\/+$/, '');

  const env = process.env.TEST_ENV || 'staging';
  const url = ENVIRONMENTS[env] ?? DEFAULT_BASE_URL;
  return url.replace(/\/+$/, '');
}

// ── Region Mapping ───────────────────────────────────────────────────────────

const REGION_MAP: Record<string, string> = {
  global: 'us',
  pr: 'us',
  row: 'us',
};

/**
 * Normalize a region code. Handles special mappings:
 *   global → us, pr → us, row → us
 */
export function mapRegion(region: string): string {
  const lower = region.toLowerCase();
  return REGION_MAP[lower] ?? lower;
}

// ── URL Builders ─────────────────────────────────────────────────────────────

function ensureProtocol(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

function ensureTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

/**
 * Build a region-prefixed URL: {base}/{region}{path}
 *
 * @example regionUrl('https://…', 'in', '/ring/buy/') → 'https://…/in/ring/buy/'
 */
export function regionUrl(baseUrl: string, region: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const slug = mapRegion(region);
  const cleanPath = ensureTrailingSlash(path.startsWith('/') ? path : `/${path}`);
  return `${base}/${slug}${cleanPath}`;
}

// ── Shorthand Builders ───────────────────────────────────────────────────────

/** /{region}/ring/buy/ */
export function ringBuyUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/ring/buy/');
}

/** /{region}/ring/ */
export function ringLandingUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/ring/');
}

/** /{region}/ring/faq/ */
export function ringFaqUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/ring/faq/');
}

/** /{region}/ring/reviews/ */
export function ringReviewsUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/ring/reviews/');
}

/** /{region}/pricing/ */
export function pricingUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/pricing/');
}

/** /{region}/shop/ */
export function shopUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/shop/');
}

/** /{region}/home/buy/ */
export function homeBuyUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/home/buy/');
}

/** /{region}/home/ */
export function homeLandingUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/home/');
}

/** /{region}/blood-vision/buy/ */
export function bloodVisionBuyUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/blood-vision/buy/');
}

/** /{region}/blood-vision/ */
export function bloodVisionLandingUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/blood-vision/');
}

/** /{region}/blood-vision/faq/ */
export function bloodVisionFaqUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/blood-vision/faq/');
}

/** /{region}/rare/buy/ */
export function rareBuyUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/rare/buy/');
}

/** /{region}/rare/ */
export function rareLandingUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/rare/');
}

/** /{region}/diesel-ultrahuman-ring/ */
export function dieselRingUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/diesel-ultrahuman-ring/');
}

/** /{region}/diesel-ultrahuman-ring/buy/ */
export function dieselRingBuyUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/diesel-ultrahuman-ring/buy/');
}

/** /{region}/x/ */
export function membershipUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/x/');
}

/** /{region}/powerplugs/ */
export function powerPlugsUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/powerplugs/');
}

/** /{region}/m1/ */
export function m1Url(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/m1/');
}

/** /{region}/ (homepage for a region) */
export function homePageUrl(baseUrl: string, region: string): string {
  return regionUrl(baseUrl, region, '/');
}

// ── Country Slug Extraction (supports both old and new URL formats) ──────────

/**
 * Extract the country/region slug from a URL.
 * Supports:
 *   NEW: /{region}/ring/buy/    → region
 *   OLD: /ring/buy/{region}/    → region (fallback)
 *   Generic: first path segment if 2-3 char code
 */
export function extractRegionFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;

    // NEW format: /{region}/...  (2-letter code or xx or language variant like de-en)
    const newMatch = pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//i);
    if (newMatch?.[1]) return newMatch[1].toLowerCase();

    // OLD format: /ring/buy/{region}/ or /pricing/{region}/ etc.
    const oldMatch = pathname.match(/\/(?:ring\/buy|pricing|shop|home\/buy|blood-vision\/buy|rare\/buy)\/([a-z]{2,6})\/?$/i);
    if (oldMatch?.[1]) return oldMatch[1].toLowerCase();
  } catch {
    // Fallback for non-URL strings
    const fallback = url.match(/\/([a-z]{2}(?:-[a-z]{2})?)\//i);
    if (fallback?.[1]) return fallback[1].toLowerCase();
  }
  return null;
}

// ── Supported Regions ────────────────────────────────────────────────────────

export const SUPPORTED_REGIONS = [
  'in', 'us', 'ae', 'at', 'au', 'ca', 'gb', 'mx', 'sa', 'za',
  'de', 'jp', 'th', 'xx',
  // EU countries
  'be', 'cz', 'dk', 'fi', 'fr', 'ie', 'it', 'nl', 'pl', 'es',
  'bg', 'hr', 'ee', 'gr', 'hu', 'lv', 'lt', 'lu', 'mt', 'ro',
  'sk', 'si', 'pt', 'se', 'cy',
] as const;

export type SupportedRegion = typeof SUPPORTED_REGIONS[number];

export const CURRENCY_CONFIG: Record<string, { symbol: string; code: string }> = {
  in: { symbol: '₹', code: 'INR' },
  us: { symbol: '$', code: 'USD' },
  ae: { symbol: 'AED', code: 'AED' },
  at: { symbol: '€', code: 'EUR' },
  au: { symbol: 'A$', code: 'AUD' },
  ca: { symbol: 'C$', code: 'CAD' },
  gb: { symbol: '£', code: 'GBP' },
  mx: { symbol: 'MXN$', code: 'MXN' },
  sa: { symbol: 'SAR', code: 'SAR' },
  za: { symbol: 'R', code: 'ZAR' },
  de: { symbol: '€', code: 'EUR' },
  jp: { symbol: '¥', code: 'JPY' },
  th: { symbol: '฿', code: 'THB' },
  xx: { symbol: '$', code: 'USD' },
};
