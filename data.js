export const locations = [
  { id: 'SAN-ANTONIO', name: 'San Antonio Assembly Plant', org: 'SAT', address: 'San Antonio, TX 78264' },
  { id: 'SPRINGFIELD', name: 'Springfield Assembly Plant', org: 'SPR', address: 'Springfield, OH 45502' },
  { id: 'LISLE', name: 'Lisle Corporate Office', org: 'COR', address: 'Lisle, IL 60532' },
  { id: 'PDC-MIDWEST', name: 'Midwest Parts Distribution Center', org: 'PDC', address: 'Joliet, IL 60436' },
];

export const suppliers = [
  { id: 'SUP-56262', name: 'Midwest Powertrain Components', site: 'CHICAGO', contact: 'Patricia Allen', email: 'orders@midwest-components.example', terms: 'Net 30', address: 'Chicago, IL 60632', status: 'Active', category: 'Powertrain', tax: 'Validated' },
  { id: 'SUP-41870', name: 'Great Lakes Axle Systems', site: 'TOLEDO', contact: 'Sam Rivera', email: 'sales@greatlakes-axle.example', terms: 'Net 45', address: 'Toledo, OH 43612', status: 'Active', category: 'Axles & Driveline', tax: 'Validated' },
  { id: 'SUP-30712', name: 'Prairie Brake & Air', site: 'INDIANAPOLIS', contact: 'Taylor Brooks', email: 'orders@prairie-brake.example', terms: 'Net 30', address: 'Indianapolis, IN 46241', status: 'Active', category: 'Brakes & Suspension', tax: 'Validated' },
  { id: 'SUP-69041', name: 'Summit Electrical Manufacturing', site: 'MILWAUKEE', contact: 'Robin Lee', email: 'purchasing@summit-electrical.example', terms: 'Net 30', address: 'Milwaukee, WI 53215', status: 'Active', category: 'Electrical', tax: 'Validated' },
  { id: 'SUP-25190', name: 'Central Fleet Equipment', site: 'DALLAS', contact: 'Casey Parker', email: 'supply@central-fleet.example', terms: 'Net 60', address: 'Dallas, TX 75212', status: 'Active', category: 'Vocational Equipment', tax: 'Validated' },
];

