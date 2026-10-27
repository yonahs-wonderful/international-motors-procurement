import { catalog, suppliers, locations, defaultSettings, seedState, procurementItem } from './data.js';
import { clone, total, money, uid, validateOrder, validateReceipt, validDate, csv, duplicateRequest } from './domain.js';

const STORAGE_KEY = 'international-purchasing-tcm-v2';
const DRAFT_KEY = `${STORAGE_KEY}-unsaved`;
const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
const h = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const date = value => value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`)).replaceAll(' ', '-') : '—';
const supplierOf = id => suppliers.find(s => s.id === id);
const locationOf = id => locations.find(location => location.id === id);
let flash = null;
let draft = null;
let errors = [];
let attachmentDraft = null;
let keepNavigationFlash = false;
let ui = { orderTab: 'Headers', editorTab: 'Header', view: 'All Orders', query: '', status: '', supplier: '', sort: 'id', direction: -1, selectedOrder: '', searchOpen: false, selectedReq: new Set(), builderReq: [], reqView: 'My Requisitions', reqQuery: '', receiptTab: 'Expected Receipts', supplierQuery: '' };

const params = new URLSearchParams(location.search);
if (params.get('reset') === '1') {
  try { localStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem(DRAFT_KEY); } catch { /* Display a storage warning on save. */ }
  params.delete('reset');
  history.replaceState(null, '', location.pathname + (params.size ? `?${params}` : '') + location.hash);
}
let state = loadState();
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.version === 2 && Array.isArray(saved.orders) && Array.isArray(saved.requisitions) && Array.isArray(saved.receipts) && saved.settings) return saved;
  } catch { flash = { type: 'warning', text: 'Saved browser data could not be read. Sample data has been loaded.' }; }
  return seedState();
}
function commit(next) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); state = next; return true; }
  catch { flash = { type: 'error', text: 'The document could not be saved in this browser. Storage may be unavailable or full. Remove large attachments and try again.' }; return false; }
}
function rememberDraft() { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* Explicit Save still reports storage failures. */ } }
function forgetDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* No saved draft to clear. */ } }
function navigate(route, keepFlash = false) { const target = `#${route}`; if (location.hash === target) render(); else { keepNavigationFlash = keepFlash; location.hash = target; } }
const route = () => location.hash.slice(1) || 'orders';
const isEditing = () => route() === 'order/new' || route().endsWith('/edit');
const blankLine = () => ({ id: uid(), item: '', description: '', category: 'Materials.General', uom: 'Each', quantity: 1, price: '', needBy: '', promisedDate: '', shipTo: draft?.shipTo || state.settings.shipTo, account: '01.320.5200.000.000', received: 0 });
function newOrder() {
  return { id: null, revision: 0, status: 'Incomplete', operatingUnit: state.settings.operatingUnit, supplierId: suppliers[0].id, supplierName: suppliers[0].name, supplierSite: suppliers[0].site, supplierContact: suppliers[0].contact, buyer: state.settings.buyer, description: '', currency: 'USD', communicationMethod: 'Email', shipTo: state.settings.shipTo, billTo: 'LISLE', paymentTerms: 'Net 30', acknowledgment: 'Document and Schedule', acknowledgeBy: '', shipVia: 'Ground Freight', freightTerms: 'Prepaid and Add', fob: 'Destination', confirmingOrder: 'No', requestId: '', dealerOrder: '', customer: '', noteSupplier: '', noteReceiver: '', attachments: [], approver: state.settings.approver, approvalNote: '', created: today(), updated: today(), history: [], lines: [{ ...blankLine(), item: procurementItem.id, description: procurementItem.description, category: procurementItem.category, uom: procurementItem.uom, quantity: '', price: procurementItem.price, shipTo: state.settings.shipTo, catalogSupplierId: procurementItem.supplierId }] };
}
function startOrder(supplierId) {
  draft = newOrder(); errors = []; ui.editorTab = 'Header';
  if (supplierId) applySupplier(supplierId);
  rememberDraft(); navigate('order/new');
}
function applySupplier(id) {
  const supplier = supplierOf(id);
  if (!supplier) return;
  Object.assign(draft, { supplierId: id, supplierName: supplier.name, supplierSite: supplier.site, supplierContact: supplier.contact, paymentTerms: supplier.terms });
  rememberDraft();
}
function button(label, action, attributes = '', className = '') { return `<button type="button" class="legacy-button ${className}" data-action="${action}" ${attributes}>${label}</button>`; }
function options(values, selected) { return values.map(value => { const [id, label] = Array.isArray(value) ? value : [value, value]; return `<option value="${h(id)}" ${String(id) === String(selected) ? 'selected' : ''}>${h(label)}</option>`; }).join(''); }
function field(key, label, { required = false, type = 'text', choices, lookup, rows, readonly = false } = {}) {
  readonly = readonly || !isEditing();
  const error = errors.find(error => error.field === key);
  const attrs = `id="field-${key}" name="${key}" data-field="${key}" ${required ? 'aria-required="true"' : ''} ${error ? `aria-invalid="true" aria-describedby="error-${key}"` : ''}`;
  let control;
  if (rows) control = `<textarea ${attrs} rows="${rows}" ${readonly ? 'readonly' : ''}>${h(draft[key])}</textarea>`;
  else if (choices) control = `<select ${attrs} ${readonly ? 'disabled' : ''}>${options(choices, draft[key])}</select>`;
  else control = `<input ${attrs} type="${type}" value="${h(draft[key])}" ${readonly ? 'readonly' : ''}>`;
  return `<div class="field-row"><label for="field-${key}">${required ? '<span class="required">*</span> ' : ''}${label}</label><div class="field-control">${control}${lookup && !readonly ? button('<span class="lookup-symbol" aria-hidden="true"></span>', lookup, `aria-label="Search ${label}"`, 'lookup-button') : ''}${error ? `<span class="field-error" id="error-${key}">${h(error.message)}</span>` : ''}</div></div>`;
}
function lineInput(line, fieldName, type = 'text', readOnly = false, extra = '') {
  const error = errors.find(error => error.field === `line:${line.id}:${fieldName}`);
  const label = `${({ item: 'Item', description: 'Description', quantity: 'Quantity', price: 'Price', needBy: 'Need-By Date', promisedDate: 'Promised Date', account: 'PO Charge Account' })[fieldName] || fieldName} for line ${draft.lines.indexOf(line) + 1}`;
  return `<input type="${type}" aria-label="${h(label)}" data-line="${h(line.id)}" data-line-field="${fieldName}" value="${h(line[fieldName])}" ${readOnly ? 'readonly' : ''} ${type === 'number' ? 'step="any" min="0"' : ''} ${error ? `aria-invalid="true" title="${h(error.message)}"` : ''} ${extra}>`;
}
function statusBadge(status) { return `<span class="status status-${status.toLowerCase().replaceAll(' ', '-')}">${h(status)}</span>`; }
function section(title, contents, className = '') { return `<section class="legacy-section ${className}"><h2>${title}</h2>${contents}</section>`; }
function table(headers, rows, empty = 'No results found.') { return `<div class="table-scroll"><table><thead><tr>${headers.map(header => `<th scope="col">${header}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td colspan="${headers.length}" class="empty">${empty}</td></tr>`}</tbody></table></div>`; }
function linkOrder(order) { return `<a href="#order/${h(order.id)}">${h(order.id)}</a>`; }

