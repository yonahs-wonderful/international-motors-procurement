# Design and evidence

## Direction

The user is a procurement buyer (or a computer-use agent acting for one). The landing screen shows existing purchase orders and their statuses, with a compact Create control. Requisition conversion is the main guided scenario.

Match the older enterprise UI seen in Oracle’s published R12 documentation: blue header, rectangular navigation, Arial text, compact beveled controls, lavender forms, blue gradient section bars and dense grid tables. Keep controls as real labeled HTML inputs, selects, buttons and native dialogs for keyboard and visual interaction. Preserve this older visual language instead of introducing modern dashboard cards.

Desktop forms use two columns. At narrower widths, forms and Document Builder stack, while dense tables scroll within their panels. Feedback includes required-field errors, inline totals, confirmation messages, locked submitted documents and disabled actions. Styling is intentionally light only.

## Primary sources consulted

1. [Oracle Purchasing User’s Guide R12.1 — Professional Buyer’s Work Center](https://docs.oracle.com/cd/E18727-01/doc.121/e13410/T446883T443956.htm). Published screenshots for Orders, Create Order and Requisitions informed layout, labels, tabs and controls. This reconstruction uses original HTML/CSS and does not redistribute Oracle screenshot assets.
2. [International / Navistar supplier portal — iSupplier Direct Ship](https://www.navistarsupplier.com/PartsGroup/iSupplierPortalDirectShip.aspx). Public supplier-facing Oracle context, page updated May 2026.
3. [Navistar Direct Ship iSupplier Portal — Supplier User Guide](https://www.navistarsupplier.com/Documents/Parts%20Group/Navistar%20Direct%20Ship%20iSupplier%20Portal%20-%20Supplier%20User%20Guide.pdf). Names Oracle Applications and describes the Direct Ship ERP launched in 2012.
4. [Supplier Invoicing Requirements](https://www.navistarsupplier.com/Documents/Payment%20Instructions/Supplier%20Invoicing%20Requirements.pdf). March 2026 instructions refer to an “Oracle P.O.”
5. [S2C Supplier Training](https://www.navistarsupplier.com/Documents/IndirectProcurement/S2C%20Supplier%20Training.pdf). 2024 Ivalua sourcing/onboarding training, page 36, separates invoices and purchase orders from Ivalua.

Evidence supports Oracle as a plausible procurement-system family; it does not prove International uses this exact Buyer’s Work Center screen or version today. Buyer’s Work Center is the reference because this task creates purchase orders, whereas iSupplier is the supplier-side portal.

## Simulation choices

- Original International Motors text heading; no external brand assets or font downloads.
- One fixed fictional item (IM-TCM-4200), one approved supplier and USD 780.00 unit price. Quantity, delivery date, dealer/customer references and justification come from the request.
- Dealer order and end-customer references are illustrative customization.
- Approval responsibility switching makes the end-to-end exercise self-contained, without presenting it as production access control.
- Agreement screens provide sourcing context; orders created there are standard purchase orders, not a complete blanket-release engine.
- Taxes, budget controls, EDI, invoice matching, real email transmission and multi-user concurrency are outside this demo.

External Request ID is a visible business field for webhook traceability. Uniqueness is enforced against non-cancelled orders in the current browser only. No request payload is embedded in a URL or used to bypass form entry.
