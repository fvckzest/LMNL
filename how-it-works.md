# LMNL Bespoke Ticketing System: How It Works

This document explains the architecture and logic of the LMNL ticketing system. It serves as a guide for developers, AI agents, and project stakeholders.

## 1. Core Concept
LMNL uses a "Headless" ticketing system. We use **Square** for payments, a custom **Database (Supabase)** for security and record-keeping, and **Apple Wallet** for a premium digital-first user experience.

---

## 2. The Two Event Flows

### A. Public Events (Direct Purchase)
1.  **Selection:** User picks a ticket on the LMNL website.
2.  **Payment:** User pays via a Square Checkout link.
3.  **Fulfillment:** After payment, an automated email sends them a link to their digital ticket.
4.  **Wallet:** User clicks "Add to Apple Wallet" on their phone.

### B. Private Events (Request & Approval)
1.  **Request:** User submits an interest form (Email/Name) on the LMNL website.
2.  **Verification:** The admin (you) reviews the request in the Supabase dashboard.
3.  **Approval:** When the admin marks the request as "Approved," the system automatically emails the user a **secret Square payment link**.
4.  **Completion:** Once they pay via that secret link, they receive their digital ticket.

---

## 3. The Technical "Brain" (The Database)
The database is the most important part of the system. It handles things that Square and Apple Wallet cannot do on their own:

| Database Table | Purpose |
| :--- | :--- |
| `Requests` | Stores emails of people asking to attend private events. |
| `Tickets` | Stores the unique ID for every sold ticket. |
| `Validation` | Tracks if a ticket has been scanned at the door (to prevent double-entry). |

---

## 4. The Data Journey
Here is how information moves through the system:

1.  **The Trigger:** A purchase is made in **Square**.
2.  **The Bridge:** Square sends a notification (Webhook) to our **Backend** (Vercel).
3.  **The Record:** The Backend creates a unique "Serial Number" and saves it in our **Database**.
4.  **The Pass:** The Backend packages that Serial Number into a beautiful **Apple Wallet (.pkpass)** file.
5.  **The Scan:** At the event, staff scan the QR code. The system checks the **Database** to see if that ID is valid and hasn't been used yet.

---

## 5. Security Principles
- **No Manual Entry:** Tickets are only valid if they exist in our database with a "Paid" status.
- **One Scan Per ID:** Once a ticket is scanned, the database marks it as "Used." Any further attempts to scan the same ID will show a red warning.
- **Secure Links:** Private event links are generated specifically for the approved user.

---

## 6. Project Tech Stack
- **Payments:** [Square](https://squareup.com/) (using Checkout API)
- **Backend:** [Vercel Serverless (Node.js)](https://vercel.com/)
- **Database:** [Supabase](https://supabase.com/) (initialized in `src/lib/supabase.js`)
- **Frontend Environment:** [Vite](https://vitejs.dev/) (using `VITE_` prefixed variables)
- **Mobile Pass:** [Apple Wallet / PassKit](https://developer.apple.com/wallet/)
- **Email:** Postmark or SendGrid

---

## 7. Current Implementation Progress
- [x] Square & Supabase accounts linked.
- [x] Database schema created.
- [x] Supabase client initialized in `src/lib/supabase.js`.
- [x] "Request Invite" form implemented on the **Space** page.
- [ ] Admin approval flow.
- [ ] Square Checkout integration for approved users.
- [ ] Apple Wallet pass generation.
