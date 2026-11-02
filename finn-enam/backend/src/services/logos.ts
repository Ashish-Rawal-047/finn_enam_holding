/**
 * Company logo resolution: one place decides which image represents a listed company, and every
 * screen reuses the result through GET /api/logos/:symbol.
 *
 *   1. A verified logo URL stored on the company (companies.logo_url).
 *   2. A logo provider for the company's verified website domain: logo.dev when LOGO_DEV_TOKEN is
 *      set, otherwise Google's favicon service.
 *   3. The official website: icons it declares (apple-touch-icon, sized icons, web manifest),
 *      then /favicon.ico.
 *
 * The domain always comes from the website the company-info provider reports for that exact
 * listing (stored on the company, or fetched for a search result FINN has not imported yet). It is
 * never derived from the company name. Every candidate is downloaded and checked (image signature,
 * dimensions, aspect ratio); the stored logo wins when valid, otherwise the sharpest image does.
 * The result is cached in company_logos and served from FINN's own origin. When nothing validates,
 * the symbol is cached as `missing` and the UI shows initials instead of an unverified image.
 */
import { eq, or } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { companies, companyLogos } from '../db/schema.js';
import { providers } from '../providers/registry.js';

const OK_TTL_MS = 30 * 86_400_000;
const MISSING_TTL_MS = 3 * 86_400_000;
// The website could not be reached (timeout, DNS): retry soon instead of caching "no logo" for days.
const UNREACHABLE_TTL_MS = 3_600_000;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_BYTES = 512 * 1024;
const MIN_PX = 16;
const MAX_ASPECT = 3;
const MAX_CONCURRENT = 3;
const UA = 'Mozilla/5.0 (compatible; FINN-logo-resolver/1.0; +https://github.com/)';

/** Listing symbols in Yahoo form: RELIANCE.NS, 500325.BO. A bare symbol is read as NSE. */
export function normalizeSymbol(raw: string): string | null {
  const s = raw.trim().toUpperCase();
  if (!/^[A-Z0-9&-]{1,20}(\.(NS|BO))?$/.test(s)) return null;
  return /\.(NS|BO)$/.test(s) ? s : `${s}.NS`;
}

/** Hostname of an official website URL, without "www.". Null for anything that is not a public hostname. */
export function domainFromWebsite(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const host = new URL(/^[a-z]+:\/\//i.test(website) ? website : `https://${website}`).hostname.toLowerCase().replace(/^www\./, '');
    return isPublicHostname(host) ? host : null;
  } catch {
    return null;
  }
}

function isPublicHostname(host: string) {
  return host.includes('.') && !/^[\d.]+$/.test(host) && !host.includes(':') && !/(^|\.)(localhost|local|internal|lan)$/.test(host);
}

// ---------------------------------------------------------------------------
// Image validation
// ---------------------------------------------------------------------------
export interface CheckedImage {
  contentType: string;
  width: number;
  height: number;
  bytes: Buffer;
}

/** Recognises PNG, JPEG, GIF, WebP, ICO and SVG by signature and reads their pixel size. */
export function inspectImage(b: Buffer): Omit<CheckedImage, 'bytes'> | null {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG' && b.length >= 24) return { contentType: 'image/png', width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.toString('ascii', 0, 3) === 'GIF') return { contentType: 'image/gif', width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' && b.length >= 30) {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return { contentType: 'image/webp', width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    if (chunk === 'VP8 ') return { contentType: 'image/webp', width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return { contentType: 'image/webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    return null;
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length; ) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      if ((marker >= 0xc0 && marker <= 0xcf) && ![0xc4, 0xc8, 0xcc].includes(marker)) return { contentType: 'image/jpeg', width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
      i += 2 + b.readUInt16BE(i + 2);
    }
    return null;
  }
  if (b.readUInt16LE(0) === 0 && b.readUInt16LE(2) === 1) {
    const count = b.readUInt16LE(4);
    let best = 0;
    for (let i = 0; i < count && 6 + 16 * i + 1 < b.length; i++) best = Math.max(best, b[6 + 16 * i] || 256);
    return count > 0 && best > 0 ? { contentType: 'image/x-icon', width: best, height: best } : null;
  }
  const head = b.toString('utf8', 0, Math.min(b.length, 1024));
  if (/<svg[\s>]/i.test(head)) return { contentType: 'image/svg+xml', width: 512, height: 512 }; // scalable
  return null;
}

/** A usable logo: a real image, at least 16 px, roughly square (not a banner). */
export function acceptable(img: Omit<CheckedImage, 'bytes'>) {
  const lo = Math.min(img.width, img.height);
  const hi = Math.max(img.width, img.height);
  return lo >= MIN_PX && hi / lo <= MAX_ASPECT;
}

async function fetchLimited(url: string, accept: string): Promise<{ bytes: Buffer; finalUrl: string } | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(parsed.protocol) || !isPublicHostname(parsed.hostname)) return null;
  try {
    const res = await fetch(parsed, { headers: { 'User-Agent': UA, Accept: accept }, redirect: 'follow', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok || !res.body) return null;
    const final = new URL(res.url || url);
    if (!isPublicHostname(final.hostname)) return null;
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      size += chunk.length;
      if (size > MAX_BYTES) return null;
      chunks.push(Buffer.from(chunk));
    }
    return { bytes: Buffer.concat(chunks), finalUrl: final.toString() };
  } catch {
    return null;
  }
}

