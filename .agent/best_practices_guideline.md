# Implementation Blueprint: Production Best Practices

Executing fulfillment integrations requires strict operational standards.

---

## 🔒 1. Cryptographic Security & Anti-Counterfeiting
*   **Token Generation:** QR content payloads must derive from high-entropy mechanisms (avoid relying purely on predictable IDs). 
*   **Signatures:** Webhook verification triggers execute `crypto.createHmac('sha256', webhookSecret)` against `X-Square-Signature` standards natively.

---

## ⚙️ 2. Robust Webhook Logic & Idempotency
*   **Duplicate Resilience:** Track transactional events effectively inside caching instances.
*   **State Mapping:** Handle delayed notifications via appropriate state-machine constraints.

---

## 📡 3. Offline Performance (Venue Resilience)
*   **Web Pass Capabilities:** Incorporate simple service worker logic mapped against asset manifests.
