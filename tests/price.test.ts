/**
 * Tests for the price parser.
 * Run with: npx tsx tests/price.test.ts
 */
import { parsePrice, convertArabicDigits, formatPrice } from '../lib/price';

let pass = 0;
let fail = 0;

function assert(condition: boolean, label: string) {
  if (condition) { pass++; } else { fail++; console.error(`  FAIL: ${label}`); }
}

function testConvertArabicDigits() {
  assert(convertArabicDigits('١٢٣٤٥') === '12345', 'Arabic digits 12345');
  assert(convertArabicDigits('٩٩٩') === '999', 'Arabic digits 999');
  assert(convertArabicDigits('mixed ١٢ text') === 'mixed 12 text', 'Mixed Arabic and Latin');
  assert(convertArabicDigits('abc') === 'abc', 'No Arabic digits unchanged');
}

function testParsePrice() {
  let r = parsePrice('١٥٠٠ دينار');
  assert(r.price === 1500, `Arabic digits + دينار: expected 1500, got ${r.price}`);
  assert(r.currency === 'LYD', `Arabic digits currency: expected LYD, got ${r.currency}`);
  assert(r.isRange === false, 'Arabic digits not a range');

  r = parsePrice('3,500 د.ل');
  assert(r.price === 3500, `Western digits with commas: expected 3500, got ${r.price}`);
  assert(r.currency === 'LYD', `د.ل currency: expected LYD, got ${r.currency}`);

  r = parsePrice('مجاني');
  assert(r.price === null, 'مجاني should be null');
  assert(r.isRange === false, 'مجاني not a range');

  r = parsePrice('');
  assert(r.price === null, 'Empty string should be null');

  r = parsePrice(null);
  assert(r.price === null, 'null input should be null');

  r = parsePrice('1000 - 2000 دينار');
  assert(r.price === 1000, `Range lower bound: expected 1000, got ${r.price}`);
  assert(r.isRange === true, 'Range should be flagged');

  r = parsePrice('٥٠٠ إلى ٧٠٠ د.ل');
  assert(r.price === 500, `Arabic range lower bound: expected 500, got ${r.price}`);
  assert(r.isRange === true, 'Arabic range should be flagged');

  r = parsePrice('$200');
  assert(r.price === 200, `USD price: expected 200, got ${r.price}`);
  assert(r.currency === 'USD', `USD currency: expected USD, got ${r.currency}`);

  r = parsePrice('السعر عند الاتصال');
  assert(r.price === null, 'No number in text should be null');
}

function testFormatPrice() {
  assert(formatPrice(1500, 'LYD') === '1,500 د.ل', `Format 1500 LYD: got "${formatPrice(1500, 'LYD')}"`);
  assert(formatPrice(null, 'LYD') === '—', 'Format null should be em-dash');
  assert(formatPrice(3500000, 'LYD') === '3,500,000 د.ل', `Format large number: got "${formatPrice(3500000, 'LYD')}"`);
}

console.log('Testing price parser...');
testConvertArabicDigits();
testParsePrice();
testFormatPrice();
console.log(`  ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
