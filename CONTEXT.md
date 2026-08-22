# LMNL.art Operating Language

## Identity and access

**HP-OS Sign-In Contract**:
The shared authentication contract owned by HP-OS and used by LMNL.art. Its initial methods are passwordless passkeys and verified email links. Google, Discord, Apple, and other identity-provider methods may be added later as approved methods within this same contract; they are not LMNL-specific authentication exceptions.
_Avoid_: Separate LMNL login system, social-login exception

**LMNL Membership**:
The LMNL-specific membership, profile, consent, and history boundary associated with a Person. It is distinct from shared sign-in and does not grant operator authority.
_Avoid_: Shared account, operator role

**LMNL Community Foundation**:
The initial community scope: LMNL Membership, a private member/artist profile, attendance history, and consented public event or community credits. It does not include a public member directory, collectibles, mutual links, access unlocks, rewards, points, internal currency, or crypto provenance; those require separate later product decisions.
_Avoid_: Social network, public artist directory by default

**LMNL Contribution**:
A voluntary monetary contribution to LMNL. It is a canonical money and finance outcome supported by Square payment evidence, but does not issue a ticket, Product, Membership entitlement, access right, reward, or other benefit unless a separately defined program explicitly does so.
_Avoid_: Ticket purchase, Product purchase, implicit membership payment

**LMNL Communications Consent**:
A person's explicit, revocable permission to receive LMNL marketing communications. It may exist without LMNL Membership and is distinct from authentication, event notices, purchase notices, and other transactional communications.
_Avoid_: Sign-in consent, ticket permission, implied marketing consent

## Managed ticketing

**LMNL Admin**:
A trusted LMNL operator with broad authority over LMNL's administrative systems. Admin authority does not by itself create a right to ticket revenue.
_Avoid_: Event Host, member, ticketing customer

**Settlement Recipient**:
The person named in a Pilot Event agreement as entitled to the Recipient Share. The first Settlement Recipient is also an LMNL Admin, but the financial designation and administrative authority remain distinct.
_Avoid_: Event Host role, merchant, payout account

**LMNL Managed Ticketing**:
An invite-only service in which LMNL creates the listing, operates ticket sales and ticket-holder workflows, supports check-in, handles cancellation refunds, and completes Recipient Settlement. During the pilot, a trusted LMNL Admin operates the event through the existing LMNL CRUD; there is no Event Host role or open self-service ticketing marketplace. The new Pilot Event Sales Page and Ticket Reservation flow applies to public events only; private events retain the separate Access Request, LMNL approval, Square checkout, and ticket workflow.
_Avoid_: Ticketing SaaS, public marketplace, self-service host platform

**Pilot Event Sales Page**:
The dedicated, permanent, shareable LMNL event page at `/events/:slug` that serves as the canonical buyer entry point for a Pilot Event. LMNL's Events and Space surfaces, the organizer, the venue, social posts, QR codes, and direct messages all link to this page rather than creating or sharing their own checkout. It uses LMNL's site structure and checkout trust while foregrounding event-specific art and details, a small “Ticketing by LMNL” mark, and an optional organizer credit. It is the only public surface that creates a Ticket Reservation and fresh Square checkout while preserving LMNL's event and order correlation; Square remains the payment surface. Its readable slug is fixed once sales open even if the displayed event name later changes. At zero availability it remains visible, replaces checkout with `SOLD OUT`, and provides no pilot waitlist; expired Ticket Reservations can reopen availability.
_Avoid_: Reused Square payment link, Space-only checkout, organizer-hosted checkout

**Ticket Purchase Intent**:
The durable LMNL record for one buyer-submitted public ticket purchase attempt. It owns the buyer, Pilot Event, quantity, and agreed price while correlating one Ticket Reservation and one Square order; duplicate submission or network retries reuse it, while purchasing again after expiry creates a new intent.
_Avoid_: Access Request, checkout click, completed payment, issued ticket

**Public Ticket Order**:
One paid sale for a public Pilot Event, created only after LMNL verifies a completed Square payment against its Ticket Purchase Intent. A buyer may purchase one to eight tickets, limited by remaining capacity, and the order produces that number of individually identifiable LMNL Tickets.
_Avoid_: One QR admitting a group, one Square order per guest, named guest roster