export const catalog = [
  { id: 'IM-TCM-4200', description: 'Transmission control module — LT chassis', category: 'Powertrain.Controls', uom: 'Each', price: 780, supplierId: 'SUP-56262', leadDays: 14 },
  { id: 'IM-FLT-1100', description: 'Fuel filter service kit', category: 'Powertrain.Filtration', uom: 'Kit', price: 86.5, supplierId: 'SUP-56262', leadDays: 5 },
  { id: 'IM-AXL-6400', description: 'Rear axle assembly — 40,000 lb', category: 'Chassis.Axles', uom: 'Each', price: 4250, supplierId: 'SUP-41870', leadDays: 28 },
  { id: 'IM-DRV-2160', description: 'Driveshaft assembly — 6x4', category: 'Chassis.Driveline', uom: 'Each', price: 920, supplierId: 'SUP-41870', leadDays: 18 },
  { id: 'IM-BRK-3200', description: 'Air brake control module', category: 'Chassis.Brakes', uom: 'Each', price: 425, supplierId: 'SUP-30712', leadDays: 12 },
  { id: 'IM-SUS-7200', description: 'Air suspension leveling valve', category: 'Chassis.Suspension', uom: 'Each', price: 148, supplierId: 'SUP-30712', leadDays: 7 },
  { id: 'IM-HRN-5800', description: 'Cab-to-chassis wiring harness assembly', category: 'Electrical.Harnesses', uom: 'Each', price: 635, supplierId: 'SUP-69041', leadDays: 21 },
  { id: 'IM-LGT-2400', description: 'LED headlamp assembly — left and right', category: 'Electrical.Lighting', uom: 'Set', price: 380, supplierId: 'SUP-69041', leadDays: 10 },
  { id: 'IM-PTO-8100', description: 'PTO hydraulic pump assembly', category: 'Equipment.Hydraulics', uom: 'Each', price: 1160, supplierId: 'SUP-25190', leadDays: 21 },
];

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
    version: 1,
    nextOrder: 800012350,
    nextReceipt: 1049,
    settings: { ...defaultSettings },
    orders: [
      makeOrder('800012349', 'SUP-56262', 'Incomplete', 'LT Series control modules — dealer order DLR-24017', [line('seed-1', 'IM-TCM-4200', 20, '2026-11-16')], { dealerOrder: 'DLR-24017', customer: 'Pioneer Logistics' }),
      makeOrder('800012348', 'SUP-41870', 'Approved', 'Rear axle assemblies — production replenishment', [line('seed-2', 'IM-AXL-6400', 12, '2026-11-23', { promisedDate: '2026-11-20', received: 4 })], { created: '2026-10-23', dealerOrder: 'DLR-23984', customer: 'Northstar Transport', history: [{ date: '2026-10-23T14:00:00.000Z', action: 'Submitted for approval', user: 'Morgan, Alex' }, { date: '2026-10-23T17:00:00.000Z', action: 'Approved', user: 'Chen, Jordan' }] }),
      makeOrder('800012347', 'SUP-30712', 'In Process', 'Air brake control modules — HV build program', [line('seed-3', 'IM-BRK-3200', 32, '2026-11-12')], { created: '2026-10-23', dealerOrder: 'DLR-23971', customer: 'Metro Public Works' }),
      makeOrder('800012346', 'SUP-69041', 'Approved', 'Chassis wiring harnesses — Springfield', [line('seed-4', 'IM-HRN-5800', 18, '2026-11-18', { shipTo: 'SPRINGFIELD', promisedDate: '2026-11-15' })], { shipTo: 'SPRINGFIELD', created: '2026-10-22', dealerOrder: 'DLR-23940', customer: 'Valley Distribution' }),
      makeOrder('800012345', 'SUP-25190', 'Approved', 'PTO pump assemblies — vocational fleet', [line('seed-5', 'IM-PTO-8100', 8, '2026-11-10', { promisedDate: '2026-11-09' })], { created: '2026-10-21', dealerOrder: 'DLR-23895', customer: 'Cedar Construction' }),
      makeOrder('800012344', 'SUP-56262', 'Incomplete', 'Fuel filtration kits — service stock', [line('seed-6', 'IM-FLT-1100', 50, '2026-11-05', { shipTo: 'PDC-MIDWEST' })], { shipTo: 'PDC-MIDWEST', created: '2026-10-20' }),
    ],
    requisitions: [
      { id: '10482', item: 'IM-TCM-4200', description: 'Transmission control module — LT chassis', quantity: 20, price: 780, uom: 'Each', needBy: '2026-11-16', supplierId: 'SUP-56262', shipTo: 'SAN-ANTONIO', buyer: 'Morgan, Alex', requester: 'Production Planning', dealerOrder: 'DLR-24017', customer: 'Pioneer Logistics', urgent: true, status: 'Approved', note: 'Material shortage for a 20-truck LT Series fleet order. Source the approved module and confirm delivery timing.' },
      { id: '10481', item: 'IM-HRN-5800', description: 'Cab-to-chassis wiring harness assembly', quantity: 15, price: 635, uom: 'Each', needBy: '2026-11-20', supplierId: 'SUP-69041', shipTo: 'SPRINGFIELD', buyer: 'Morgan, Alex', requester: 'Production Planning', dealerOrder: 'DLR-24006', customer: 'Harbor Freight Lines', urgent: false, status: 'Approved', note: 'Harnesses for Springfield production.' },
      { id: '10479', item: 'IM-SUS-7200', description: 'Air suspension leveling valve', quantity: 40, price: 148, uom: 'Each', needBy: '2026-11-09', supplierId: 'SUP-30712', shipTo: 'SAN-ANTONIO', buyer: 'Morgan, Alex', requester: 'Materials Control', dealerOrder: '', customer: '', urgent: false, status: 'Approved', note: 'Replenish assembly stock.' },
      { id: '10476', item: 'IM-FLT-1100', description: 'Fuel filter service kit', quantity: 60, price: 86.5, uom: 'Kit', needBy: '2026-11-12', supplierId: 'SUP-56262', shipTo: 'PDC-MIDWEST', buyer: 'Morgan, Alex', requester: 'Parts Distribution', dealerOrder: '', customer: '', urgent: false, status: 'Approved', note: 'Service parts replenishment.' },
    ],
    receipts: [ { id: 'RCV-1048', orderId: '800012348', item: 'IM-AXL-6400', quantity: 4, date: '2026-10-26', packingSlip: 'GLA-20419', receiver: 'Morgan, Alex' } ],
    agreements: [
      { id: 'BPA-10042', supplierId: 'SUP-56262', description: 'Powertrain components — annual supply', start: '2026-01-01', end: '2026-12-31', limit: 1250000, terms: 'Net 30' },
      { id: 'BPA-10035', supplierId: 'SUP-30712', description: 'Brake and air suspension components', start: '2026-04-01', end: '2027-03-31', limit: 750000, terms: 'Net 30' },
      { id: 'BPA-10021', supplierId: 'SUP-69041', description: 'Electrical harness and lighting supply', start: '2026-01-01', end: '2026-12-31', limit: 950000, terms: 'Net 30' },
    ],
  };
}
