import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CATEGORIES = [
  { key: 'phones', path: '/ar/phones' },
  { key: 'cars', path: '/ar/cars' },
  { key: 'real-estate', path: '/ar/real-estate' },
  { key: 'electronics', path: '/ar/electronics' },
];

interface SourceRow {
  id: string;
  name: string;
  name_ar: string;
  base_url: string;
  enabled: boolean;
  poll_interval_seconds: number;
  last_fetched_at: string | null;
}

interface SessionRow {
  source_id: string;
  cookies_encrypted: string | null;
  status: string;
}

interface ListingRow {
  source_id: string;
  source_listing_id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  price_raw: string | null;
  city: string | null;
  category: string | null;
  condition: string | null;
  images: string[];
  posted_at: string | null;
  url: string;
  is_new: boolean;
  is_range: boolean;
  dupe_group_id: string | null;
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function convertArabicDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const idx = ARABIC_DIGITS.indexOf(ch);
    out += idx >= 0 ? String(idx) : ch;
  }
  return out;
}

const FREE_MARKERS = ['مجاني', 'free', 'مجاناً', 'مجانا'];
const CURRENCY_MAP: Record<string, string> = {
  'دينار': 'LYD',
  'د.ل': 'LYD',
  'دل': 'LYD',
  '$': 'USD',
  'دولار': 'USD',
  '€': 'EUR',
};

function parsePrice(raw: string | null | undefined): { price: number | null; currency: string | null; isRange: boolean } {
  if (raw == null) return { price: null, currency: null, isRange: false };
  const normalized = convertArabicDigits(raw).trim().toLowerCase();
  if (normalized === '' || FREE_MARKERS.some((m) => normalized.includes(m))) {
    return { price: null, currency: null, isRange: false };
  }
  let currency: string | null = null;
  for (const [marker, curr] of Object.entries(CURRENCY_MAP)) {
    if (normalized.includes(marker.toLowerCase())) {
      currency = curr;
      break;
    }
  }
  const numberTokens = normalized.match(/[\d,]+(?:\.\d+)?/g);
  if (!numberTokens || numberTokens.length === 0) return { price: null, currency, isRange: false };
  const numbers = numberTokens.map((t) => parseFloat(t.replace(/,/g, ''))).filter((n) => !isNaN(n));
  if (numbers.length === 0) return { price: null, currency, isRange: false };
  const hasRangeSeparator = /[-–]|to|إلى|او|or/.test(normalized);
  const isRange = hasRangeSeparator && numbers.length >= 2;
  return { price: Math.min(...numbers), currency, isRange };
}

function extractText(html: string, regex: RegExp): string | null {
  const m = html.match(regex);
  if (!m) return null;
  return m[1].replace(/<[^>]*>/g, '').trim();
}

