# LMNL Bespoke Ticketing System: How It Works

This document explains the architecture and logic of the LMNL ticketing system. It serves as a guide for developers, AI agents, and project stakeholders.

---

## 1. Core Concept
LMNL uses a "Headless" ticketing system. We use **Square** for payments, **Supabase** for database-backed management, and **Apple Wallet** for the digital ticket experience.

---

## 2. The Two Event Flows

### A. Public Events (Direct Purchase)
1.  **Selection:** User picks a ticket on the LMNL website.
2.  **Stock Check:** The system checks Square's real-time inventory via `api/check-inventory.js`.
3.  **Payment:** If in stock, user pays via a Square Checkout link.
4.  **Fulfillment:** After payment, an automated email sends them a link to their digital ticket.

### B. Private Events (Request & Approval)
1.  **Request:** User submits an interest form on the LMNL website.
2.  **Verification:** The admin reviews the request in the **Custom Admin Dashboard** (`/admin`).
3.  **Approval:** When the admin clicks "Approve," the system:
    - Fetches the linked **Square Catalog Item** (Variation ID).
    - Generates a **Square Order Checkout Link** (this ensures stock is deducted upon payment).
    - Emails the user the secret payment link via **Resend**.
4.  **Completion:** Once they pay, the ticket is generated.

---

## 3. Inventory Management (The Square Bridge)
The system is deeply integrated with **Square Catalog** to prevent overselling.

- **Catalog Linking:** Each event in LMNL is linked to a specific **Square Item Variation**.
- **Automated Stock:** When linked, the system uses Square's "Orders API." This forces Square to automatically decrement inventory counts at the moment of payment.
- **Sold Out Logic:** The `SpaceLandingPage` checks inventory levels on-the-fly. If stock hits `0`, the "Request Invite" button is replaced with a "SOLD OUT" badge automatically.

---

## 4. The Technical "Brain" (The Database)
The database (Supabase) handles the "headless" state and event metadata.

| Database Table | Purpose |
| :--- | :--- |
| `events` | Stores event metadata (title, date, address, capacity, Square Variation ID). |
| `requests` | Stores emails/names of people asking to attend private events. |
| `tickets` | Stores the unique ID for every sold ticket and scan status. |

---

## 5. Security Principles
- **No Manual Entry:** Tickets are only valid if they exist in our database with a "Paid" status.
- **One Scan Per ID:** Once a ticket is scanned, the database marks it as "Used." Any further attempts to scan the same ID will show a warning.
- **Secure Links:** Private event links are generated specifically for approved users and expire once paid.

---

## 6. Project Tech Stack
- **Payments:** [Square SDK v44](https://squareup.com/) (Catalog, Orders, & Checkout APIs)
- **Backend:** [Vercel Serverless (Node.js)](https://vercel.com/)
- **Database:** [Supabase](https://supabase.com/)
- **Frontend:** [React + Vite](https://vitejs.dev/)
- **Email:** [Resend](https://resend.com/)
- **Mobile Pass:** [Apple Wallet / PassKit](https://developer.apple.com/wallet/)

---

## 7. Current Implementation Progress
- [x] Square & Supabase accounts linked.
- [x] Database schema & migrations for rich event data.
- [x] **Request Invite** system (Frontend + API).
- [x] **Admin Dashboard** (`/admin`) for request and event management.
- [x] **Square Catalog Integration** (Linking events to real items).
- [x] **Automated Stock Tracking** (Square Order flow).
- [x] **Real-time Inventory Bridge** (Automatic "Sold Out" status).
- [x] **Apple Wallet (.pkpass)** generation backend.
- [ ] **QR Scanning UI** (Excluded from current scope per user instructions).
