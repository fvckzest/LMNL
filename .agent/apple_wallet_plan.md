# 🎫 Apple Wallet Tickets Integration — Implementation Plan

This plan outlines the steps required to build, digitally sign, and attach Apple Wallet `.pkpass` files for automated ticket delivery within the LMNL checkout workflow.

---

## 📋 1. Prerequisites & Environment Setup

Apple Wallet pass compilation requires secure credentials.

| Variable | Purpose | Status |
| :--- | :--- | :--- |
| `APPLE_PASS_TYPE_IDENTIFIER` | Registered Pass ID (e.g. `pass.art.lmnl`) | Needs configuration in [.env](file:///Users/zestgxd/Documents/WEB-DEV/LMNL/.env) |
| `APPLE_TEAM_ID` | Apple Developer Team ID | Needs configuration in [.env](file:///Users/zestgxd/Documents/WEB-DEV/LMNL/.env) |
| `APPLE_PASS_CERTIFICATE` | Base64 encoded certificate data | Needs configuration in [.env](file:///Users/zestgxd/Documents/WEB-DEV/LMNL/.env) |

> [!IMPORTANT]
> **Pass Format Requirements:**
> The standard generator library `passkit-generator` expects separate `.pem` strings (Signer Certificate, Private Key, and Apple WWDR Certificate).
> *   **Action Required:** Either parse the `.p12` base64 payload dynamically using `node-forge` to yield required keys, or extract PEM blocks prior to injection.

---

## 🏗️ 2. Template Scaffolding (`api/_lib/pass-model/`)

Establishing persistent visual guidelines:
*   `pass.json`: Defines branding, entry times, text headers, and barcode algorithms.
*   `icon.png`, `logo.png`, `strip.png`: Branded image dimensions adhering to strict layout specs.

## 💻 3. Development Milestones

### Phase A: Generating the Stream (`api/generate-pass.js`)
Create an endpoint taking a secure UUID to map data.
1. Resolve attendee metadata via Supabase checks.
2. Insert parameters directly into standard formatting structures.
3. Route raw buffers with the content-type `application/vnd.apple.pkpass`.

### Phase B: Event Bindings & Deliverables
*   **Resend Updates:** Update [api/square-webhook.js](file:///Users/zestgxd/Documents/WEB-DEV/LMNL/api/square-webhook.js) triggers.
*   **Web UX Prompts:** Render convenient fallback links.

---

## 🧪 4. Testing Procedures
1. **Validations:** Assert consistency against standard cryptographic guidelines.
2. **Real Scans:** Complete functional sweeps at live gateways.

---

## 🚀 5. Completed Work (Pending Apple Approval)
We have achieved full offline readiness. The following components are fully implemented:
*   **Template Scaffold:** Created [pass.json](file:///Users/zestgxd/Documents/WEB-DEV/LMNL/api/_lib/LMNL.pass/pass.json).
*   **Execution Helper:** Created [generate-pass-helper.js](file:///Users/zestgxd/Documents/WEB-DEV/LMNL/api/_lib/generate-pass-helper.js).

---

## 📋 6. Next Steps for the Next Instance
1. Assign required variables within your active profiles securely.
2. Validate deployments accordingly.
