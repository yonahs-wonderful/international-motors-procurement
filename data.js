export const locations = [
  { id: 'SAN-ANTONIO', name: 'San Antonio Assembly Plant', org: 'SAT', address: 'San Antonio, TX 78264' },
  { id: 'SPRINGFIELD', name: 'Springfield Assembly Plant', org: 'SPR', address: 'Springfield, OH 45502' },
  { id: 'LISLE', name: 'Lisle Corporate Office', org: 'COR', address: 'Lisle, IL 60532' },
  { id: 'PDC-MIDWEST', name: 'Midwest Parts Distribution Center', org: 'PDC', address: 'Joliet, IL 60436' },
];

export const suppliers = [
  { id: 'SUP-56262', name: 'Midwest Powertrain Components', site: 'CHICAGO', contact: 'Patricia Allen', email: 'orders@midwest-components.example', terms: 'Net 30', address: 'Chicago, IL 60632', status: 'Active', category: 'Powertrain', tax: 'Validated' },
];

export const catalog = [
  { id: 'IM-TCM-4200', description: 'Transmission control module — LT chassis', category: 'Powertrain.Controls', uom: 'Each', price: 780, supplierId: 'SUP-56262', leadDays: 14 },
];
export const procurementItem = catalog[0];

export const seedDate = '2026-10-26';
export const defaultSettings = { buyer: 'Morgan, Alex', operatingUnit: 'International Motors — US Operations', role: 'buyer', shipTo: 'SAN-ANTONIO', approver: 'Chen, Jordan' };

const line = (id, itemId, quantity, needBy, extra = {}) => {
  const item = catalog.find(item => item.id === itemId);
  return { id, item: item.id, description: item.description, category: item.category, uom: item.uom, quantity, price: item.price, needBy, promisedDate: '', shipTo: 'SAN-ANTONIO', account: '01.320.5200.000.000', received: 0, catalogSupplierId: item.supplierId, ...extra };
};

export function seedState() {
  const makeOrder = (id, supplierId, status, description, lines, extra = {}) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return { id, revision: 0, status, operatingUnit: defaultSettings.operatingUnit, supplierId, supplierName: supplier.name, supplierSite: supplier.site, supplierContact: supplier.contact, buyer: defaultSettings.buyer, description, currency: 'USD', communicationMethod: 'Email', shipTo: 'SAN-ANTONIO', billTo: 'LISLE', paymentTerms: supplier.terms, acknowledgment: 'Document and Schedule', acknowledgeBy: '', shipVia: 'Ground Freight', freightTerms: 'Prepaid and Add', fob: 'Destination', confirmingOrder: 'No', dealerOrder: '', customer: '', noteSupplier: '', noteReceiver: '', attachments: [], approver: defaultSettings.approver, approvalNote: '', created: seedDate, updated: seedDate, history: [{ date: '2026-10-26T14:00:00.000Z', action: 'Order created', user: defaultSettings.buyer }], lines, ...extra };
  };
  return {
    version: 2,
    nextOrder: 800012350,
    nextReceipt: 1049,
    settings: { ...defaultSettings },
    orders: [
      makeOrder('800012349', 'SUP-56262', 'Incomplete', 'LT Series control modules — dealer order DLR-24017', [line('seed-1', 'IM-TCM-4200', 20, '2026-11-16')], { requestId: 'SAMPLE-DRAFT-001', dealerOrder: 'DLR-24017', customer: 'Pioneer Logistics' }),
      makeOrder('800012348', 'SUP-56262', 'Approved', 'LT Series control modules — production replenishment', [line('seed-2', 'IM-TCM-4200', 12, '2026-11-23', { promisedDate: '2026-11-20', received: 4 })], { requestId: 'SAMPLE-APPROVED-001', dealerOrder: 'DLR-23984', customer: 'Northstar Transport' }),
      makeOrder('800012347', 'SUP-56262', 'In Process', 'LT Series control modules — fleet build program', [line('seed-3', 'IM-TCM-4200', 8, '2026-11-12')], { requestId: 'SAMPLE-PENDING-001', dealerOrder: 'DLR-23971', customer: 'Metro Public Works' }),
    ],
    requisitions: [
      { id: '10482', item: 'IM-TCM-4200', description: 'Transmission control module — LT chassis', quantity: 20, price: 780, uom: 'Each', needBy: '2026-11-16', supplierId: 'SUP-56262', shipTo: 'SAN-ANTONIO', buyer: 'Morgan, Alex', requester: 'Production Planning', dealerOrder: 'DLR-24017', customer: 'Pioneer Logistics', urgent: true, status: 'Approved', note: 'Material shortage for a 20-truck LT Series fleet order. Source the approved module and confirm delivery timing.' },
    ],
    receipts: [ { id: 'RCV-1048', orderId: '800012348', item: 'IM-TCM-4200', quantity: 4, date: '2026-10-26', packingSlip: 'MPC-20419', receiver: 'Morgan, Alex' } ],
    agreements: [
      { id: 'BPA-10042', supplierId: 'SUP-56262', description: 'Powertrain components — annual supply', start: '2026-01-01', end: '2026-12-31', limit: 1250000, terms: 'Net 30' },
    ],
  };
}
