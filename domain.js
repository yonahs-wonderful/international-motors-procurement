export const clone = value => structuredClone(value);
export const total = order => Math.round(order.lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.price || 0), 0) * 100) / 100;
export const money = (amount, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function validateOrder(order, suppliers, locations) {
  const errors = [];
  const required = (key, label) => { if (!String(order[key] || '').trim()) errors.push({ field: key, message: `${label} is required.` }); };
  required('operatingUnit', 'Operating Unit');
  required('buyer', 'Buyer');
  required('description', 'Description');
  const supplier = suppliers.find(s => s.id === order.supplierId && s.name === order.supplierName);
  if (!supplier) errors.push({ field: 'supplierName', message: 'Select a valid Supplier using the lookup.' });
  else if (order.supplierSite !== supplier.site) errors.push({ field: 'supplierSite', message: 'Select the Supplier Site for this supplier.' });
  if (!locations.some(l => l.id === order.shipTo)) errors.push({ field: 'shipTo', message: 'Default Ship-To Location is required.' });
  if (!locations.some(l => l.id === order.billTo)) errors.push({ field: 'billTo', message: 'Bill-To Location is required.' });
  required('paymentTerms', 'Payment Terms');
  if (order.acknowledgeBy && !validDate(order.acknowledgeBy)) errors.push({ field: 'acknowledgeBy', message: 'Enter a valid Acknowledge By date.' });
  if (!order.lines.length) errors.push({ field: 'lines', message: 'Add at least one purchase order line.' });
  order.lines.forEach((line, i) => {
    const prefix = `Line ${i + 1}`;
    const add = (field, message) => errors.push({ field: `line:${line.id}:${field}`, message: `${prefix}: ${message}` });
    if (!line.item.trim()) add('item', 'Item is required.');
    if (!line.description.trim()) add('description', 'Description is required.');
    if (!Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0) add('quantity', 'Quantity must be greater than zero.');
    if (!Number.isFinite(Number(line.price)) || Number(line.price) <= 0) add('price', 'Price must be greater than zero.');
    if (!validDate(line.needBy)) add('needBy', 'Enter a valid Need-By date.');
    if (line.promisedDate && !validDate(line.promisedDate)) add('promisedDate', 'Enter a valid Promised date.');
    if (!locations.some(l => l.id === line.shipTo)) add('shipTo', 'Select a valid Ship-To Location.');
    if (!/^\d{2}\.\d{3}\.\d{4}\.\d{3}\.\d{3}$/.test(line.account || '')) add('account', 'PO Charge Account must use format 01.320.5200.000.000.');
    if (line.catalogSupplierId && line.catalogSupplierId !== order.supplierId) add('item', 'The catalog item belongs to a different supplier.');
    if (Number(line.quantity) < Number(line.received || 0)) add('quantity', 'Quantity cannot be lower than the quantity already received.');
  });
  return errors;
}

export function validateReceipt(line, quantity) {
  if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) return 'Quantity to receive must be greater than zero.';
  if (Number(quantity) > Number(line.quantity) - Number(line.received || 0)) return 'Quantity to receive exceeds the remaining order quantity.';
  return '';
}

export function csv(rows) {
  return rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
}