function render() {
  const currentRoute = route();
  const page = currentRoute.split('/')[0];
  const nav = [['requisitions', 'Requisitions'], ['orders', 'Orders'], ['agreements', 'Agreements'], ['suppliers', 'Suppliers'], ['receiving', 'Receiving']];
  if (state.settings.role === 'manager') nav.push(['approvals', 'Approvals']);
  let content;
  if (page === 'order') content = renderOrder();
  else if (page === 'requisitions') content = renderRequisitions();
  else if (page === 'suppliers') content = renderSuppliers();
  else if (page === 'agreements') content = renderAgreements();
  else if (page === 'receiving') content = renderReceiving();
  else if (page === 'approvals') content = renderApprovals();
  else content = renderOrders();
  app.innerHTML = `<header class="global-header"><div class="brand-line"><div class="brand">International Motors<span>Purchasing</span></div><div class="global-links"><a href="#orders">Home</a><button data-action="preferences">Preferences</button><button data-action="help">Help</button></div></div><div class="session-line"><span>Oracle E-Business Suite · Buyer’s Work Center</span><span>${h(state.settings.buyer)} &nbsp; | &nbsp; US Purchasing ${state.settings.role === 'manager' ? 'Manager' : 'Buyer'}</span></div><nav class="primary-tabs" aria-label="Purchasing">${nav.map(([key, name]) => `<a href="#${key}" class="${page === key || (page === 'order' && key === 'orders') ? 'active' : ''}" ${page === key || (page === 'order' && key === 'orders') ? 'aria-current="page"' : ''}>${name}</a>`).join('')}</nav></header><main id="main" tabindex="-1"><div class="breadcrumb"><a href="#orders">Purchasing</a><span>›</span>${page === 'order' ? `<a href="#orders">Orders</a><span>›</span><span>${draft?.id ? h(draft.id) : 'Create Standard Purchase Order'}</span>` : `<span>${h(nav.find(n => n[0] === page)?.[1] || 'Orders')}</span>`}</div>${flash ? `<div class="message ${flash.type}" role="${flash.type === 'error' ? 'alert' : 'status'}"><span class="message-icon" aria-hidden="true">${flash.type === 'error' ? '!' : flash.type === 'warning' ? '!' : '✓'}</span><div>${h(flash.text)}</div><button data-action="dismiss-flash" aria-label="Dismiss message">×</button></div>` : ''}${content}</main><footer class="global-footer"><nav aria-label="Footer">${nav.map(([key, name]) => `<a href="#${key}">${name}</a>`).join('')}<button data-action="help">Help</button></nav><div><button data-action="about">About this page</button><span>Demonstration environment · Sample data · Saved in this browser</span><button data-action="preferences">Preferences</button></div></footer>`;
  bindContent();
}

function filteredOrders() {
  const query = ui.query.toLowerCase();
  return state.orders.filter(order => {
    if (ui.view === 'My Open Orders' && order.status !== 'Approved') return false;
    if (ui.view === 'My Incomplete Orders' && order.status !== 'Incomplete') return false;
    if (ui.view === 'My In Process Orders' && order.status !== 'In Process') return false;
    if (ui.view === 'My Orders with Pending Change Requests' && order.status !== 'Requires Reapproval') return false;
    if (ui.status && order.status !== ui.status) return false;
    if (ui.supplier && order.supplierId !== ui.supplier) return false;
    return !query || `${order.id} ${order.description} ${order.supplierName} ${order.dealerOrder} ${order.customer} ${order.requestId}`.toLowerCase().includes(query);
  }).sort((a, b) => {
    const av = ui.sort === 'total' ? total(a) : a[ui.sort] || '';
    const bv = ui.sort === 'total' ? total(b) : b[ui.sort] || '';
    return (typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true })) * ui.direction;
  });
}
function sortHeading(label, key) { return `<button class="column-sort" data-action="sort-orders" data-key="${key}">${label}${ui.sort === key ? (ui.direction === -1 ? ' ▾' : ' ▴') : ''}</button>`; }
function createToolbar(suffix = 'top') { return `<div class="create-toolbar"><label for="create-style-${suffix}">Create</label><select id="create-style-${suffix}"><option>Standard Purchase Order</option></select>${button('Go', 'new-order', 'aria-label="Create Standard Purchase Order"')}</div>`; }
function renderOrders() {
  const orders = filteredOrders();
  const columns = ['Headers', 'Lines', 'Schedules', 'Distributions'];
  const tabs = `<div class="secondary-tabs" role="tablist" aria-label="Order views">${columns.map(column => `<button role="tab" aria-selected="${column === ui.orderTab}" class="${column === ui.orderTab ? 'active' : ''}" data-action="order-tab" data-tab="${column}">${column}</button>`).join('')}</div>`;
  let grid;
  if (ui.orderTab === 'Headers') {
    grid = table(['Select', sortHeading('Order', 'id'), 'Rev', sortHeading('Description', 'description'), sortHeading('Supplier', 'supplierName'), 'Site', 'Buyer', sortHeading('Order Date', 'created'), sortHeading('Total', 'total'), 'Curr', 'Status', 'Dealer Order', 'Request ID'], orders.map(order => `<tr><td class="center"><input type="radio" name="selected-order" value="${order.id}" aria-label="Select order ${order.id}" ${ui.selectedOrder === order.id ? 'checked' : ''}></td><td>${linkOrder(order)}</td><td>${order.revision}</td><td class="description-cell">${h(order.description || '—')}</td><td>${h(order.supplierName || '—')}</td><td>${h(order.supplierSite || '—')}</td><td>${h(order.buyer)}</td><td class="nowrap">${date(order.created)}</td><td class="numeric">${money(total(order), order.currency)}</td><td>${h(order.currency)}</td><td>${statusBadge(order.status)}</td><td>${h(order.dealerOrder || '—')}</td><td>${h(order.requestId || '—')}</td></tr>`));
  } else {
    const rows = orders.flatMap(order => order.lines.map((line, i) => ({ order, line, i })));
    if (ui.orderTab === 'Lines') grid = table(['Order', 'Line', 'Item', 'Description', 'Category', 'Qty', 'Unit', 'Price', 'Amount', 'Need-By'], rows.map(({ order, line, i }) => `<tr><td>${linkOrder(order)}</td><td>${i + 1}</td><td>${h(line.item)}</td><td>${h(line.description)}</td><td>${h(line.category)}</td><td class="numeric">${line.quantity}</td><td>${h(line.uom)}</td><td class="numeric">${money(line.price, order.currency)}</td><td class="numeric">${money(line.quantity * line.price, order.currency)}</td><td>${date(line.needBy)}</td></tr>`));
    else if (ui.orderTab === 'Schedules') grid = table(['Order', 'Line', 'Schedule', 'Item', 'Ship-To Location', 'Org', 'Qty', 'Received', 'Need-By', 'Promised Date'], rows.map(({ order, line, i }) => `<tr><td>${linkOrder(order)}</td><td>${i + 1}</td><td>1</td><td>${h(line.item)}</td><td>${h(locationOf(line.shipTo)?.name)}</td><td>${h(locationOf(line.shipTo)?.org)}</td><td class="numeric">${line.quantity}</td><td class="numeric">${line.received || 0}</td><td>${date(line.needBy)}</td><td>${date(line.promisedDate)}</td></tr>`));
    else grid = table(['Order', 'Line', 'Distribution', 'Type', 'Deliver-To', 'Qty', 'PO Charge Account'], rows.map(({ order, line, i }) => `<tr><td>${linkOrder(order)}</td><td>${i + 1}</td><td>1</td><td>Inventory</td><td>${h(locationOf(line.shipTo)?.name)}</td><td>${line.quantity}</td><td class="account">${h(line.account)}</td></tr>`));
  }
  return `<div class="page-title-row"><h1>Orders</h1>${createToolbar()}</div><p class="page-note"><span class="blue-dot"></span> IM-TCM-4200 · Transmission control module — LT chassis · Midwest Powertrain Components · USD 780.00 / Each</p>${tabs}${section('Views', `<div class="view-toolbar"><label for="order-view">View</label><select id="order-view">${options(['All Orders', 'My Open Orders', 'My Incomplete Orders', 'My In Process Orders', 'My Orders with Pending Change Requests'], ui.view)}</select>${button('Go', 'apply-view', 'aria-label="Apply order view"')}<span class="toolbar-spacer"></span>${button(ui.searchOpen ? 'Hide Search' : 'Search', 'toggle-search')}</div>${ui.searchOpen ? `<form id="order-search" class="search-panel"><div><label for="order-query">Order / Description / Request ID</label><input id="order-query" name="query" value="${h(ui.query)}"></div><div><label for="order-supplier">Supplier</label><select id="order-supplier" name="supplier">${options([['', 'All Suppliers'], ...suppliers.map(s => [s.id, s.name])], ui.supplier)}</select></div><div><label for="order-status">Status</label><select id="order-status" name="status">${options([['', 'All Statuses'], 'Incomplete', 'In Process', 'Approved', 'Requires Reapproval', 'Cancelled'], ui.status)}</select></div><div class="search-actions"><button class="legacy-button" type="submit">Go</button>${button('Clear', 'clear-order-search')}</div></form>` : ''}<div class="table-toolbar"><label for="order-action">Select Order:</label><select id="order-action">${options(['Update', 'View', 'Duplicate', 'Cancel'], 'Update')}</select>${button('Go', 'apply-order-action', 'aria-label="Apply selected order action"')}${button('Export', 'export-orders')}<span class="toolbar-spacer"></span><span>${orders.length ? `1–${orders.length} of ${orders.length}` : '0 results'}</span></div>${grid}<div class="table-bottom"><span>${orders.length} purchase order${orders.length === 1 ? '' : 's'}</span><span>All amounts exclude tax and freight.</span></div>`)}${createToolbar('bottom')}`;
}

