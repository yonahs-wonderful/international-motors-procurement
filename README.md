# International Motors — control module purchasing

Live site: https://yonahs-wonderful.github.io/international-motors-procurement/

A static Oracle E-Business Suite R12-style procurement simulation for a single approved item: **IM-TCM-4200, Transmission control module — LT chassis**, supplied by **Midwest Powertrain Components** at **USD 780.00 / Each**.

The new order form preselects the supplier and single item. Enter the description, External Request ID, Dealer Order Number, End Customer, quantity, need-by date and destination. Add supplier notes or text/file justification, review schedules and the charge account, then Save and Submit for approval. The resulting status is **In Process**, not approved or delivered.

The UI validates the fixed SKU, supplier, contract price, currency, unit, whole-number quantity and required order references. Duplicate External Request IDs are rejected within the same browser's active orders. Orders can be searched by Request ID. Manager approval and partial receiving remain available as optional follow-on demo workflows.

## Agent scenario

Create an order for dealer DLR-24017 and customer Pioneer Logistics: 20 modules needed November 16, 2026 at San Antonio. Use a unique request ID, attach a supplied material-shortage justification, save and submit to Chen, Jordan. Expected amount: **$15,600.00**. The first new PO after reset is **800012350**.

Agent source is maintained separately in the International Motors Wonderful workspace. The agent receives these fields by webhook:

```json
{
  "request_id": "IM-DEMO-20261026-001",
  "part_number": "IM-TCM-4200",
  "quantity": 20,
  "need_by": "2026-11-16",
  "dealer_order": "DLR-24017",
  "customer": "Pioneer Logistics",
  "ship_to": "SAN-ANTONIO",
  "note_to_supplier": "Please confirm delivery timing.",
  "justification": "Material shortage for a 20-truck LT Series fleet build.",
  "action": "submit"
}
```

Use Preferences → Reset Sample Data or `?reset=1` to restart the demo. Hash routes such as `#order/new` work on GitHub Pages. The single-item version uses a separate browser storage namespace; earlier multi-item demo records are not modified.

## Development

Node.js 18+ and Python 3; no dependencies or build step.

```sh
npm start
npm run check
npm test
```

Open http://127.0.0.1:4178/. GitHub Pages publishes the repository root from main.

## Scope and persistence

This independently built demonstration does not connect to International Motors, Oracle, a supplier or a payment system. Names, SKUs and transactions are illustrative. Public evidence supports Oracle Applications as a relevant candidate; the actual internal screens and version are unverified. See [DESIGN.md](DESIGN.md).

Saved records and attachments use localStorage, scoped to one browser profile and origin; unsaved edits use sessionStorage. There is no shared database or cross-device synchronization. A fresh agent browser may not see prior runs or a user's browser data. The caller must deduplicate and serialize deliveries across independent webhook runs. No global exactly-once ordering is claimed. Use synthetic documents. Files are limited to 1 MB each and browser storage quotas apply.