**Ticket Reservation**:
An atomic 15-minute hold on a requested ticket quantity created by LMNL before Square checkout. At its cutoff, LMNL retains the hold until Square confirms either completed payment or cancellation of the unpaid checkout; payment converts it and confirmed cancellation releases it.
_Avoid_: Display-only inventory, permanent unpaid hold, browser-side capacity check

**LMNL Ticket**:
One independently shareable and one-time-scannable admission entitlement belonging to a Public Ticket Order. Every purchased unit receives its own LMNL Ticket; issuance is complete when all ordered tickets exist, regardless of whether email or Wallet delivery has succeeded.
_Avoid_: Group QR, email message, Square receipt, reservation

**Ticketing Exception**:
A public ticket purchase whose Square payment, checkout-expiration, or fulfillment facts cannot yet be reconciled safely. It retains its capacity and requires LMNL Admin attention instead of silently releasing inventory, issuing unsupported tickets, or creating another charge.
_Avoid_: Failed payment, ordinary delay, sold-out state

**Ticket Confirmation Page**:
The LMNL page to which Square returns a buyer after checkout. It uses the Ticket Purchase Intent to show truthful payment and fulfillment progress, displays the issued ticket when ready, and provides recovery when Square's webhook or ticket delivery is delayed.
_Avoid_: Generic success message, Square receipt as ticket, dead-end redirect

**Recipient Share**:
Net Ticket Revenue minus the LMNL Fee. It is an amount payable by LMNL to the Settlement Recipient, not LMNL revenue.
_Avoid_: Profit split, informal transfer, recipient revenue held by Square

**LMNL Fee**:
The event-specific percentage of Net Ticket Revenue earned by LMNL for providing LMNL Managed Ticketing. It is 10% for the first Pilot Event, is fixed before that event's sales open, and may differ for later events under a new agreement.
_Avoid_: Tip, donation, payment-processing fee

**Net Ticket Revenue**:
Completed ticket payments minus refunds, chargebacks, and payment-processing fees. It is the amount divided into the LMNL Fee and Recipient Share.
_Avoid_: Gross sales, checkout total, profit

**Recipient Settlement**:
The manually calculated and manually paid Recipient Share, due within five business days after the event ends. For the Pilot Event, LMNL handles and records this outside the automated ticketing product.
_Avoid_: Casual payout, revenue transfer, instant split

**Pilot Event Cancellation**:
Cancellation of a Pilot Event after ticket sales open. LMNL fully refunds ticket buyers, earns no LMNL Fee on refunded sales, pays no Recipient Settlement, and the Settlement Recipient owes any direct payment-processing costs that are not returned to LMNL.
_Avoid_: Buyer refund, postponement, settlement adjustment

**Pilot Event**:
A paid, in-person Washington State event approved for LMNL Managed Ticketing, with one date, one venue, one USD general-admission ticket price, and a fixed sales capacity. A public Pilot Event allows a buyer to purchase multiple general-admission tickets in one checkout. Its date and venue are fixed once ticket sales open; inability to honor either is a Pilot Event Cancellation. Online or out-of-state events, other currencies, reserved seating, ticket tiers, subscriptions, season passes, resale, rescheduling, and revenue splitting among multiple Settlement Recipients are outside the managed pilot.
_Avoid_: Listing, booking, multi-tier event

**Buyer Refund Policy**:
The managed pilot's rule that ticket sales are final and buyer-requested refunds are not offered. A buyer receives a full refund only when the Pilot Event is cancelled.
_Avoid_: Refund window, discretionary refund, host-specific refund policy

**All-In Ticket Price**:
The complete amount advertised to and charged to a ticket buyer, fixed for a Pilot Event when sales open. Payment-processing costs and the LMNL Fee are accounted for within that amount rather than added as a separate buyer-facing service fee.
_Avoid_: Base price, price before fees, checkout fee

**Pilot Event Agreement**:
The plain-language agreement fixed before a Pilot Event's ticket sales open. It names the event, capacity, Settlement Recipient, LMNL Fee, settlement formula and timing, refund and cancellation rules, chargeback responsibility, and each party's operational responsibilities.
_Avoid_: Informal understanding, platform terms, editable event settings