async function fetchImage(url: string): Promise<CheckedImage | null> {
  const got = await fetchLimited(url, 'image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8');
  if (!got) return null;
  const info = inspectImage(got.bytes);
  return info && acceptable(info) ? { ...info, bytes: got.bytes } : null;
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------
type Source = 'stored' | 'logo.dev' | 'google' | 'website' | 'favicon';
interface Candidate {
  source: Source;
  url: string;
}

const attr = (tag: string, name: string) => new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(tag)?.[1] ?? null;

/** Icons the official homepage declares, largest first (apple-touch-icon, sized icons, manifest). */
export function declaredIcons(html: string, baseUrl: string): Array<{ url: string; size: number; manifest?: boolean }> {
  const out: Array<{ url: string; size: number; manifest?: boolean }> = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = (attr(tag, 'rel') ?? '').toLowerCase();
    const href = attr(tag, 'href');
    if (!href) continue;
    let url: string;
    try {
      url = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    if (rel.includes('manifest')) out.push({ url, size: 0, manifest: true });
    else if (rel.includes('apple-touch-icon')) out.push({ url, size: Number(/(\d+)x\d+/.exec(attr(tag, 'sizes') ?? '')?.[1] ?? 180) });
    else if (/\bicon\b/.test(rel)) out.push({ url, size: Number(/(\d+)x\d+/.exec(attr(tag, 'sizes') ?? '')?.[1] ?? 32) });
  }
  return out.sort((a, b) => b.size - a.size);
}

async function websiteCandidates(website: string): Promise<{ candidates: Candidate[]; reachable: boolean }> {
  const page = await fetchLimited(/^[a-z]+:\/\//i.test(website) ? website : `https://${website}`, 'text/html');
  const origin = page ? new URL(page.finalUrl).origin : `https://${domainFromWebsite(website)}`;
  const found: Candidate[] = [];
  if (page) {
    const icons = declaredIcons(page.bytes.toString('utf8'), page.finalUrl);
    for (const icon of icons.filter((i) => !i.manifest).slice(0, 4)) found.push({ source: 'website', url: icon.url });
    const manifest = icons.find((i) => i.manifest);
    if (manifest) {
      const m = await fetchLimited(manifest.url, 'application/manifest+json,application/json');
      try {
        const parsed = JSON.parse(m?.bytes.toString('utf8') ?? 'null') as { icons?: Array<{ src?: string; sizes?: string }> } | null;
        const best = (parsed?.icons ?? [])
          .filter((i) => i.src)
          .map((i) => ({ src: i.src!, size: Number(/(\d+)x\d+/.exec(i.sizes ?? '')?.[1] ?? 0) }))
          .sort((a, b) => b.size - a.size)[0];
        if (best) found.push({ source: 'website', url: new URL(best.src, manifest.url).toString() });
      } catch {
        /* malformed manifest: ignore */
      }
    }
  }
  found.push({ source: 'favicon', url: `${origin}/favicon.ico` });
  return { candidates: found, reachable: Boolean(page) };
}

function providerCandidate(domain: string): Candidate {
  return env.LOGO_DEV_TOKEN
    ? { source: 'logo.dev', url: `https://img.logo.dev/${domain}?token=${encodeURIComponent(env.LOGO_DEV_TOKEN)}&size=128&format=png&fallback=404` }
    : { source: 'google', url: `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128` };
}

/** The stored logo wins; otherwise sharper is better up to 128 px, and lighter breaks near-ties (8 KB ≈ 1 px). */
const score = (c: Candidate, img: CheckedImage) => (c.source === 'stored' ? 10_000 : 0) + Math.min(img.width, img.height, 128) - img.bytes.length / 8192;

// ---------------------------------------------------------------------------
// Identity → logo
// ---------------------------------------------------------------------------
interface Identity {
  companyId: string | null;
  website: string | null;
  domain: string | null;
  logoUrl: string | null;
}

/** The company behind a listing symbol: FINN's stored record, else the provider's profile for that exact symbol. */
async function identityFor(symbol: string): Promise<Identity> {
  const base = symbol.replace(/\.(NS|BO)$/, '');
  const bySuffix = symbol.endsWith('.BO') ? eq(companies.bseCode, base) : eq(companies.nseSymbol, base);
  const [row] = await db
    .select({ id: companies.id, website: companies.website, websiteDomain: companies.websiteDomain, logoUrl: companies.logoUrl })
    .from(companies)
    .where(or(eq(companies.yahooSymbol, symbol), bySuffix))
    .limit(1);
  if (row) return { companyId: row.id, website: row.website, domain: row.websiteDomain ?? domainFromWebsite(row.website), logoUrl: row.logoUrl };
  // Not imported yet (a search result): ask the provider about this listing. The profile is only
  // returned for a recognised equity, so an unknown or non-equity symbol has no logo.
  const record = await providers.companyInfo.getBySymbol(symbol).catch(() => null);
  return { companyId: null, website: record?.website ?? null, domain: domainFromWebsite(record?.website), logoUrl: null };
}

async function resolve(symbol: string) {
  const identity = await identityFor(symbol);
  const candidates: Candidate[] = [];
  if (identity.logoUrl) candidates.push({ source: 'stored', url: identity.logoUrl });
  let reachable = true;
  if (identity.domain) {
    candidates.push(providerCandidate(identity.domain));
    const site = await websiteCandidates(identity.website ?? identity.domain);
    candidates.push(...site.candidates);
    reachable = site.reachable;
  }
  const checked = await Promise.all(candidates.map(async (c) => ({ c, img: await fetchImage(c.url) })));
  const best = checked.filter((x): x is { c: Candidate; img: CheckedImage } => x.img !== null).sort((a, b) => score(b.c, b.img) - score(a.c, a.img))[0];

  const row = {
    symbol,
    companyId: identity.companyId,
    domain: identity.domain,
    status: best ? ('ok' as const) : ('missing' as const),
    source: best?.c.source ?? (reachable ? null : 'unreachable'),
    // Never persist the provider token inside a URL.
    sourceUrl: best ? best.c.url.replace(/token=[^&]+/, 'token=…') : null,
    contentType: best?.img.contentType ?? null,
    width: best?.img.width ?? null,
    height: best?.img.height ?? null,
    image: best?.img.bytes ?? null,
    checkedAt: new Date(),
  };
  await db.insert(companyLogos).values(row).onConflictDoUpdate({ target: companyLogos.symbol, set: row });
  if (identity.companyId && identity.domain) {
    await db.update(companies).set({ websiteDomain: identity.domain }).where(eq(companies.id, identity.companyId));
  }
  return row;
}

// One resolution per symbol at a time, and only a few in parallel (each may call the provider).
const inFlight = new Map<string, Promise<Awaited<ReturnType<typeof resolve>>>>();
let running = 0;
const waiting: Array<() => void> = [];
async function slot<T>(fn: () => Promise<T>) {
  if (running >= MAX_CONCURRENT) await new Promise<void>((r) => waiting.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

/** Cached logo for a symbol, resolving it when absent or stale. */
export async function getLogo(symbol: string) {
  const [cached] = await db.select().from(companyLogos).where(eq(companyLogos.symbol, symbol));
  const age = cached ? Date.now() - cached.checkedAt.getTime() : Infinity;
  const ttl = cached?.status === 'ok' ? OK_TTL_MS : cached?.source === 'unreachable' ? UNREACHABLE_TTL_MS : MISSING_TTL_MS;
  if (cached && age < ttl) return cached;
  let pending = inFlight.get(symbol);
  if (!pending) {
    pending = slot(() => resolve(symbol)).finally(() => inFlight.delete(symbol));
    inFlight.set(symbol, pending);
  }
  try {
    return await pending;
  } catch (err) {
    // Resolution failed (database or network): serve a stale logo rather than nothing.
    if (cached) return cached;
    throw err;
  }
}