function parseOpenSooqPage(html: string, category: string, baseUrl: string): ListingRow[] {
  const listings: ListingRow[] = [];
  const articleRegex = /<article[^>]*data-id="([^"]+)"[^>]*>([\s\S]*?)<\/article>|<div[^>]*class="[^"]*post[^"]*"[^>]*data-id="([^"]+)"[^>]*>([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;
  while ((match = articleRegex.exec(html)) !== null) {
    const rawId = match[1] || match[3];
    const rawHtml = match[2] || match[4];
    if (!rawId || !rawHtml) continue;
    listings.push(parseOpenSooqPost(rawId, rawHtml, category, baseUrl));
  }
  if (listings.length === 0) {
    const anchorRegex = /<a[^>]*href="(\/ar\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let amatch: RegExpExecArray | null;
    const seen = new Set<string>();
    while ((amatch = anchorRegex.exec(html)) !== null) {
      const href = amatch[1];
      const inner = amatch[2];
      if (!href || seen.has(href) || !href.includes('-')) continue;
      seen.add(href);
      const idMatch = href.match(/(\d+)(?:\?|$|#)/);
      const id = idMatch ? idMatch[1] : href;
      listings.push(parseOpenSooqPost(id, inner, category, baseUrl, href));
    }
  }
  return listings;
}

function parseOpenSooqPost(id: string, html: string, category: string, baseUrl: string, href?: string): ListingRow {
  const title = extractText(html, /<h[23][^>]*>([\s\S]*?)<\/h[23]>/i) || extractText(html, /title="([^"]+)"/i) || 'بدون عنوان';
  const description = extractText(html, /<p[^>]*>([\s\S]*?)<\/p>/i) || '';
  const priceRaw = extractText(html, /(?:price|postPrice)[^>]*>([\s\S]*?)<\//i) || extractText(html, /(\d[\d,]*\s*(?:دينار|د\.ل|دولار)?)/i) || '';
  const city = extractText(html, /(?:city|location)[^>]*>([\s\S]*?)<\//i) || '';
  const imgMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
  const images = imgMatch ? [imgMatch[1]] : [];
  const parsed = parsePrice(priceRaw);
  const url = href ? `${baseUrl}${href}` : `${baseUrl}/ar/post/${id}`;
  return {
    source_id: 'opensooq',
    source_listing_id: id,
    title: title.trim(),
    description: description.trim(),
    price: parsed.price,
    currency: parsed.currency ?? 'LYD',
    price_raw: priceRaw.trim(),
    city: city.trim() || null,
    category,
    condition: null,
    images,
    posted_at: null,
    url,
    is_new: true,
    is_range: parsed.isRange,
    dupe_group_id: null,
  };
}

async function fetchWithBackoff(url: string, cookies: string): Promise<{ html: string; status: number } | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': BROWSER_USER_AGENT,
          'Accept-Language': 'ar,en;q=0.9',
          Cookie: cookies || '',
        },
      });
      if (res.status === 403 || res.status === 429) {
        const backoff = Math.pow(2, attempt) * 5000;
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      if (!res.ok) return { html: '', status: res.status };
      const html = await res.text();
      return { html, status: res.status };
    } catch {
      return null;
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: sources } = await supabase.from('sources').select('*').eq('enabled', true);
    if (!sources || sources.length === 0) {
      return new Response(JSON.stringify({ message: 'No enabled sources' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Record<string, { newCount: number; status: string; error?: string }> = {};

    for (const source of sources as SourceRow[]) {
      if (source.id !== 'opensooq') {
        results[source.id] = { newCount: 0, status: 'skipped' };
        continue;
      }

      const startTime = Date.now();

      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('source_id', source.id)
        .maybeSingle();

      const sessionRow = session as SessionRow | null;
      if (!sessionRow || sessionRow.status !== 'valid' || !sessionRow.cookies_encrypted) {
        results[source.id] = { newCount: 0, status: 'no_session' };
        await supabase.from('fetch_logs').insert({
          source_id: source.id,
          status_code: null,
          new_count: 0,
          duration_ms: Date.now() - startTime,
          error: 'No valid session',
        });
        continue;
      }

      let totalNew = 0;
      let lastStatus = 200;
      let hadError = false;
      const allNewListings: ListingRow[] = [];

      for (const cat of CATEGORIES) {
        const url = `${source.base_url}${cat.path}`;
        const result = await fetchWithBackoff(url, sessionRow.cookies_encrypted);
        if (!result) {
          hadError = true;
          break;
        }
        lastStatus = result.status;
        if (result.html) {
          const parsed = parseOpenSooqPage(result.html, cat.key, source.base_url);
          allNewListings.push(...parsed);
        }
        await new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000));
      }

      if (hadError) {
        results[source.id] = { newCount: 0, status: 'blocked', error: 'Repeated blocks or fetch failure' };
        await supabase.from('fetch_logs').insert({
          source_id: source.id,
          status_code: lastStatus,
          new_count: 0,
          duration_ms: Date.now() - startTime,
          error: 'Blocked or fetch failure',
        });
        continue;
      }

      const seen = new Set<string>();
      const unique: ListingRow[] = [];
      for (const l of allNewListings) {
        const key = `${l.source_id}:${l.source_listing_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(l);
      }

      const { data: existing } = await supabase
        .from('listings')
        .select('id, source_id, source_listing_id, price')
        .eq('source_id', source.id);

      const existingKeys = new Set((existing ?? []).map((e) => `${e.source_id}:${e.source_listing_id}`));
      const toInsert = unique.filter((l) => !existingKeys.has(`${l.source_id}:${l.source_listing_id}`));

      if (toInsert.length > 0) {
        const { error } = await supabase.from('listings').insert(toInsert);
        if (!error) {
          totalNew = toInsert.length;
        }
      }

      await supabase.from('sources').update({ last_fetched_at: new Date().toISOString() }).eq('id', source.id);

      await supabase.from('fetch_logs').insert({
        source_id: source.id,
        status_code: lastStatus,
        new_count: totalNew,
        duration_ms: Date.now() - startTime,
      });

      results[source.id] = { newCount: totalNew, status: 'ok' };
    }

    return new Response(JSON.stringify({ results, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
