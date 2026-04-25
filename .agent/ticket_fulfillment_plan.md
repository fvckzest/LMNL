# Implementation Plan: Ticket Order Fulfillment & Apple Wallet Support

This plan bridges the payment stage with automatic ticket generation, database tracking, and a digital Apple Wallet pass experience.

---

## 📋 Phase 1: Database Extension (`tickets` table)

Create a `tickets` table in Supabase to hold scanned state and link attendees back to events.

### Schema Design
```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
  square_order_id VARCHAR(255),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  qr_code_payload VARCHAR(255) UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## ⚡ Phase 2: Square Webhook Integration

Intercept payment successes autonomously without requiring user redirection.

### Setup `api/square-webhook.js`
1. Configure a Square App Webhook listening for `order.updated`.
2. Capture successful transactions where `state` moves to `COMPLETED`.
3. **Payload Lookup:** Match the `line_items` variation ID against `events.square_variation_id`.

---

## 🎫 Phase 3: Apple Wallet (.pkpass) Generation

Passes require cryptographic signatures compiled via strict standards.

### Prerequisites
1. **Apple Developer Account.**
2. **Pass Type ID Certificate** mapped to `pass.art.lmnl`.
3. A `.p12` private key export to secure signing algorithms.

### Engine Design (`api/generate-pass.js`)
Utilize a package like `passkit-generator` inside serverless environments:

```javascript
import { PKPass } from 'passkit-generator';

export async function createApplePass(ticket, event) {
  const pass = new PKPass();
  
  // Load assets: icon, logo, background
  pass.primaryFields.add({ key: 'event', label: 'EVENT', value: event.name });
  pass.secondaryFields.add({ key: 'gate', label: 'LOCATION', value: event.location_name });
  
  // Configure QR / Aztec format scanning
  pass.barcodes.add({
    format: 'PKBarcodeFormatQR',
    message: ticket.qr_code_payload,
    messageEncoding: 'iso-8859-1'
  });

  return await pass.asBuffer();
}
```

---

## 📩 Phase 4: Automatic Delivery & Verification

Combining everything dynamically.

1. **The Engine:** The fulfillment function executes automatically upon a verified webhook event.
2. **The Dispatch:** Resend fires an HTML confirmation dispatch.
   - Attaches `.pkpass` natively.
   - Generates backup embedded static QR links safely.

### 🚶 Verification Flow (Scanning UI)
Build an internal protected PWA route (`/scan`) using standard web APIs (`jsQR` / camera hooks) allowing staff access to flip the `is_used` flag cleanly.

---

## 🌐 Phase 5: Web-Based Fallback (Android / Cross-Platform)

To guarantee access for non-Apple users, the ticketing pipeline offers responsive web endpoints.

### 📱 The Digital Ticket Hub (`/ticket/[ticket-id]`)
Every ticket dispatch bundles a generic access link.
- **Dynamic Render:** Reads database state to construct matching SVG vectors on-the-fly using frontend libraries like `qrcode.react`.
- **Progressive Upgrades:** Includes a standard "Add to Apple Wallet" UI prompt natively conditionally showing up on iOS client queries.

