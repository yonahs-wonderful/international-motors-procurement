import test from 'node:test';
import assert from 'node:assert/strict';
import { clone, total, validDate, validateOrder, validateReceipt, csv } from './domain.js';
import { seedState, suppliers, locations } from './data.js';

const sample = () => clone(seedState().orders[0]);

test('sample orders can be submitted and totals reflect quantity and price edits', () => {
  const order = sample();
  assert.deepEqual(validateOrder(order, suppliers, locations), []);
  assert.equal(total(order), 15600);
  order.lines[0].quantity = 3;
  order.lines[0].price = 86.5;
  assert.equal(total(order), 259.5);
});

test('submission rejects missing supplier, description, locations, and lines', () => {
  const order = sample();
  Object.assign(order, { supplierId: '', description: ' ', billTo: '', shipTo: '', lines: [] });
  const fields = validateOrder(order, suppliers, locations).map(e => e.field);
  for (const field of ['supplierName', 'description', 'billTo', 'shipTo', 'lines']) assert.ok(fields.includes(field), field);
});

test('submission rejects supplier-site and catalog ownership mismatches', () => {
  const order = sample();
  order.supplierSite = 'TOLEDO';
  order.lines[0].catalogSupplierId = 'SUP-41870';
  const errors = validateOrder(order, suppliers, locations);
  assert.ok(errors.some(e => e.field === 'supplierSite'));
  assert.ok(errors.some(e => e.message.includes('different supplier')));
});

test('submission rejects invalid amounts, accounting and dates', () => {
  const order = sample();
  Object.assign(order.lines[0], { quantity: -1, price: Infinity, needBy: '2026-02-30', account: 'bad' });
  const fields = validateOrder(order, suppliers, locations).map(e => e.field.split(':').at(-1));
  for (const field of ['quantity', 'price', 'needBy', 'account']) assert.ok(fields.includes(field), field);
});

test('orders cannot be reduced below the quantity already received', () => {
  const order = sample();
  order.lines[0].received = 10;
  order.lines[0].quantity = 5;
  assert.ok(validateOrder(order, suppliers, locations).some(e => e.message.includes('already received')));
});

test('date validation handles leap years and impossible dates', () => {
  for (const value of ['2026-11-16', '2024-02-29']) assert.equal(validDate(value), true);
  for (const value of ['', '11/16/2026', '2026-02-29', '2026-04-31', '2026-13-01', '2026-11-00']) assert.equal(validDate(value), false, value);
});

test('receiving allows partial and exact remaining quantities and rejects over-receipts', () => {
  const line = { quantity: 12, received: 4 };
  assert.equal(validateReceipt(line, 3), '');
  assert.equal(validateReceipt(line, 8), '');
  for (const qty of [0, -1, NaN, Infinity, '', 'invalid', 9]) assert.ok(validateReceipt(line, qty));
  assert.ok(validateReceipt({ quantity: 12, received: 12 }, 1));
});

test('CSV escapes quotes, commas and line breaks', () => {
  assert.equal(csv([['Order', 'Description'], ['12', 'Part, "A"\nurgent']]), '"Order","Description"\r\n"12","Part, ""A""\nurgent"');
});