function renderOrder() {
  const parts = route().split('/');
  const id = parts[1];
  if (id === 'new') {
    if (!draft || draft.id) { try { draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY)); } catch { draft = null; } if (!draft || draft.id) draft = newOrder(); }
  } else {
    const saved = state.orders.find(order => order.id === id);
    if (!saved) return `<h1>Purchase order not found</h1><p>This purchase order is not available in this browser.</p><a href="#orders">Return to Orders</a>`;
    if (!isEditing()) draft = clone(saved);
    else if (!draft || draft.id !== id) {
      let restored;
      try { restored = JSON.parse(sessionStorage.getItem(DRAFT_KEY)); } catch { /* Use the saved order. */ }
      draft = restored?.id === id ? restored : clone(saved);
    }
    if (isEditing() && ['In Process', 'Cancelled'].includes(saved.status)) return `<h1>Purchase order ${h(id)}</h1><p>An ${h(saved.status)} order cannot be updated.</p><a href="#order/${h(id)}">View purchase order</a>`;
  }
  const editing = isEditing();
  const tabs = ['Header', 'Lines', 'Schedules', 'Distributions'];
  let body;
  if (ui.editorTab === 'Header') body = renderHeader(!editing);
  else if (ui.editorTab === 'Lines') body = renderLines(!editing);
  else if (ui.editorTab === 'Schedules') body = renderSchedules(!editing);
  else body = renderDistributions(!editing);
  return `<div class="page-title-row"><h1>${id === 'new' ? 'Create' : editing ? 'Update' : 'View'} Standard Purchase Order — IM-TCM-4200${draft.id ? `: ${h(draft.id)}` : ''}</h1><span class="order-status">${statusBadge(draft.status)} &nbsp; Revision ${draft.revision}</span></div><p class="page-note">${editing ? '<span class="required">*</span> Indicates required field' : `${h(draft.supplierName || 'Supplier not selected')} · ${h(draft.dealerOrder || 'Standard Purchase Order')}`}</p>${errors.length ? `<div class="message error validation-summary" role="alert" tabindex="-1"><span class="message-icon" aria-hidden="true">!</span><div><strong>The purchase order cannot be submitted.</strong><ul>${errors.map(error => `<li><button data-action="focus-error" data-field-target="${h(error.field)}">${h(error.message)}</button></li>`).join('')}</ul></div></div>` : ''}${!editing && draft.status === 'In Process' ? `<div class="approval-info">Approval pending with <strong>${h(draft.approver)}</strong>. Submitted documents are locked until reviewed.${draft.approvalNote ? `<br>Submission note: ${h(draft.approvalNote)}` : ''}</div>` : ''}${orderActions(editing)}<div class="secondary-tabs" role="tablist" aria-label="Purchase order details">${tabs.map(tab => `<button role="tab" aria-selected="${tab === ui.editorTab}" class="${tab === ui.editorTab ? 'active' : ''}" aria-controls="order-editor-panel" data-action="editor-tab" data-tab="${tab}">${tab}</button>`).join('')}</div><div class="editor-panel" id="order-editor-panel" role="tabpanel" aria-label="${h(ui.editorTab)}">${body}</div>${orderActions(editing)}${draft.id ? section('Action History', table(['Date / Time', 'Action', 'Performed By', 'Note'], [...draft.history].reverse().map(entry => `<tr><td>${h(new Date(entry.date).toLocaleString('en-US'))}</td><td>${h(entry.action)}</td><td>${h(entry.user)}</td><td>${h(entry.note || '—')}</td></tr>`))) : ''}`;
}
function orderActions(editing) {
  return `<div class="document-actions">${button(editing ? 'Cancel' : 'Return to Orders', editing ? 'cancel-edit' : 'return-orders')}<span class="toolbar-spacer"></span><span class="document-total">Total &nbsp; <strong data-total>${money(total(draft), draft.currency)}</strong></span>${editing ? `${button('Save', 'save-order')}${button('Approval Options', 'approval-options')}${button('Submit', 'submit-order', '', 'primary-button')}` : `${!['In Process', 'Cancelled'].includes(draft.status) ? button('Update', 'edit-order') : ''}${draft.status === 'In Process' && state.settings.role === 'manager' ? `${button('Reject', 'reject-order')}${button('Approve', 'approve-order', '', 'primary-button')}` : ''}${button('Print', 'print-order')}`}</div>`;
}
function renderHeader(readonly) {
  const locationOptions = locations.map(location => [location.id, location.name]);
  return `<fieldset class="unframed"><legend class="sr-only">Purchase Order Header</legend><div class="form-grid"><div>${field('operatingUnit', 'Operating Unit', { required: true, choices: [defaultSettings.operatingUnit] })}${field('supplierName', 'Supplier', { required: true, readonly: true })}${field('supplierSite', 'Supplier Site', { required: true, choices: [['', ''], ...(supplierOf(draft.supplierId) ? [[supplierOf(draft.supplierId).site, supplierOf(draft.supplierId).site]] : [])] })}${field('supplierContact', 'Supplier Contact')}${field('communicationMethod', 'Communication Method', { choices: ['Email', 'None'] })}</div><div>${field('currency', 'Currency', { choices: ['USD'] })}${field('buyer', 'Buyer', { required: true })}${field('description', 'Description', { required: true, rows: 3 })}${field('confirmingOrder', 'Confirming Order', { choices: ['No', 'Yes'] })}</div></div>${section('Terms', `<div class="form-grid"><div>${field('billTo', 'Bill-To Location', { choices: locationOptions })}${field('paymentTerms', 'Payment Terms', { choices: ['Net 30', 'Net 45', 'Net 60', 'Due on Receipt'] })}${field('acknowledgment', 'Required Acknowledgment', { choices: ['Document and Schedule', 'Document', 'None'] })}${field('acknowledgeBy', 'Acknowledge By', { type: 'date' })}</div><div>${field('shipTo', 'Default Ship-To Location', { required: true, choices: locationOptions })}${field('shipVia', 'Ship Via', { choices: ['Ground Freight', 'Expedited Ground', 'Air Freight', 'Supplier Delivery', 'Will Call'] })}${field('freightTerms', 'Freight Terms', { choices: ['Prepaid and Add', 'Collect', 'Prepaid'] })}${field('fob', 'FOB', { choices: ['Destination', 'Origin'] })}</div></div>`)}${section('Additional Information', `<div class="form-grid"><div>${field('requestId', 'External Request ID', { required: true })}${field('dealerOrder', 'Dealer Order Number', { required: true })}</div><div>${field('customer', 'End Customer', { required: true })}</div></div>`)}<div class="split-panels">${section('Attachments', `${!readonly ? `<div class="compact-toolbar">${button('Add Attachment', 'add-attachment')}</div>` : ''}${table(['Title', 'Type', 'Category', ...(!readonly ? ['Delete'] : [])], draft.attachments.map(attachment => `<tr><td><button class="text-link" data-action="view-attachment" data-id="${h(attachment.id)}">${h(attachment.name)}</button></td><td>${h(attachment.type)}</td><td>${h(attachment.category)}</td>${!readonly ? `<td>${button('Delete', 'delete-attachment', `data-id="${h(attachment.id)}"`)}</td>` : ''}</tr>`))}`)}${section('Notes', `${field('noteSupplier', 'Note to Supplier', { rows: 3 })}${field('noteReceiver', 'Note to Receiver', { rows: 3 })}`)}</div></fieldset>`;
}
function renderLines(readonly) {
  return `<p class="table-note">Order item: <strong>IM-TCM-4200</strong> — Transmission control module for the LT chassis. Contract unit price: USD 780.00 / Each.</p>${table(['Line', 'Type', 'Item', 'Description', 'Qty', 'Unit', 'Price', 'Amount', 'Need-By'], draft.lines.map((line, i) => `<tr><td>${i + 1}</td><td>Goods</td><td>${h(line.item)}</td><td class="description-cell">${h(line.description)}</td><td class="quantity-input">${lineInput(line, 'quantity', 'number', readonly, 'step="1"')}</td><td>Each</td><td class="numeric">${money(line.price, draft.currency)}</td><td class="numeric" data-line-total="${h(line.id)}">${money(line.quantity * line.price, draft.currency)}</td><td>${lineInput(line, 'needBy', 'date', readonly)}</td></tr>`))}`;
}
function renderSchedules(readonly) {
  return `${table(['Line', 'Item', 'Schedule', 'Ship-To Location', 'Org', 'Quantity', 'Received', 'Need-By', 'Promised Date'], draft.lines.map((line, i) => `<tr><td>${i + 1}</td><td>${h(line.item)}</td><td>1</td><td><select data-line="${h(line.id)}" data-line-field="shipTo" aria-label="Ship-To Location for line ${i + 1}" ${readonly ? 'disabled' : ''}>${options(locations.map(location => [location.id, location.name]), line.shipTo)}</select></td><td data-org="${h(line.id)}">${h(locationOf(line.shipTo)?.org)}</td><td class="numeric">${h(line.quantity)}</td><td class="numeric">${line.received || 0}</td><td>${lineInput(line, 'needBy', 'date', readonly)}</td><td>${lineInput(line, 'promisedDate', 'date', readonly)}</td></tr>`))}<p class="table-note">Schedule quantities follow the corresponding order lines.</p>`;
}
function renderDistributions(readonly) {
  return `${table(['Line', 'Item', 'Distribution', 'Destination Type', 'Deliver-To', 'Quantity', 'PO Charge Account'], draft.lines.map((line, i) => `<tr><td>${i + 1}</td><td>${h(line.item)}</td><td>1</td><td>Inventory</td><td>${h(locationOf(line.shipTo)?.name)}</td><td class="numeric">${h(line.quantity)}</td><td>${lineInput(line, 'account', 'text', readonly, 'class="charge-account-input"')}</td></tr>`))}<p class="table-note">Account structure: company.cost center.account.product.project — e.g. 01.320.5200.000.000.</p>`;
}

