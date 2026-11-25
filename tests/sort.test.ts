/**
 * Tests for sort order with nulls.
 * Run with: npx tsx tests/sort.test.ts
 */
import { sortListings } from '../lib/sort';
import type { NormalizedListing } from '../lib/types';

let pass = 0;
let fail = 0;

function assert(condition: boolean, label: string) {
  if (condition) { pass++; } else { fail++; console.error(`  FAIL: ${label}`); }
}

function makeListing(title: string, price: number | null, postedAt?: string): NormalizedListing {
  return { source: 'test', sourceId: title, title, price, currency: 'LYD', priceRaw: String(price), images: [], url: '', postedAt };
}

function testPriceAscNullsLast() {
  const listings = [makeListing('expensive', 5000), makeListing('null', null), makeListing('cheap', 100), makeListing('mid', 1000)];
  const sorted = sortListings(listings, 'price_asc');
  assert(sorted[0].price === 100, 'Cheapest first');
  assert(sorted[1].price === 1000, 'Mid second');
  assert(sorted[2].price === 5000, 'Expensive third');
  assert(sorted[3].price === null, 'Null last');
}

function testPriceDescNullsLast() {
  const listings = [makeListing('cheap', 100), makeListing('null', null), makeListing('expensive', 5000)];
  const sorted = sortListings(listings, 'price_desc');
  assert(sorted[0].price === 5000, 'Most expensive first');
  assert(sorted[1].price === 100, 'Cheapest second');
  assert(sorted[2].price === null, 'Null still last in desc');
}

function testNewest() {
  const listings = [makeListing('old', 100, '2024-01-01T00:00:00Z'), makeListing('newest', 200, '2024-12-01T00:00:00Z'), makeListing('mid', 300, '2024-06-01T00:00:00Z')];
  const sorted = sortListings(listings, 'newest');
  assert(sorted[0].title === 'newest', 'Newest first');
  assert(sorted[1].title === 'mid', 'Mid second');
  assert(sorted[2].title === 'old', 'Oldest last');
}

function testAllNulls() {
  const listings = [makeListing('a', null), makeListing('b', null)];
  const asc = sortListings(listings, 'price_asc');
  assert(asc.length === 2, 'All nulls: length preserved');
}

console.log('Testing sort order...');
testPriceAscNullsLast();
testPriceDescNullsLast();
testNewest();
testAllNulls();
console.log(`  ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
