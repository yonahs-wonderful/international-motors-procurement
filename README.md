# International Motors procurement simulation

A functional, static procurement UI inspired by **Oracle E-Business Suite R12 Buyer’s Work Center**, for computer-use agent demonstrations and testing.

Live site: https://yonahs-wonderful.github.io/international-motors-procurement/

## Workflows

- Search, sort, filter and export purchase orders; inspect headers, lines, schedules and distributions.
- Create an order using supplier and item lookup dialogs, or convert approved requisitions through Document Builder.
- Edit quantities, prices, delivery dates, accounting, dealer/customer references and notes. Attach text or files up to 1 MB each.
- Save incomplete drafts, validate submissions, submit for approval, and inspect action history.
- Switch to **US Purchasing Manager** in Preferences to approve or reject orders.
- Record partial receipts against approved orders. Over-receipts are rejected.
- Browse supplier profiles and blanket agreement references.

## Sample agent task

> In Requisitions, source requisition 10482 for dealer order DLR-24017, customer Pioneer Logistics. Create a standard purchase order to Midwest Powertrain Components for 20 IM-TCM-4200 modules at $780 each, needed by November 16, 2026 at San Antonio. Add a supplier note requesting delivery confirmation, attach a text justification, review the schedule and charge account, save, then submit to Chen, Jordan for approval. Report the order number, amount, and status.

Expected amount: **$15,600.00**. The first new order after reset is **800012350** and submission sets **In Process**. Approval and receiving are separate actions. Existing draft **800012349** provides an alternate task starting from an existing order.

No login is needed. Use **Preferences → Reset Sample Data**, or open the site with `?reset=1`, to restore the same scenario. Direct hash routes such as `#requisitions` and `#order/800012349/edit` work on GitHub Pages.

## Local development

Requires Node.js 18+ for checks and Python 3 for the development server; no dependencies or build step.

```sh
npm start
npm run check
npm test
```

Open http://127.0.0.1:4178/. The repository root is published directly through GitHub Pages from the `main` branch.

## Scope and storage

This is an independently built simulation, not an authenticated International Motors or Oracle system. Supplier names, contacts, part numbers, transactions, roles and approval rules are illustrative. Public evidence supports Oracle Applications as a relevant procurement-system candidate; International’s exact internal screens, customization and current version have not been verified. See [DESIGN.md](DESIGN.md) for sources.

All mutations affect browser-local demonstration records only. No order, email or payment is sent. Saved records and attachments use localStorage, scoped to the browser profile and site origin; unsaved edits use sessionStorage. There is no shared database, actual authentication, server-side approval enforcement or cross-device synchronization. Browser storage quotas apply. Use synthetic documents and data.
