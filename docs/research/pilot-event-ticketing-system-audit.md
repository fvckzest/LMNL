# LMNL Managed Ticketing Pilot — current-system audit

**Audit date:** August 13, 2026

**Scope:** Source and SQL in this checkout only. This is an implementation audit, not a certification that the live Supabase schema, Square configuration, webhook subscription, email domain, Apple pass certificate, or deployed environment is correctly configured.

## Decision summary

LMNL already has a usable **single-ticket sales and admission rail**: an admin can create an event, a buyer can be sent to a Square-hosted checkout, Square payment fulfillment can issue one QR ticket, the buyer can receive an email/Apple Wallet pass, and an LMNL Admin can check the ticket in once. That is valuable pilot groundwork.

It is **not yet a reliable LMNL Managed Ticketing Pilot rail**. The pilot's hard requirements have no durable model or operational controls for seller/recipient designation, all-in-price and policy acceptance, fixed-capacity enforcement, cancellation/refund, chargebacks, Square fee evidence, 10% LMNL Fee, Recipient Share, manual Recipient Settlement, or an event-level reconciliation/audit packet. The separate pilot-boundary research adds an independent launch gate: Square must confirm the seller/payment structure before sales. See [PR #14](https://github.com/fvckzest/LMNL/pull/14).

### Readiness by pilot capability

| Pilot capability | Audit result | Why it matters |
| --- | --- | --- |
| One paid GA event listing | **Partial** | Existing event CRUD holds a price, date, time, location, capacity, and one Square variation, but does not lock pilot terms after sales open. |
| Buyer checkout and payment | **Existing, conditional** | Square-hosted payment links and a direct Payments API path exist. The hosted-link route is the buyer-facing Space route. Its legal seller structure still needs outside confirmation. |
| Capacity | **Gap** | Capacity/inventory is displayed, not atomically reserved or checked before a payment link/order is created. Overselling remains possible. |
| Issuance, ticket delivery, wallet | **Existing with recovery gaps** | Webhook fulfillment issues a QR ticket, email, optional Apple Wallet pass, and protects duplicate ticket rows per Square order. Email/pass failures are logged but not durably queued for recovery. |
| Check-in | **Existing** | An authenticated LMNL Admin can validate and mark one QR ticket used. |
| Buyer disclosures and records | **Gap** | There is no purchase-time disclosure/version/acceptance record for seller identity, the all-in total, final-sale policy, cancellation refund, or event terms. |
| Cancellation, refund, dispute | **Gap** | No cancellation event state, Square refund/dispute workflow, revoked ticket, buyer notice, or chargeback record. |
| Reconciliation and settlement | **Gap** | No financial tables/services for payments, fees, refunds, disputes, fee/share calculation, payment proof, or settlement approval. |
| Audit/recovery | **Partial** | Ticket idempotency and broadcast-email send logs exist, but no durable webhook/event ledger, operational recovery queue, or settlement/audit packet. |

## Evidence map

### 1. Event listing and administration — partial

