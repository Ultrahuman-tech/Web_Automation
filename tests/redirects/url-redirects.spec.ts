import { test, expect } from '@playwright/test';

const BASE_URL =
  process.env.REDIRECT_BASE_URL ??
  'https://www.ultrahuman.com';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RedirectHop {
  url: string;
  status: number;
  location: string | null;
}

interface RedirectChain {
  hops: RedirectHop[];
  finalUrl: string;
  finalStatus: number;
  finalPath: string;
}

// ---------------------------------------------------------------------------
// Helper: follow the full redirect chain (up to maxHops) and return every hop
// ---------------------------------------------------------------------------
async function followRedirects(
  request: any,
  path: string,
  maxHops = 10
): Promise<RedirectChain> {
  const hops: RedirectHop[] = [];
  let currentUrl = `${BASE_URL}${path}`;

  for (let i = 0; i < maxHops; i++) {
    const response = await request.get(currentUrl, { maxRedirects: 0 });
    const status = response.status();
    const location = response.headers()['location'] ?? null;

    hops.push({ url: currentUrl, status, location });

    if (![301, 302, 307, 308].includes(status) || !location) {
      // Not a redirect — we've reached the final destination
      const finalPath = new URL(currentUrl).pathname;
      return { hops, finalUrl: currentUrl, finalStatus: status, finalPath };
    }

    // Resolve relative Location headers to absolute
    currentUrl = location.startsWith('http')
      ? location
      : new URL(location, currentUrl).href;
  }

  // Exceeded max hops
  const finalPath = new URL(currentUrl).pathname;
  return { hops, finalUrl: currentUrl, finalStatus: 0, finalPath };
}

// ---------------------------------------------------------------------------
// Helper: single-hop redirect check (for tests that only need the first hop)
// ---------------------------------------------------------------------------
async function fetchRedirect(
  request: any,
  path: string
): Promise<{ status: number; location: string | null; fullUrl: string }> {
  const fullUrl = `${BASE_URL}${path}`;
  const response = await request.get(fullUrl, { maxRedirects: 0 });
  const status = response.status();
  const location = response.headers()['location'] ?? null;
  return { status, location, fullUrl };
}

