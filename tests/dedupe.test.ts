/**
 * Tests for dedupe logic.
 * Run with: npx tsx tests/dedupe.test.ts
 */
import { normalizeTitle, titleSimilarity, areLikelyDuplicates, dedupeBySourceId } from '../lib/dedupe';
import type { NormalizedListing } from '../lib/types';

let pass = 0;
let fail = 0;

function assert(condition: boolean, label: string) {
  if (condition) { pass++; } else { fail++; console.error(`  FAIL: ${label}`); }
}

function testNormalizeTitle() {
  assert(normalizeTitle('iPhone 13 Pro Max') === 'iphone 13 pro max', 'Normalize English');
  assert(normalizeTitle('آيفون ١٣ برو ماكس') === 'آيفون ١٣ برو ماكس', 'Normalize Arabic (digits kept)');
  assert(normalizeTitle('  Hello   World  ') === 'hello world', 'Collapse spaces');
}

function testTitleSimilarity() {
  assert(titleSimilarity('iPhone 13 Pro', 'iPhone 13 Pro') === 1, 'Identical titles');
  assert(titleSimilarity('iPhone 13 Pro', 'iPhone 13 Pro Max') > 0.8, 'Very similar titles');
  assert(titleSimilarity('iPhone 13 Pro', 'Samsung Galaxy S22') < 0.5, 'Different titles');
}

function testAreLikelyDuplicates() {
  const a: NormalizedListing = { source: 'opensooq', sourceId: '1', title: 'iPhone 13 Pro 128GB', price: 3000, currency: 'LYD', priceRaw: '3000', images: [], url: 'http://a' };
  const b: NormalizedListing = { source: 'facebook', sourceId: '2', title: 'iPhone 13 Pro 128GB', price: 3000, currency: 'LYD', priceRaw: '3000', images: [], url: 'http://b' };
  const c: NormalizedListing = { source: 'facebook', sourceId: '3', title: 'Samsung Galaxy S22', price: 3000, currency: 'LYD', priceRaw: '3000', images: [], url: 'http://c' };

  assert(areLikelyDuplicates(a, b) === true, 'Same title + price across sources = dupe');
  assert(areLikelyDuplicates(a, c) === false, 'Different title = not dupe');

  const d: NormalizedListing = { ...a, sourceId: '4' };
  assert(areLikelyDuplicates(a, d) === false, 'Same source = not cross-source dupe');
}

function testDedupeBySourceId() {
  const listings: NormalizedListing[] = [
    { source: 'opensooq', sourceId: '1', title: 'A', price: null, currency: null, priceRaw: '', images: [], url: '' },
    { source: 'opensooq', sourceId: '1', title: 'A dup', price: null, currency: null, priceRaw: '', images: [], url: '' },
    { source: 'opensooq', sourceId: '2', title: 'B', price: null, currency: null, priceRaw: '', images: [], url: '' },
    { source: 'facebook', sourceId: '1', title: 'C', price: null, currency: null, priceRaw: '', images: [], url: '' },
  ];
  const deduped = dedupeBySourceId(listings);
  assert(deduped.length === 3, `Dedupe by sourceId: expected 3, got ${deduped.length}`);
}

console.log('Testing dedupe...');
testNormalizeTitle();
testTitleSimilarity();
testAreLikelyDuplicates();
testDedupeBySourceId();
console.log(`  ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
