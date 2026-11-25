/**
 * Tests for the OpenSooq adapter parser against a saved HTML fixture.
 * Run with: npx tsx tests/adapter.test.ts
 */
import { opensooqAdapter } from '../lib/sources/opensooq';
import { readFileSync } from 'fs';
import { join } from 'path';

let pass = 0;
let fail = 0;

function assert(condition: boolean, label: string) {
  if (condition) { pass++; } else { fail++; console.error(`  FAIL: ${label}`); }
}

function testParseListPage() {
  const fixturePath = join(__dirname, 'fixtures', 'opensooq_sample.html');
  let html: string;
  try {
    html = readFileSync(fixturePath, 'utf-8');
  } catch {
    console.log('  SKIP: fixture file not found, creating minimal test');
    html = `<article data-id="12345"><h2>آيفون ١٣ برو ١٢٨ جيجا</h2><p>حالة ممتازة مع جميع الملحقات</p><span class="price">٢٥٠٠ دينار</span><span class="city">طرابلس</span><img src="https://example.com/img1.jpg" /></article>`;
  }
  const listings = opensooqAdapter.parseListPage(html, 'phones');
  assert(listings.length > 0, `Should parse at least 1 listing, got ${listings.length}`);
  if (listings.length > 0) {
    const first = listings[0];
    assert(first.source === 'opensooq', `Source should be opensooq, got ${first.source}`);
    assert(first.category === 'phones', `Category should be phones, got ${first.category}`);
    assert(first.sourceId !== '', 'sourceId should not be empty');
    assert(first.title !== '', 'Title should not be empty');
    assert(first.url.startsWith('http'), `URL should start with http, got ${first.url}`);
  }
}

function testParsePost() {
  const raw = { id: '999', html: '<h2>تست</h2><p>وصف</p><img src="https://example.com/test.jpg" />', category: 'electronics' };
  const listing = opensooqAdapter.parsePost(raw);
  assert(listing.sourceId === '999', `sourceId: expected 999, got ${listing.sourceId}`);
  assert(listing.title === 'تست', `Title: expected تست, got ${listing.title}`);
  assert(listing.category === 'electronics', `Category: expected electronics, got ${listing.category}`);
  assert(listing.url.includes('999'), `URL should contain id 999: got ${listing.url}`);
}

function testParseArabicPrice() {
  const raw = { id: '111', html: '<h2>هاتف</h2><div class="price">١٥٠٠ دينار</div>', category: 'phones' };
  const listing = opensooqAdapter.parsePost(raw);
  assert(listing.price === 1500, `Arabic price parse: expected 1500, got ${listing.price}`);
  assert(listing.currency === 'LYD', `Currency: expected LYD, got ${listing.currency}`);
}

console.log('Testing OpenSooq adapter...');
testParseListPage();
testParsePost();
testParseArabicPrice();
console.log(`  ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