function renderRequisitions() {
  const reqs = state.requisitions.filter(req => req.status === 'Approved' && (ui.reqView !== 'My Urgent Requests' || req.urgent) && (!ui.reqQuery || `${req.id} ${req.description} ${req.dealerOrder}`.toLowerCase().includes(ui.reqQuery.toLowerCase())));
  const builder = ui.builderReq.map(id => state.requisitions.find(req => req.id === id)).filter(Boolean);
  return `<h1>Demand Workbench</h1><p class="page-note">Approved requisition lines available for purchase order creation.</p><div class="workbench-layout"><div>${section('Views', `<form id="req-search" class="view-toolbar"><label for="req-view">View</label><select id="req-view" name="view">${options(['My Requisitions', 'My Urgent Requests'], ui.reqView)}</select><label for="req-query">Search</label><input id="req-query" name="query" value="${h(ui.reqQuery)}" placeholder="Requisition, item, dealer order"><button class="legacy-button" type="submit">Go</button></form><div class="table-toolbar"><strong>Select Requests:</strong>${button('Add to Document Builder', 'add-to-builder')}<span class="toolbar-spacer"></span><span>${reqs.length} results</span></div>${table(['Select', 'Requisition', 'Item / Job', 'Description', 'Qty', 'Unit', 'Price', 'Need-By', 'Source', 'Dealer Order'], reqs.map(req => `<tr class="${req.urgent ? 'urgent-row' : ''}"><td class="center"><input type="checkbox" data-req="${req.id}" aria-label="Select requisition ${req.id}" ${ui.selectedReq.has(req.id) ? 'checked' : ''}></td><td><button class="text-link" data-action="view-req" data-id="${req.id}">${req.id}, 1</button>${req.urgent ? '<span class="urgent-label">Urgent</span>' : ''}</td><td>${h(req.item)}</td><td class="description-cell">${h(req.description)}</td><td class="numeric">${req.quantity}</td><td>${h(req.uom)}</td><td class="numeric">${money(req.price)}</td><td>${date(req.needBy)}</td><td>${h(supplierOf(req.supplierId)?.name)}</td><td>${h(req.dealerOrder || '—')}</td></tr>`))}`)}</div><aside class="document-builder">${section('Document Builder', `<div class="builder-body"><label for="builder-type">Type</label><select id="builder-type"><option>New Standard Purchase Order</option></select><dl><dt>Operating Unit</dt><dd>International Motors — US</dd><dt>Supplier</dt><dd>${h(supplierOf(builder[0]?.supplierId)?.name || 'Not selected')}</dd><dt>Selected Lines</dt><dd>${builder.length}</dd><dt>Document Amount</dt><dd><strong>${money(builder.reduce((sum, req) => sum + req.quantity * req.price, 0))}</strong></dd></dl>${builder.length ? `<ul class="builder-items">${builder.map(req => `<li>${h(req.item)} <span>Qty ${req.quantity}</span></li>`).join('')}</ul>` : '<p class="muted">Select requisition lines and add them to the document builder.</p>'}<div class="builder-actions">${button('Clear', 'clear-builder')}${button('Create', 'create-from-req', builder.length ? '' : 'disabled', 'primary-button')}</div></div>`)}</aside></div>`;
}
function renderSuppliers() {
  const matches = suppliers.filter(supplier => `${supplier.name} ${supplier.id} ${supplier.category}`.toLowerCase().includes(ui.supplierQuery.toLowerCase()));
  return `<h1>Suppliers</h1><p class="page-note">Supplier directory and purchasing sites.</p>${section('Search Suppliers', `<form id="supplier-search" class="view-toolbar"><label for="supplier-query">Supplier Name / Number / Category</label><input id="supplier-query" name="query" value="${h(ui.supplierQuery)}"><button class="legacy-button" type="submit">Go</button>${button('Clear', 'clear-supplier-search')}</form>${table(['Supplier Number', 'Supplier Name', 'Site', 'Category', 'Contact', 'Payment Terms', 'Status', 'Actions'], matches.map(supplier => `<tr><td>${h(supplier.id)}</td><td><button class="text-link" data-action="view-supplier" data-id="${supplier.id}">${h(supplier.name)}</button></td><td>${h(supplier.site)}</td><td>${h(supplier.category)}</td><td>${h(supplier.contact)}</td><td>${h(supplier.terms)}</td><td>${statusBadge(supplier.status)}</td><td>${button('Create Order', 'order-for-supplier', `data-id="${supplier.id}"`)}</td></tr>`))}`)}`;
}
function renderAgreements() {
  return `<h1>Purchase Agreements</h1><p class="page-note">Active blanket purchase agreements available for sourcing.</p>${section('Blanket Purchase Agreements', table(['Agreement', 'Supplier', 'Description', 'Start Date', 'End Date', 'Amount Limit', 'Payment Terms', 'Status'], state.agreements.map(agreement => `<tr><td><button class="text-link" data-action="view-agreement" data-id="${agreement.id}">${agreement.id}</button></td><td>${h(supplierOf(agreement.supplierId)?.name)}</td><td>${h(agreement.description)}</td><td>${date(agreement.start)}</td><td>${date(agreement.end)}</td><td class="numeric">${money(agreement.limit)}</td><td>${h(agreement.terms)}</td><td>${statusBadge('Active')}</td></tr>`)))}`;
}
function renderReceiving() {
  const rows = state.orders.filter(order => order.status === 'Approved').flatMap(order => order.lines.filter(line => line.quantity > (line.received || 0)).map(line => ({ order, line })));
  return `<h1>Receiving</h1><p class="page-note">Record goods received against approved purchase orders.</p><div class="secondary-tabs">${['Expected Receipts', 'Receipt History'].map(tab => `<button class="${ui.receiptTab === tab ? 'active' : ''}" data-action="receipt-tab" data-tab="${tab}">${tab}</button>`).join('')}</div>${section(ui.receiptTab, ui.receiptTab === 'Expected Receipts' ? table(['Order', 'Supplier', 'Item', 'Description', 'Ship-To', 'Ordered', 'Received', 'Remaining', 'Need-By', 'Action'], rows.map(({ order, line }) => `<tr><td>${linkOrder(order)}</td><td>${h(order.supplierName)}</td><td>${h(line.item)}</td><td>${h(line.description)}</td><td>${h(locationOf(line.shipTo)?.name)}</td><td class="numeric">${line.quantity}</td><td class="numeric">${line.received || 0}</td><td class="numeric">${line.quantity - (line.received || 0)}</td><td>${date(line.needBy)}</td><td>${button('Receive', 'receive', `data-order="${order.id}" data-line-id="${line.id}" aria-label="Receive ${h(line.item)} on order ${order.id}"`)}</td></tr>`)) : table(['Receipt', 'Order', 'Item', 'Quantity', 'Receipt Date', 'Packing Slip', 'Receiver'], [...state.receipts].reverse().map(receipt => `<tr><td>${h(receipt.id)}</td><td><a href="#order/${receipt.orderId}">${receipt.orderId}</a></td><td>${h(receipt.item)}</td><td class="numeric">${receipt.quantity}</td><td>${date(receipt.date)}</td><td>${h(receipt.packingSlip)}</td><td>${h(receipt.receiver)}</td></tr>`)))}`;
}
function renderApprovals() {
  if (state.settings.role !== 'manager') return `<h1>Approvals</h1><p>Switch to US Purchasing Manager in Preferences to review approval requests.</p>`;
  const orders = state.orders.filter(order => order.status === 'In Process');
  return `<h1>Purchase Order Approvals</h1><p class="page-note">Pending approval with ${h(state.settings.approver)}.</p>${section('Notifications', table(['Order', 'Description', 'Supplier', 'Buyer', 'Amount', 'Status', 'Actions'], orders.map(order => `<tr><td>${linkOrder(order)}</td><td>${h(order.description)}</td><td>${h(order.supplierName)}</td><td>${h(order.buyer)}</td><td class="numeric">${money(total(order), order.currency)}</td><td>${statusBadge(order.status)}</td><td>${button('Review', 'review-approval', `data-id="${order.id}"`)}</td></tr>`)))}`;
}