- The public Events page loads Supabase/API event rows and renders timeline/event detail; its action is simply the configured `event_link` or `partiful_url`, not an integrated event detail/terms/checkout page ([`src/pages/Events.jsx:16-39`](../../src/pages/Events.jsx#L16-L39), [`src/lib/siteData.js:249-283`](../../src/lib/siteData.js#L249-L283)).
- The LMNL Admin event form persists one USD price, date, time, location/address, description, capacity, privacy, status, Square variation, and flexible metadata ([`src/components/admin/EventsTab.jsx:358-385`](../../src/components/admin/EventsTab.jsx#L358-L385), [`src/components/admin/EventsTab.jsx:1116-1235`](../../src/components/admin/EventsTab.jsx#L1116-L1235)). The server restricts POST writes to an admin but permits public event reads ([`api/[...route].js:402-445`](../../api/%5B...route%5D.js#L402-L445), [`sql/phase1_admin_authorization.sql:44-56`](../../sql/phase1_admin_authorization.sql#L44-L56)).
- The status selector has `active`, `past`, `sold_out`, `draft`, and `archived`; it has no `sales_open`, `sales_closed`, `cancelled`, `refunding`, or settlement/reconciliation state ([`src/components/admin/EventsTab.jsx:1149-1157`](../../src/components/admin/EventsTab.jsx#L1149-L1157)). Event records can also be edited or deleted after sales; no source evidence freezes the pilot date, venue, price, fee, capacity, or terms version.
- There is no first-class Settlement Recipient, LMNL Fee, Recipient Share, agreement reference, seller-of-record, single-event tax setting, or policy version field in the form/repository shape ([`api/_lib/repositories/events.js:84-125`](../../api/_lib/repositories/events.js#L84-L125)). Metadata is technically extensible, but it is not a reviewed financial/audit model.

### 2. Checkout and payment — existing, but only a basic sales rail

- The deployed buyer-facing Space action creates a hosted Square payment link and redirects the browser to it ([`src/pages/Space.jsx:211-224`](../../src/pages/Space.jsx#L211-L224), [`api/[...route].js:191-199`](../../api/%5B...route%5D.js#L191-L199)). `createCheckoutForEvent` creates an `approved` access request, then creates the hosted order/link ([`api/_lib/services/checkout.js:436-453`](../../api/_lib/services/checkout.js#L436-L453)).
- The hosted order carries `requestId` and `eventId`, uses quantity `1`, either references the selected Square variation or builds a priced ticket line, and redirects to `/success`. Checkout options only set redirect/coupons; they do not add pilot policies, policy acceptance, or a purchase-time receipt/terms snapshot ([`api/_lib/services/checkout.js:318-393`](../../api/_lib/services/checkout.js#L318-L393)).
- A second direct Payments API route constructs one Square order/payment and requires buyer name/email. It is exposed at `/api/pay-event`, but source search found no buyer-facing UI that calls it ([`api/_lib/services/event-checkout.js:93-194`](../../api/_lib/services/event-checkout.js#L93-L194), [`api/[...route].js:326-340`](../../api/%5B...route%5D.js#L326-L340)).
- Both routes generate a fresh random Square idempotency key for each invocation. The later ticket issuance layer prevents duplicate *ticket rows*, but checkout retried by a client has no durable buyer/request/order idempotency key or pending-order reuse control ([`api/_lib/services/checkout.js:334-366`](../../api/_lib/services/checkout.js#L334-L366), [`api/_lib/services/event-checkout.js:125-177`](../../api/_lib/services/event-checkout.js#L125-L177)).
- No source records a simple event-level answer for whether tax applies or preserves any Square-collected tax separately from the settlement split. For this casual pilot, that is a single configuration and evidence requirement—not a tax engine or automated filing system.

### 3. Capacity and inventory — display-only, blocking gap

- Admins can enter a capacity and optionally select an inventory-tracked Square variation ([`src/components/admin/EventsTab.jsx:1123-1219`](../../src/components/admin/EventsTab.jsx#L1123-L1219)).
- `getVariationInventory` reads Square inventory and price; the Space snapshot sets `sold_out` only when the read reports no inventory ([`api/_lib/services/inventory.js:17-55`](../../api/_lib/services/inventory.js#L17-L55), [`src/lib/siteData.js:339-377`](../../src/lib/siteData.js#L339-L377)).
- Neither hosted checkout nor direct payment checks current availability, reserves capacity, locks a seat/ticket, or atomically decrements a pilot capacity before charging. Concurrent buyers can therefore receive links/orders beyond capacity ([`api/_lib/services/checkout.js:436-453`](../../api/_lib/services/checkout.js#L436-L453), [`api/_lib/services/event-checkout.js:93-177`](../../api/_lib/services/event-checkout.js#L93-L177)). Capacity must be enforced server-side before the pilot opens sales.

### 4. Fulfillment, ticket delivery, and wallet — existing with partial recovery

- The Square webhook calculates the request URL, passes the raw body to signature verification, and dispatches to fulfillment ([`api/[...route].js:1189-1200`](../../api/%5B...route%5D.js#L1189-L1200), [`api/_lib/services/webhook-fulfillment.js:86-113`](../../api/_lib/services/webhook-fulfillment.js#L86-L113)).
- For a fulfillable paid order, fulfillment locks/locates the approved request, identifies the event using metadata, catalog variation, or event name, inserts a ticket with a generated QR token, and sends buyer email plus a Discord notification ([`api/_lib/services/webhook-fulfillment.js:293-403`](../../api/_lib/services/webhook-fulfillment.js#L293-L403)).
- The ticket schema hardening uses unique indexes on Square order ID and QR payload, so duplicate webhooks/concurrent ticket inserts resolve to one ticket row ([`sql/phase6_ticket_idempotency.sql:1-27`](../../sql/phase6_ticket_idempotency.sql#L1-L27)). The current environment must be verified to have applied that SQL; the migration itself says it requires manual cleanup/application.
- Ticket email sends a ticket URL and attempts to attach an Apple Wallet pass; failure to generate a pass falls back to email without it, while an email failure is only logged and does not create a persistent retry job ([`api/_lib/services/webhook-fulfillment.js:163-217`](../../api/_lib/services/webhook-fulfillment.js#L163-L217), [`api/_lib/services/webhook-fulfillment.js:391-401`](../../api/_lib/services/webhook-fulfillment.js#L391-L401)). Apple Wallet is deliberately unavailable when certificate/config material is missing ([`api/_lib/services/passkit.js:82-144`](../../api/_lib/services/passkit.js#L82-L144)).
- Admin broadcast email is stronger: it uses retry logic and an idempotent send-log keyed by event/email/content hash ([`api/_lib/services/ticket-holder-email.js:62-109`](../../api/_lib/services/ticket-holder-email.js#L62-L109), [`sql/ticket_holder_email_sends.sql:1-29`](../../sql/ticket_holder_email_sends.sql#L1-L29)). It can notify holders about a cancellation once that workflow exists, but it is not itself a cancellation/refund system.
- The README claims secure QR-coded PDF fulfillment, but the current source implements QR ticket pages and `.pkpass`; no PDF ticket-generation path was found ([`README.md:19-35`](../../README.md#L19-L35), [`api/_lib/services/passkit.js:82-144`](../../api/_lib/services/passkit.js#L82-L144)).

### 5. Ticket access and check-in — existing

- A ticket page fetches a ticket by raw ticket ID, displays a QR code and optional Apple Wallet action, and marks its use status ([`src/pages/Ticket.jsx:23-53`](../../src/pages/Ticket.jsx#L23-L53), [`src/pages/Ticket.jsx:131-179`](../../src/pages/Ticket.jsx#L131-L179)). The GET endpoint itself does not require buyer authentication ([`api/[...route].js:470-475`](../../api/%5B...route%5D.js#L470-L475)); server-side access is by an ID whose unguessability is assumed. Treat this as a privacy review item, not a verified buyer-authorization policy.
- QR codes resolve to the `admin.` check-in origin ([`api/_lib/services/tickets.js:14-28`](../../api/_lib/services/tickets.js#L14-L28)). The check-in endpoint requires an LMNL Admin on both preview and confirmation ([`api/[...route].js:477-488`](../../api/%5B...route%5D.js#L477-L488)).
- `confirmCheckInTicket` rejects reused tickets, updates `is_used`/`used_at`, and attempts to record attendance verification ([`api/_lib/services/tickets.js:66-120`](../../api/_lib/services/tickets.js#L66-L120), [`api/_lib/repositories/tickets.js:224-238`](../../api/_lib/repositories/tickets.js#L224-L238)). This supports the pilot's LMNL-Admin-only operating model.

### 6. Admin visibility and operational records — partial

- Admins can list tickets and send broadcasts through protected routes ([`api/[...route].js:544-556`](../../api/%5B...route%5D.js#L544-L556)). Ticket-holder collection is keyed to the event's tickets plus name-linked requests ([`api/_lib/repositories/tickets.js:126-181`](../../api/_lib/repositories/tickets.js#L126-L181)).
- Current operational reporting is ticket counts/activity rather than payment truth: `getSpaceTicketActivity` counts ticket rows, not completed payment amounts, fees, refunds, or disputes ([`api/_lib/services/space-activity.js:45-75`](../../api/_lib/services/space-activity.js#L45-L75)).
- Event matching may fall back to the latest event with the same name during fulfillment ([`api/_lib/services/webhook-fulfillment.js:364-372`](../../api/_lib/services/webhook-fulfillment.js#L364-L372)). Pilot events should use immutable event IDs/references end-to-end rather than name fallback.

### 7. Buyer disclosures, cancellation/refund, disputes, and settlement — absent, blocking gaps

- The ticket page has a risk/liability disclaimer only; it names an `event host`, which conflicts with the settled pilot model of an LMNL Admin and separate Settlement Recipient, and it is shown after issuance rather than captured at checkout ([`src/pages/Ticket.jsx:11-13`](../../src/pages/Ticket.jsx#L11-L13), [`src/pages/Ticket.jsx:175-179`](../../src/pages/Ticket.jsx#L175-L179)).
- Source searches found no buyer-facing policy for the all-in total, seller contact, final sale/no buyer refunds, cancellation trigger/full refund, age/accessibility/entry conditions, or affirmative pre-purchase acceptance/version capture. The hosted checkout configuration contains neither policy copy nor a record of acceptance ([`api/_lib/services/checkout.js:360-365`](../../api/_lib/services/checkout.js#L360-L365)).
- No refund/cancellation/chargeback/dispute/settlement/reconciliation entity or Square refund/dispute call appears in `api/`, `src/`, `sql/`, or tests. Existing event status has no cancellation lifecycle. This is a source-level absence, not proof that no manual Square action has ever been taken.
- Consequently there is no event-level record of completed payments, Square fees, refunds, disputes/chargebacks, the 10% LMNL Fee, Recipient Share, manual settlement due date/payment reference, post-settlement chargeback recovery, approver, or signed Pilot Event Agreement. These must be modeled before a ticket can be responsibly reconciled against Square's gross reporting and the pilot's five-business-day settlement promise.

## Required work before Pilot Event sales open

1. **Clear the narrow external no-sales gates first.** Obtain Square's seller-structure answer, a short Washington legal confirmation for this arrangement, and one event-specific answer for whether tax applies. This casual pilot does not require a tax system or broad marketplace analysis.
2. **Create an immutable Pilot Event configuration and sales lifecycle.** Include disclosed LMNL seller/contact, Settlement Recipient reference, agreement/version, all-in total, the one event-level tax setting, fixed capacity, date/venue, fixed 10% fee, and sales-open/cancelled states. Prevent material edits after sales open except a documented cancellation flow.
3. **Make capacity authoritative.** Atomically reserve one admission before creating/authorizing payment, release it on an expired/failed checkout, and reject sold-out purchases. Decide whether Square inventory is the authority or is reconciled to an LMNL-held reservation ledger; do not rely on a display poll.
4. **Add buyer terms and evidence.** Display and record the exact policy/version accepted before payment: LMNL seller/contact, all-in total, final-sale rule, full refund only on Pilot Event Cancellation, date/time/address, capacity/GA/access constraints, and cancellation communication path.
5. **Build cancellation/refund/dispute controls.** Cancellation must stop sales, identify issued admissions, issue/record Square refunds, revoke tickets, deliver buyer notices, retain proof, and prevent any Recipient Settlement. A dispute/chargeback must create an evidence/recovery record and be reflected in the settlement model.
6. **Build the financial record and reconciliation packet.** Import or record Square payment/refund/dispute/fee evidence, carry any Square-collected tax as a separate amount, calculate the fixed 10% LMNL Fee and Recipient Share, and retain reviewer, payment method/date/reference, and recovery balance. No tax subsystem is needed for this pilot.
7. **Harden operational recovery and privacy.** Persist webhook receipt/outcome and a retryable fulfillment job; supply an admin reconciliation/retry screen; use immutable event IDs for matching; verify buyer ticket access controls; test the deployed webhook, email, Wallet configuration, and migration state with a nonproduction transaction.

## Verification performed

- Static source inventory: `rg --files src api shared sql tests scripts public | sort`
- Ticketing/control-flow search: `rg -n -i -C 3 'event-checkout|checkout-success|webhook|ticket|attendance|check.?in|ticket-holder|passkit|refund|cancel|chargeback|idempot|settlement|reconcile|audit|capacity|buyer|terms|policy' api src sql tests`
- Targeted source reads of routes, checkout, fulfillment, tickets, repositories, event/admin UI, Space UI, Wallet, SQL migrations, and existing test files.
- No live Square, Supabase, Vercel, Resend, deployed-route, or production-database mutation/query was performed.

## Limits

The repository contains only migration scripts for certain tables, not a full current database schema dump, and the current production configuration was not queried. Confirm applied SQL/RLS, webhook delivery, Square inventory behavior, credentials, and deployed buyer flow during the readiness work. Square's seller-structure answer and the narrow event-specific legal/tax confirmations remain external launch gates.