// ---------------------------------------------------------------------------
// Helper: format redirect chain for test report attachment
// ---------------------------------------------------------------------------
function formatChainForReport(chain: RedirectChain, expected: string): string {
  const lines: string[] = [
    `Expected final path: ${expected}`,
    `Actual final path:   ${chain.finalPath}`,
    `Final status:        ${chain.finalStatus}`,
    `Total hops:          ${chain.hops.length}`,
    '',
    'Redirect chain:',
  ];

  chain.hops.forEach((hop, i) => {
    lines.push(`  [${i + 1}] ${hop.url}`);
    lines.push(`      Status: ${hop.status} | Location: ${hop.location ?? '(none)'}`);
  });

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 1. Legacy URL Redirects
//    Old format: /ring/buy/us  -->  New format: /us/ring/buy/
//    May involve multiple hops (trailing slash 308 → legacy redirect)
// ---------------------------------------------------------------------------
test.describe('Legacy URL Redirects', () => {
  test.describe.configure({ timeout: 30_000 });

  // `toRegion` is the region prefix expected in the final path.
  // The server may add a language suffix (e.g., /at/ → /at-en/) depending
  // on the request Accept-Language header, so we match with a regex.
  const legacyRedirects: { from: string; toRegion: string; toPage: string }[] = [
    { from: '/ring/buy/us',     toRegion: 'us',     toPage: '/ring/buy/' },
    { from: '/ring/buy/in',     toRegion: 'in',     toPage: '/ring/buy/' },
    { from: '/ring/buy/ae',     toRegion: 'ae',     toPage: '/ring/buy/' },
    { from: '/ring/buy/at',     toRegion: 'at',     toPage: '/ring/buy/' },
    { from: '/ring/buy/au',     toRegion: 'au',     toPage: '/ring/buy/' },
    { from: '/ring/buy/ca',     toRegion: 'ca',     toPage: '/ring/buy/' },
    { from: '/ring/buy/za',     toRegion: 'za',     toPage: '/ring/buy/' },
    { from: '/ring/buy/sa',     toRegion: 'sa',     toPage: '/ring/buy/' },
    { from: '/ring/buy/mx',     toRegion: 'mx',     toPage: '/ring/buy/' },
    { from: '/ring/buy/gb',     toRegion: 'gb',     toPage: '/ring/buy/' },
    { from: '/ring/buy/global', toRegion: 'global',  toPage: '/ring/buy/' },
    { from: '/shop/in',         toRegion: 'in',     toPage: '/shop/' },
    { from: '/shop/us',         toRegion: 'us',     toPage: '/shop/' },
    { from: '/pricing/in',      toRegion: 'in',     toPage: '/pricing/' },
    { from: '/pricing/de',      toRegion: 'de',     toPage: '/pricing/' },
    { from: '/pricing/gb',      toRegion: 'gb',     toPage: '/pricing/' },
  ];

  for (const { from, toRegion, toPage } of legacyRedirects) {
    test(`${from} -> /${toRegion}${toPage}`, async ({ request }) => {
      const chain = await followRedirects(request, from);

      // Build a regex that accepts /{region}/ or /{region}-{lang}/ followed by the page path
      // e.g., /at/ring/buy/ or /at-en/ring/buy/
      const expectedPattern = new RegExp(
        `^\\/${toRegion}(-[a-z]{2})?${toPage.replace(/\//g, '\\/')}$`
      );
      const expectedDesc = `/${toRegion}[-(lang)]${toPage}`;

      // Attach full chain to test report for debugging
      const report = formatChainForReport(chain, expectedDesc);
      test.info().attach('redirect-chain', { body: report, contentType: 'text/plain' });

      // Verify at least one redirect happened
      expect(
        chain.hops.length,
        `Expected at least one redirect hop for ${from}\n\n${report}`
      ).toBeGreaterThan(1);

      // Verify the final destination path matches the expected region-prefixed URL
      expect(
        chain.finalPath,
        `Expected ${from} to land on ${expectedDesc}, but got ${chain.finalPath}\n\n${report}`
      ).toMatch(expectedPattern);

      // Verify the final response is 200
      expect(
        chain.finalStatus,
        `Expected final status 200 for ${from}, got ${chain.finalStatus}\n\n${report}`
      ).toBe(200);
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Geo Redirects (302)
//    Bare paths without a region prefix get 302'd to /{region}/…
// ---------------------------------------------------------------------------
test.describe('Geo Redirects (302)', () => {
  test.describe.configure({ timeout: 30_000 });

  const geoPaths: string[] = [
    '/',
    '/ring/buy/',
    '/shop/',
    '/pricing/',
    '/home/buy/',
    '/blood-vision/',
    '/rare/',
    '/ring/faq/',
    '/ring/reviews/',
  ];

  for (const path of geoPaths) {
    test(`${path} geo-redirects to /{region}${path === '/' ? '' : path}`, async ({ request }) => {
      const { status, location, fullUrl } = await fetchRedirect(request, path);

      const report = [
        `Request URL: ${fullUrl}`,
        `Status:      ${status}`,
        `Location:    ${location ?? '(none)'}`,
      ].join('\n');
      test.info().attach('redirect-details', { body: report, contentType: 'text/plain' });

      expect(
        [301, 302, 307, 308].includes(status),
        `Expected a redirect status for ${path}, got ${status}\n\n${report}`
      ).toBe(true);
      expect(location, `Location header missing for ${path}\n\n${report}`).not.toBeNull();

      // Verify the location contains a region prefix (2-letter code after the origin).
      const locationPath = location!.startsWith('http')
        ? new URL(location!).pathname
        : location!;

      expect(
        locationPath,
        `Geo redirect for ${path} should start with a region prefix, got ${locationPath}\n\n${report}`
      ).toMatch(/^\/[a-z]{2}\//);
    });
  }
});

// ---------------------------------------------------------------------------
// 3. Puerto Rico Redirects
//    /pr/… -> /us/…
// ---------------------------------------------------------------------------
test.describe('Puerto Rico Redirects', () => {
  test.describe.configure({ timeout: 30_000 });

  const prRedirects: { from: string; to: string }[] = [
    { from: '/pr/', to: '/us/' },
    { from: '/pr/ring/buy/', to: '/us/ring/buy/' },
    { from: '/pr/shop/', to: '/us/shop/' },
    { from: '/pr/pricing/', to: '/us/pricing/' },
  ];

  for (const { from, to } of prRedirects) {
    test(`${from} -> ${to}`, async ({ request }) => {
      const chain = await followRedirects(request, from);

      const report = formatChainForReport(chain, to);
      test.info().attach('redirect-chain', { body: report, contentType: 'text/plain' });

      // Accept any redirect status (301, 302, 307, 308)
      expect(
        chain.hops.some(h => [301, 302, 307, 308].includes(h.status)),
        `Expected at least one redirect hop for ${from}\n\n${report}`
      ).toBe(true);

      // Verify final path
      expect(
        chain.finalPath,
        `Expected ${from} to land on ${to}, got ${chain.finalPath}\n\n${report}`
      ).toBe(to);
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Trailing Slash Enforcement
//    Paths without trailing slash should redirect to add one
// ---------------------------------------------------------------------------
test.describe('Trailing Slash Enforcement', () => {
  test.describe.configure({ timeout: 30_000 });

  const trailingSlashCases: { from: string; to: string }[] = [
    { from: '/us/ring/buy', to: '/us/ring/buy/' },
    { from: '/in/shop', to: '/in/shop/' },
    { from: '/ae/ring/buy', to: '/ae/ring/buy/' },
    { from: '/gb/pricing', to: '/gb/pricing/' },
  ];

  for (const { from, to } of trailingSlashCases) {
    test(`${from} -> ${to} (adds trailing slash)`, async ({ request }) => {
      const { status, location, fullUrl } = await fetchRedirect(request, from);

      const report = [
        `Request URL:     ${fullUrl}`,
        `Expected path:   ${to}`,
        `Status:          ${status}`,
        `Location:        ${location ?? '(none)'}`,
        `Location path:   ${location ? (location.startsWith('http') ? new URL(location).pathname : location.split('?')[0]) : '(none)'}`,
      ].join('\n');
      test.info().attach('redirect-details', { body: report, contentType: 'text/plain' });

      expect(
        [301, 302, 307, 308].includes(status),
        `Expected redirect status for ${from} (trailing slash enforcement), got ${status}\n\n${report}`
      ).toBe(true);
      expect(location, `Location header missing for ${from}\n\n${report}`).not.toBeNull();

      const locationPath = location!.startsWith('http')
        ? new URL(location!).pathname
        : location!.split('?')[0];

      expect(
        locationPath,
        `Expected ${from} to redirect to ${to}, got ${locationPath}\n\n${report}`
      ).toBe(to);
    });
  }
});

// ---------------------------------------------------------------------------
// 5. Query Parameter Preservation
//    UTM / marketing params must survive the redirect chain
// ---------------------------------------------------------------------------
test.describe('Query Parameter Preservation', () => {
  test.describe.configure({ timeout: 30_000 });

  test('/ring/buy/?utm_source=google keeps utm_source through geo-redirect', async ({ request }) => {
    const chain = await followRedirects(request, '/ring/buy/?utm_source=google');

    const report = formatChainForReport(chain, '/{region}/ring/buy/?utm_source=google');
    test.info().attach('redirect-chain', { body: report, contentType: 'text/plain' });

    // Parse the final URL to check params
    const finalUrlObj = new URL(chain.finalUrl);

    expect(
      finalUrlObj.searchParams.get('utm_source'),
      `utm_source should be preserved through redirect chain, final URL: ${chain.finalUrl}\n\n${report}`
    ).toBe('google');
  });

  test('/ring/buy/in?ref=abc keeps ref param through legacy redirect', async ({ request }) => {
    const chain = await followRedirects(request, '/ring/buy/in?ref=abc');

    const report = formatChainForReport(chain, '/in/ring/buy/?ref=abc');
    test.info().attach('redirect-chain', { body: report, contentType: 'text/plain' });

    // Parse the final URL to check params
    const finalUrlObj = new URL(chain.finalUrl);

    expect(
      finalUrlObj.searchParams.get('ref'),
      `ref param should be preserved through redirect chain, final URL: ${chain.finalUrl}\n\n${report}`
    ).toBe('abc');

    // Verify the final path has the correct region prefix
    expect(
      chain.finalPath,
      `Final path should start with /in/ region prefix, got ${chain.finalPath}\n\n${report}`
    ).toMatch(/^\/in\//);
  });
});

// ---------------------------------------------------------------------------
// 6. New-format pages return 200 (no redirect needed)
//    Region-prefixed URLs should load directly without any redirects
// ---------------------------------------------------------------------------
test.describe('New-format URLs load directly (200)', () => {
  test.describe.configure({ timeout: 30_000 });

  const directPages: { path: string; label: string }[] = [
    { path: '/us/ring/buy/', label: 'US Ring Buy' },
    { path: '/in/ring/buy/', label: 'IN Ring Buy' },
    { path: '/ae/ring/buy/', label: 'AE Ring Buy' },
    { path: '/gb/ring/buy/', label: 'GB Ring Buy' },
    { path: '/de/pricing/',  label: 'DE Pricing' },
    { path: '/us/shop/',     label: 'US Shop' },
    { path: '/in/shop/',     label: 'IN Shop' },
    { path: '/jp/',          label: 'JP Homepage' },
    { path: '/us/',          label: 'US Homepage' },
  ];

  for (const { path, label } of directPages) {
    test(`${path} (${label}) returns 200`, async ({ request }) => {
      const fullUrl = `${BASE_URL}${path}`;
      const response = await request.get(fullUrl, { maxRedirects: 5 });
      const status = response.status();
      const finalUrl = response.url();

      const report = [
        `Request URL: ${fullUrl}`,
        `Final URL:   ${finalUrl}`,
        `Status:      ${status}`,
      ].join('\n');
      test.info().attach('page-load', { body: report, contentType: 'text/plain' });

      expect(
        status,
        `Expected 200 for ${path} (${label}), got ${status}\n\n${report}`
      ).toBe(200);
    });
  }
});