function openDialog(title, body, { wide = false } = {}) {
  if (modal.open) modal.close();
  modal.className = wide ? 'wide-dialog' : '';
  modal.innerHTML = `<div class="dialog-title"><h2 id="dialog-title">${title}</h2><button type="button" data-action="close-dialog" aria-label="Close dialog">×</button></div><div class="dialog-body">${body}</div>`;
  modal.showModal();
  modal.querySelector('[autofocus]')?.focus();
}
function lookupSupplier() {
  openDialog('Search and Select: Supplier', `<form id="lookup-supplier-search" class="view-toolbar"><label for="supplier-lookup-query">Supplier Name / Number</label><input id="supplier-lookup-query" name="query" autofocus><button class="legacy-button" type="submit">Go</button></form><div id="supplier-lookup-results">${supplierLookupRows(suppliers)}</div><div class="dialog-actions">${button('Cancel', 'close-dialog')}</div>`, { wide: true });
}
function supplierLookupRows(matches) {
  return table(['Supplier Number', 'Supplier Name', 'Site', 'Payment Terms', 'Select'], matches.map(supplier => `<tr><td>${h(supplier.id)}</td><td>${h(supplier.name)}</td><td>${h(supplier.site)}</td><td>${h(supplier.terms)}</td><td>${button('Select', 'select-supplier', `data-id="${supplier.id}" aria-label="Select ${h(supplier.name)}"`)}</td></tr>`));
}
let lookupLineId = null;
function lookupCatalog(lineId = null) {
  lookupLineId = lineId;
  openDialog(lineId ? 'Search and Select: Item' : 'Add Lines from Catalog', `<form id="catalog-search" class="view-toolbar"><label for="catalog-query">Item / Description</label><input id="catalog-query" name="query" autofocus><label for="catalog-supplier">Supplier</label><select id="catalog-supplier" name="supplier">${options([['', 'All Suppliers'], ...suppliers.map(s => [s.id, s.name])], draft.supplierId)}</select><button class="legacy-button" type="submit">Go</button></form><div id="catalog-results">${catalogRows(catalog.filter(item => !draft.supplierId || item.supplierId === draft.supplierId))}</div><div class="dialog-actions">${button('Cancel', 'close-dialog')}${!lineId ? button('Add to Order', 'add-catalog-items', '', 'primary-button') : ''}</div>`, { wide: true });
}
function catalogRows(items) {
  return table(['Select', 'Item', 'Description', 'Supplier', 'Unit', 'Price (USD)', 'Lead Time'], items.map(item => `<tr><td class="center">${lookupLineId ? button('Select', 'select-item', `data-id="${item.id}"`) : `<input type="checkbox" name="catalog-item" value="${item.id}" aria-label="Select ${item.id}">`}</td><td>${h(item.id)}</td><td>${h(item.description)}</td><td>${h(supplierOf(item.supplierId)?.name)}</td><td>${h(item.uom)}</td><td class="numeric">${money(item.price)}</td><td>${item.leadDays} days</td></tr>`));
}
function insertCatalogItem(item, lineId) {
  if (!draft.supplierId) applySupplier(item.supplierId);
  const target = lineId ? draft.lines.find(line => line.id === lineId) : blankLine();
  Object.assign(target, { item: item.id, description: item.description, category: item.category, uom: item.uom, price: item.price, catalogSupplierId: item.supplierId });
  if (!lineId) draft.lines.push(target);
}
function showApprovalOptions() {
  openDialog('Approval Options', `<form id="approval-options-form"><div class="dialog-form"><label for="approver">Forward To</label><select id="approver" name="approver">${options(['Chen, Jordan', 'Patel, Avery'], draft.approver)}</select><label for="approval-note">Note to Approver</label><textarea id="approval-note" name="note" rows="4">${h(draft.approvalNote)}</textarea><p class="muted">Submit sends the document to the selected approver. The order remains In Process until approved.</p></div><div class="dialog-actions">${button('Cancel', 'close-dialog')}<button type="submit" class="legacy-button primary-button">Apply</button></div></form>`);
}
function showPreferences() {
  openDialog('Preferences', `<form id="preferences-form"><div class="dialog-form"><label for="pref-buyer">Buyer</label><input id="pref-buyer" name="buyer" value="${h(state.settings.buyer)}" required><label for="pref-role">Responsibility</label><select id="pref-role" name="role">${options([['buyer', 'US Purchasing Buyer'], ['manager', 'US Purchasing Manager']], state.settings.role)}</select><label for="pref-ship">Default Ship-To</label><select id="pref-ship" name="shipTo">${options(locations.map(l => [l.id, l.name]), state.settings.shipTo)}</select><label for="pref-approver">Default Approver</label><select id="pref-approver" name="approver">${options(['Chen, Jordan', 'Patel, Avery'], state.settings.approver)}</select></div><div class="preference-reset"><strong>Demonstration data</strong><p>Restore the original sample orders, requisitions, and receipts in this browser.</p>${button('Reset Sample Data', 'confirm-reset')}</div><div class="dialog-actions">${button('Cancel', 'close-dialog')}<button type="submit" class="legacy-button primary-button">Apply</button></div></form>`);
}
function saveOrder(submit = false) {
  if (!isEditing() || !draft) return;
  errors = submit ? validateOrder(draft, suppliers, locations) : [];
  draft.requestId = String(draft.requestId || '').trim();
  const duplicate = duplicateRequest(state.orders, draft);
  if (draft.requestId && duplicate) errors.push({ field: 'requestId', message: `External Request ID is already used by order ${duplicate.id}. Open that order instead of creating a duplicate.` });
  for (const line of draft.lines) {
    const req = state.requisitions.find(req => req.id === line.requisitionId);
    if (req?.orderId && req.orderId !== draft.id) errors.push({ field: 'lines', message: `Requisition ${req.id} has already been assigned to order ${req.orderId}.` });
  }
  if (errors.length) { render(); document.querySelector('.validation-summary')?.focus(); return; }
  const next = clone(state);
  const saved = clone(draft);
  const original = next.orders.find(order => order.id === saved.id);
  if (!saved.id) saved.id = String(next.nextOrder++);
  if (original?.status === 'Approved') saved.revision++;
  saved.status = submit ? 'In Process' : original?.status === 'Approved' || original?.status === 'Requires Reapproval' ? 'Requires Reapproval' : 'Incomplete';
  saved.updated = today();
  saved.history.push({ date: now(), action: submit ? 'Submitted for approval' : 'Draft saved', user: state.settings.buyer, note: submit ? saved.approvalNote : '' });
  const index = next.orders.findIndex(order => order.id === saved.id);
  if (index === -1) next.orders.unshift(saved); else next.orders[index] = saved;
  const linkedRequisitions = new Set(saved.lines.map(line => line.requisitionId).filter(Boolean));
  next.requisitions.forEach(req => { if (req.orderId === saved.id && !linkedRequisitions.has(req.id)) { req.status = 'Approved'; delete req.orderId; } });
  saved.lines.forEach(line => { const req = next.requisitions.find(req => req.id === line.requisitionId); if (req) { req.status = 'On Order'; req.orderId = saved.id; } });
  if (!commit(next)) { render(); return; }
  draft = clone(saved); forgetDraft();
  flash = { type: 'success', text: submit ? `Purchase order ${saved.id} has been submitted for approval to ${saved.approver}. Status: In Process.` : `Purchase order ${saved.id} has been saved. Status: ${saved.status}.` };
  navigate(`order/${saved.id}${submit ? '' : '/edit'}`, true);
}
function updateApproval(approved, note = '') {
  if (state.settings.role !== 'manager' || !draft || draft.status !== 'In Process') return;
  const next = clone(state);
  const order = next.orders.find(order => order.id === draft.id);
  const validation = approved ? validateOrder(order, suppliers, locations) : [];
  if (validation.length) { errors = validation; render(); return; }
  order.status = approved ? 'Approved' : 'Incomplete'; order.updated = today();
  order.history.push({ date: now(), action: approved ? 'Approved' : 'Rejected', user: state.settings.approver, note });
  order.lines.forEach(line => { const req = next.requisitions.find(req => req.id === line.requisitionId); if (req) req.status = approved ? 'Ordered' : 'On Order'; });
  if (!commit(next)) { render(); return; }
  draft = clone(order); modal.close(); flash = { type: 'success', text: `Purchase order ${order.id} ${approved ? 'has been approved.' : 'was returned to the buyer for correction.'}` }; render();
}
function showReceipt(orderId, lineId) {
  const order = state.orders.find(order => order.id === orderId);
  const line = order?.lines.find(line => line.id === lineId);
  if (!order || !line || order.status !== 'Approved') return;
  openDialog(`Receive Items: ${h(orderId)}`, `<form id="receive-form" data-order="${order.id}" data-line-id="${line.id}"><div class="dialog-form"><dl class="record-summary"><dt>Item</dt><dd>${h(line.item)}</dd><dt>Description</dt><dd>${h(line.description)}</dd><dt>Remaining</dt><dd>${line.quantity - (line.received || 0)} ${h(line.uom)}</dd><dt>Ship-To</dt><dd>${h(locationOf(line.shipTo)?.name)}</dd></dl><div id="receipt-error" role="alert"></div><label for="receive-quantity">Quantity to Receive</label><input id="receive-quantity" name="quantity" type="number" min="0.01" step="any" value="${line.quantity - (line.received || 0)}" required autofocus><label for="receive-date">Receipt Date</label><input id="receive-date" name="date" type="date" value="${today()}" required><label for="receive-packing">Packing Slip</label><input id="receive-packing" name="packingSlip" required></div><div class="dialog-actions">${button('Cancel', 'close-dialog')}<button type="submit" class="legacy-button primary-button">Submit Receipt</button></div></form>`);
}
function showAttachmentForm() {
  attachmentDraft = null;
  openDialog('Add Attachment', `<form id="attachment-form"><div class="dialog-form"><div id="attachment-error" role="alert"></div><label for="attachment-title">Title</label><input id="attachment-title" name="title" required autofocus><label for="attachment-category">Category</label><select id="attachment-category" name="category">${options(['To Buyer', 'To Supplier', 'To Receiver', 'Internal'], 'To Buyer')}</select><label for="attachment-file">File</label><input id="attachment-file" name="file" type="file"><p class="muted">File attachments are stored in this browser. Maximum 1 MB per file.</p><label for="attachment-text">Or Text</label><textarea id="attachment-text" name="text" rows="4"></textarea></div><div class="dialog-actions">${button('Cancel', 'close-dialog')}<button type="submit" class="legacy-button primary-button">Apply</button></div></form>`);
}
function download(filename, contents, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bindContent() {
  app.querySelectorAll('[data-field]').forEach(control => control.addEventListener('input', () => {
    if (!isEditing()) return;
    const key = control.dataset.field; const before = draft[key]; draft[key] = control.value;
    if (key === 'shipTo') draft.lines.forEach(line => { if (line.shipTo === before) line.shipTo = control.value; });
    if (key === 'supplierName') {
      const supplier = suppliers.find(supplier => supplier.name.toLowerCase() === control.value.toLowerCase() || supplier.id === control.value);
      if (supplier) { applySupplier(supplier.id); control.value = supplier.name; const site = document.querySelector('[data-field="supplierSite"]'); site.innerHTML = options([supplier.site], supplier.site); document.querySelector('[data-field="supplierContact"]').value = supplier.contact; document.querySelector('[data-field="paymentTerms"]').value = supplier.terms; }
      else { draft.supplierId = ''; draft.supplierSite = ''; const site = document.querySelector('[data-field="supplierSite"]'); site.innerHTML = '<option value=""></option>'; }
    }
    rememberDraft();
    if (key === 'currency') refreshTotals();
  }));
  app.querySelectorAll('[data-line-field]').forEach(control => control.addEventListener('input', () => {
    if (!isEditing()) return;
    const line = draft.lines.find(line => line.id === control.dataset.line);
    if (!line) return;
    const key = control.dataset.lineField;
    line[key] = control.type === 'number' ? (control.value === '' ? '' : Number(control.value)) : control.value;
    if (key === 'item') { const item = catalog.find(item => item.id === control.value); if (item) { Object.assign(line, { description: item.description, category: item.category, uom: item.uom, price: item.price, catalogSupplierId: item.supplierId }); const row = control.closest('tr'); for (const fieldName of ['description', 'category', 'price', 'uom']) { const element = row.querySelector(`[data-line-field="${fieldName}"]`); if (element) element.value = line[fieldName]; } } else delete line.catalogSupplierId; }
    if (key === 'shipTo') document.querySelector(`[data-org="${line.id}"]`).textContent = locationOf(line.shipTo)?.org || '';
    rememberDraft(); refreshTotals();
  }));
  app.querySelectorAll('[name="selected-order"]').forEach(radio => radio.addEventListener('change', () => { ui.selectedOrder = radio.value; }));
  app.querySelectorAll('[data-req]').forEach(checkbox => checkbox.addEventListener('change', () => { checkbox.checked ? ui.selectedReq.add(checkbox.dataset.req) : ui.selectedReq.delete(checkbox.dataset.req); }));
}
function refreshTotals() {
  app.querySelectorAll('[data-total]').forEach(element => { element.textContent = money(total(draft), draft.currency); });
  draft.lines.forEach(line => { const element = app.querySelector(`[data-line-total="${line.id}"]`); if (element) element.textContent = money(line.quantity * line.price, draft.currency); });
}

document.addEventListener('click', event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); document.querySelector('#main')?.focus(); return; }
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const action = target.dataset.action;
  switch (action) {
    case 'dismiss-flash': flash = null; render(); break;
    case 'new-order': startOrder(); break;
    case 'order-for-supplier': startOrder(target.dataset.id); break;
    case 'return-orders': navigate('orders'); break;
    case 'cancel-edit': draft = null; errors = []; forgetDraft(); navigate('orders'); break;
    case 'edit-order': errors = []; navigate(`order/${draft.id}/edit`); break;
    case 'order-tab': ui.orderTab = target.dataset.tab; render(); break;
    case 'editor-tab': ui.editorTab = target.dataset.tab; render(); break;
    case 'receipt-tab': ui.receiptTab = target.dataset.tab; render(); break;
    case 'toggle-search': ui.searchOpen = !ui.searchOpen; render(); break;
    case 'apply-view': ui.view = document.querySelector('#order-view').value; render(); break;
    case 'clear-order-search': ui.query = ''; ui.status = ''; ui.supplier = ''; render(); break;
    case 'sort-orders': ui.direction = ui.sort === target.dataset.key ? -ui.direction : 1; ui.sort = target.dataset.key; render(); break;
    case 'export-orders': download('purchase-orders.csv', csv([['Order', 'Revision', 'Description', 'Supplier', 'Site', 'Buyer', 'Date', 'Amount', 'Currency', 'Status', 'Dealer Order', 'Customer', 'Request ID'], ...filteredOrders().map(order => [order.id, order.revision, order.description, order.supplierName, order.supplierSite, order.buyer, order.created, total(order), order.currency, order.status, order.dealerOrder, order.customer, order.requestId])]), 'text/csv'); break;
    case 'apply-order-action': {
      const order = state.orders.find(order => order.id === ui.selectedOrder);
      if (!order) { flash = { type: 'error', text: 'Select a purchase order before choosing an action.' }; render(); break; }
      const choice = document.querySelector('#order-action').value;
      if (choice === 'Update') {
        if (['In Process', 'Cancelled'].includes(order.status)) { flash = { type: 'error', text: `Order ${order.id} is ${order.status} and cannot be updated.` }; render(); }
        else { draft = clone(order); ui.editorTab = 'Header'; errors = []; navigate(`order/${order.id}/edit`); }
      } else if (choice === 'View') { ui.editorTab = 'Header'; errors = []; navigate(`order/${order.id}`); }
      else if (choice === 'Duplicate') { draft = clone(order); Object.assign(draft, { id: null, requestId: '', revision: 0, status: 'Incomplete', created: today(), updated: today(), history: [], attachments: [] }); draft.lines.forEach(line => { line.id = uid(); line.received = 0; delete line.requisitionId; }); ui.editorTab = 'Header'; errors = []; rememberDraft(); navigate('order/new'); }
      else if (choice === 'Cancel') {
        if (order.status === 'In Process' || order.status === 'Cancelled' || order.lines.some(line => line.received > 0)) { flash = { type: 'error', text: 'Orders pending approval, already cancelled, or with recorded receipts cannot be cancelled here.' }; render(); break; }
        openDialog(`Cancel Purchase Order ${order.id}`, `<form id="cancel-order-form" data-id="${order.id}"><div class="dialog-form"><label for="cancel-reason">Reason</label><textarea id="cancel-reason" name="reason" rows="3" required autofocus></textarea><p>Cancelled orders remain in order history. Linked requisitions return to the demand workbench.</p></div><div class="dialog-actions">${button('Keep Order', 'close-dialog')}<button class="legacy-button primary-button" type="submit">Cancel Order</button></div></form>`);
      }
      break;
    }
    case 'lookup-supplier': lookupSupplier(); break;
    case 'select-supplier': modal.close(); applySupplier(target.dataset.id); render(); document.querySelector('#field-supplierName')?.focus(); break;
    case 'add-lines': document.querySelector('#add-lines-source').value === 'Blank Line' ? (draft.lines.push(blankLine()), rememberDraft(), render()) : lookupCatalog(); break;
    case 'add-blank-line': draft.lines.push(blankLine()); rememberDraft(); render(); app.querySelectorAll('[data-line-field="item"]').item(draft.lines.length - 1)?.focus(); break;
    case 'lookup-item': lookupCatalog(target.dataset.id); break;
    case 'select-item': insertCatalogItem(catalog.find(item => item.id === target.dataset.id), lookupLineId); rememberDraft(); modal.close(); render(); break;
    case 'add-catalog-items': {
      const selected = [...modal.querySelectorAll('[name="catalog-item"]:checked')].map(control => catalog.find(item => item.id === control.value));
      if (!selected.length) { let info = modal.querySelector('.lookup-error'); if (!info) { info = document.createElement('p'); info.className = 'field-error lookup-error'; info.setAttribute('role', 'alert'); modal.querySelector('.dialog-body').prepend(info); } info.textContent = 'Select at least one catalog item.'; break; }
      const supplierId = draft.supplierId || selected[0].supplierId;
      if (selected.some(item => item.supplierId !== supplierId)) { let info = modal.querySelector('.lookup-error'); if (!info) { info = document.createElement('p'); info.className = 'field-error lookup-error'; modal.querySelector('.dialog-body').prepend(info); } info.textContent = 'Select items from a single supplier. Separate suppliers require separate purchase orders.'; break; }
      selected.forEach(item => insertCatalogItem(item)); rememberDraft(); modal.close(); ui.editorTab = 'Lines'; render(); break;
    }
    case 'delete-line': {
      const line = draft.lines.find(line => line.id === target.dataset.id);
      if (line?.received > 0) flash = { type: 'error', text: 'A line with recorded receipts cannot be deleted.' };
      else { draft.lines = draft.lines.filter(line => line.id !== target.dataset.id); rememberDraft(); }
      render(); break;
    }
    case 'save-order': saveOrder(); break;
    case 'submit-order': saveOrder(true); break;
    case 'approval-options': showApprovalOptions(); break;
    case 'approve-order': updateApproval(true); break;
    case 'reject-order': if (state.settings.role === 'manager') openDialog('Reject Purchase Order', `<form id="reject-form"><div class="dialog-form"><label for="reject-reason">Reason for Rejection</label><textarea id="reject-reason" name="reason" rows="4" required autofocus></textarea></div><div class="dialog-actions">${button('Cancel', 'close-dialog')}<button class="legacy-button primary-button" type="submit">Reject</button></div></form>`); break;
    case 'review-approval': ui.editorTab = 'Header'; errors = []; navigate(`order/${target.dataset.id}`); break;
    case 'focus-error': {
      const key = target.dataset.fieldTarget;
      if (key.startsWith('line:')) { const [, id, lineField] = key.split(':'); ui.editorTab = lineField === 'account' ? 'Distributions' : ['shipTo', 'promisedDate'].includes(lineField) ? 'Schedules' : 'Lines'; render(); document.querySelector(`[data-line="${id}"][data-line-field="${lineField}"]`)?.focus(); }
      else if (key === 'lines') { ui.editorTab = 'Lines'; render(); document.querySelector('[data-line-field="quantity"]')?.focus(); }
      else { ui.editorTab = 'Header'; render(); document.querySelector(`[data-field="${key}"]`)?.focus(); }
      break;
    }
    case 'add-to-builder': {
      const reqs = [...ui.selectedReq].map(id => state.requisitions.find(req => req.id === id)).filter(req => req?.status === 'Approved');
      const combined = [...new Set([...ui.builderReq, ...reqs.map(req => req.id)])].map(id => state.requisitions.find(req => req.id === id));
      if (!reqs.length) flash = { type: 'error', text: 'Select at least one approved requisition line.' };
      else if (new Set(combined.map(req => req.supplierId)).size > 1) flash = { type: 'error', text: 'Selected requisitions have different suppliers. Create a separate order for each supplier.' };
      else { ui.builderReq = combined.map(req => req.id); flash = null; }
      render(); break;
    }
    case 'clear-builder': ui.builderReq = []; ui.selectedReq.clear(); render(); break;
    case 'create-from-req': {
      const reqs = ui.builderReq.map(id => state.requisitions.find(req => req.id === id)).filter(req => req?.status === 'Approved');
      if (!reqs.length) { flash = { type: 'error', text: 'Add approved requisition lines to the document builder.' }; render(); break; }
      draft = newOrder(); applySupplier(reqs[0].supplierId);
      draft.description = `Requisition ${reqs.map(req => req.id).join(', ')} — ${reqs[0].description}`;
      draft.shipTo = reqs[0].shipTo; draft.dealerOrder = [...new Set(reqs.map(req => req.dealerOrder).filter(Boolean))].join(', '); draft.customer = [...new Set(reqs.map(req => req.customer).filter(Boolean))].join(', ');
      draft.lines = reqs.map(req => { const item = catalog.find(item => item.id === req.item); return { ...blankLine(), item: req.item, description: req.description, category: item.category, quantity: req.quantity, price: req.price, uom: req.uom, needBy: req.needBy, shipTo: req.shipTo, catalogSupplierId: req.supplierId, requisitionId: req.id }; });
      ui.builderReq = []; ui.selectedReq.clear(); ui.editorTab = 'Header'; errors = []; rememberDraft(); navigate('order/new'); break;
    }
    case 'view-req': {
      const req = state.requisitions.find(req => req.id === target.dataset.id);
      openDialog(`Requisition ${req.id}, Line 1`, `<dl class="record-summary"><dt>Item</dt><dd>${h(req.item)}</dd><dt>Description</dt><dd>${h(req.description)}</dd><dt>Quantity</dt><dd>${req.quantity} ${h(req.uom)}</dd><dt>Requested By</dt><dd>${h(req.requester)}</dd><dt>Need-By</dt><dd>${date(req.needBy)}</dd><dt>Dealer Order</dt><dd>${h(req.dealerOrder || '—')}</dd><dt>End Customer</dt><dd>${h(req.customer || '—')}</dd><dt>Justification</dt><dd>${h(req.note)}</dd></dl><div class="dialog-actions">${button('Close', 'close-dialog')}</div>`); break;
    }
    case 'view-supplier': {
      const supplier = supplierOf(target.dataset.id);
      openDialog(`Supplier: ${h(supplier.name)}`, `<dl class="record-summary"><dt>Supplier Number</dt><dd>${h(supplier.id)}</dd><dt>Site</dt><dd>${h(supplier.site)}</dd><dt>Address</dt><dd>${h(supplier.address)}</dd><dt>Contact</dt><dd>${h(supplier.contact)}</dd><dt>Email</dt><dd>${h(supplier.email)}</dd><dt>Payment Terms</dt><dd>${h(supplier.terms)}</dd><dt>Tax Documentation</dt><dd>${h(supplier.tax)}</dd></dl>${table(['Item', 'Description', 'Unit Price'], catalog.filter(item => item.supplierId === supplier.id).map(item => `<tr><td>${h(item.id)}</td><td>${h(item.description)}</td><td>${money(item.price)}</td></tr>`))}<div class="dialog-actions">${button('Close', 'close-dialog')}${button('Create Order', 'dialog-order-for-supplier', `data-id="${supplier.id}"`)}</div>`, { wide: true }); break;
    }
    case 'dialog-order-for-supplier': modal.close(); startOrder(target.dataset.id); break;
    case 'clear-supplier-search': ui.supplierQuery = ''; render(); break;
    case 'view-agreement': {
      const agreement = state.agreements.find(agreement => agreement.id === target.dataset.id);
      openDialog(`Blanket Purchase Agreement: ${agreement.id}`, `<dl class="record-summary"><dt>Supplier</dt><dd>${h(supplierOf(agreement.supplierId)?.name)}</dd><dt>Description</dt><dd>${h(agreement.description)}</dd><dt>Effective Dates</dt><dd>${date(agreement.start)} to ${date(agreement.end)}</dd><dt>Amount Limit</dt><dd>${money(agreement.limit)}</dd><dt>Payment Terms</dt><dd>${h(agreement.terms)}</dd></dl><div class="dialog-actions">${button('Close', 'close-dialog')}${button('Create Purchase Order', 'dialog-order-for-supplier', `data-id="${agreement.supplierId}"`)}</div>`); break;
    }
    case 'receive': showReceipt(target.dataset.order, target.dataset.lineId); break;
    case 'add-attachment': showAttachmentForm(); break;
    case 'delete-attachment': draft.attachments = draft.attachments.filter(attachment => attachment.id !== target.dataset.id); rememberDraft(); render(); break;
    case 'view-attachment': {
      const attachment = draft.attachments.find(attachment => attachment.id === target.dataset.id);
      if (attachment.type === 'File') { const anchor = document.createElement('a'); anchor.href = attachment.data; anchor.download = attachment.filename; anchor.click(); }
      else openDialog(h(attachment.name), `<pre class="attachment-text">${h(attachment.text)}</pre><div class="dialog-actions">${button('Close', 'close-dialog')}</div>`);
      break;
    }
    case 'print-order': window.print(); break;
    case 'preferences': showPreferences(); break;
    case 'confirm-reset': openDialog('Reset Sample Data', `<p>This restores the original demonstration data and removes orders, receipts, and attachments created in this browser.</p><div class="dialog-actions">${button('Cancel', 'close-dialog')}${button('Reset Sample Data', 'reset-data', '', 'primary-button')}</div>`); break;
    case 'reset-data': if (commit(seedState())) { draft = null; errors = []; ui.selectedReq.clear(); ui.builderReq = []; forgetDraft(); modal.close(); flash = { type: 'success', text: 'Sample data has been restored.' }; navigate('orders', true); } else { modal.close(); render(); } break;
    case 'close-dialog': modal.close(); break;
    case 'help': openDialog('Purchasing Help', `<h3>Create a standard purchase order</h3><ol><li>On Orders, choose Standard Purchase Order and click Go.</li><li>On Header, complete the description, External Request ID, Dealer Order Number, End Customer, and delivery terms. The approved supplier is preselected.</li><li>On Lines, enter the module quantity and need-by date. The item and contract price are fixed.</li><li>Review Schedules and Distributions. Add any supporting attachments or notes.</li><li>Click Save to keep a draft, or Submit to request approval.</li></ol><h3>Create from a requisition</h3><p>On Requisitions, select a line, click Add to Document Builder, and then Create.</p><h3>Approvals and receiving</h3><p>Switch responsibility to US Purchasing Manager in Preferences to review and approve submitted orders. Approved orders are available in Receiving.</p><div class="dialog-actions">${button('Close', 'close-dialog')}</div>`); break;
    case 'about': openDialog('About this page', `<h3>International Motors Purchasing Demonstration</h3><p>An interactive simulation for ordering IM-TCM-4200 transmission control modules, based on Oracle E-Business Suite R12 Buyer’s Work Center. Supplier names, part numbers, contacts, and transactions are illustrative. This site does not connect to International Motors or Oracle.</p><p>Records and file attachments remain in this browser. Approval and receiving actions update demonstration records only.</p><p>Reference: <a href="https://docs.oracle.com/cd/E18727-01/doc.121/e13410/T446883T443956.htm" target="_blank" rel="noopener">Oracle Purchasing User’s Guide — Professional Buyer’s Work Center</a>.</p><div class="dialog-actions">${button('Close', 'close-dialog')}</div>`); break;
  }
});

document.addEventListener('submit', async event => {
  const form = event.target;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  switch (form.id) {
    case 'order-search': ui.query = values.query; ui.status = values.status; ui.supplier = values.supplier; render(); break;
    case 'req-search': ui.reqQuery = values.query; ui.reqView = values.view; render(); break;
    case 'supplier-search': ui.supplierQuery = values.query; render(); break;
    case 'lookup-supplier-search': document.querySelector('#supplier-lookup-results').innerHTML = supplierLookupRows(suppliers.filter(supplier => `${supplier.name} ${supplier.id}`.toLowerCase().includes(values.query.toLowerCase()))); break;
    case 'catalog-search': document.querySelector('#catalog-results').innerHTML = catalogRows(catalog.filter(item => (!values.supplier || item.supplierId === values.supplier) && `${item.id} ${item.description}`.toLowerCase().includes(values.query.toLowerCase()))); break;
    case 'approval-options-form': draft.approver = values.approver; draft.approvalNote = values.note; rememberDraft(); modal.close(); break;
    case 'preferences-form': {
      const next = clone(state); Object.assign(next.settings, values); if (commit(next)) { modal.close(); flash = { type: 'success', text: 'Preferences have been updated.' }; } render(); break;
    }
    case 'reject-form': updateApproval(false, values.reason); break;
    case 'cancel-order-form': {
      const next = clone(state); const order = next.orders.find(order => order.id === form.dataset.id);
      order.status = 'Cancelled'; order.history.push({ date: now(), action: 'Cancelled', user: state.settings.buyer, note: values.reason });
      next.requisitions.forEach(req => { if (req.orderId === order.id) { req.status = 'Approved'; delete req.orderId; } });
      if (commit(next)) { modal.close(); flash = { type: 'success', text: `Purchase order ${order.id} has been cancelled.` }; } render(); break;
    }
    case 'receive-form': {
      const next = clone(state); const order = next.orders.find(order => order.id === form.dataset.order); const line = order?.lines.find(line => line.id === form.dataset.lineId);
      if (!line || order.status !== 'Approved') return;
      const error = validateReceipt(line, values.quantity) || (!validDate(values.date) ? 'Enter a valid receipt date.' : '') || (!values.packingSlip.trim() ? 'Packing Slip is required.' : '');
      if (error) { document.querySelector('#receipt-error').textContent = error; document.querySelector('#receipt-error').className = 'field-error'; return; }
      line.received = Math.round(((line.received || 0) + Number(values.quantity)) * 1000000) / 1000000;
      const receipt = { id: `RCV-${next.nextReceipt++}`, orderId: order.id, item: line.item, quantity: Number(values.quantity), date: values.date, packingSlip: values.packingSlip.trim(), receiver: state.settings.buyer };
      next.receipts.push(receipt); order.history.push({ date: now(), action: 'Receipt recorded', user: state.settings.buyer, note: `${receipt.id}: ${receipt.quantity} × ${line.item}` });
      if (commit(next)) { modal.close(); flash = { type: 'success', text: `Receipt ${receipt.id} recorded for order ${order.id}: ${receipt.quantity} ${line.uom} received.` }; } render(); break;
    }
    case 'attachment-form': {
      const errorElement = document.querySelector('#attachment-error');
      const file = form.querySelector('[name="file"]').files[0];
      if (!file && !values.text.trim()) { errorElement.textContent = 'Choose a file or enter attachment text.'; errorElement.className = 'field-error'; return; }
      if (file && file.size > 1024 * 1024) { errorElement.textContent = 'The selected file exceeds the 1 MB limit.'; errorElement.className = 'field-error'; return; }
      const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
      const attachmentOrder = draft;
      try {
        attachmentDraft = { id: uid(), name: values.title, category: values.category, type: file ? 'File' : 'Text', text: values.text };
        if (file) { attachmentDraft.filename = file.name; attachmentDraft.data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
        if (draft !== attachmentOrder || !modal.open || !form.isConnected) return;
        draft.attachments.push(attachmentDraft); rememberDraft(); modal.close(); render();
      } catch { errorElement.textContent = 'The attachment could not be read. Choose the file again.'; errorElement.className = 'field-error'; submit.disabled = false; }
      break;
    }
  }
});

window.addEventListener('hashchange', () => { if (!keepNavigationFlash) flash = null; keepNavigationFlash = false; errors = []; render(); window.scrollTo(0, 0); });
render();
