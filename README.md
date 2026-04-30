# LMNL

LMNL is a premium, high-contrast web platform designed for art and experience spaces. It features a minimalist "white and clean" aesthetic, focusing on precise typography, geometric layout, and automated event orchestration.

## 1. Core Architecture

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Vanilla CSS (High-contrast white background, black structural elements)
- **Typography**: [Gantari](https://fonts.google.com/specimen/Gantari) (Geometric Sans-Serif)
- **Routing**: React Router DOM (v7+)
- **SEO**: Custom `postbuild.js` script that parses routes and generates static Open Graph metadata.

### Backend & Infrastructure
- **Hosting**: Vercel (Serverless Functions)
- **Database**: Supabase (PostgreSQL + Auth + Real-time)
- **Email**: Resend (Automated ticketing and confirmation)
- **Payments & Catalog**: Square (API-driven inventory and checkout)
- **Ticketing**: 
  - `passkit-generator`: Apple Wallet (`.pkpass`) fulfillment
  - `pdfkit` & `qrcode`: Secure digital ticket generation

---

## 2. Key Features

### The "SPACE" Manifestation
- **System Diagnostics**: Real-time tracking of project "nodes" (Sound, Form, Energy, Atmosphere).
- **Occupancy Engine**: Syncs with Square inventory to show live availability and "Sold Out" states.
- **Access Pipeline**: "Request Invite" flow for managed entry to private events.

### Automated Ticketing Pipeline
1. **Square Webhook**: Listens for successful orders.
2. **Generation**: Serverless function generates a secure QR-coded PDF and an Apple Wallet pass.
3. **Fulfillment**: Automated email delivery via Resend with attachments.

### Admin Dashboard
Protected interface for managing:
- Event metadata and capacities.
- Ticket fulfillment requests.
- System diagnostic percentages.

---

## 3. Environment Variables

Create a `.env` file in the root directory. **Ensure these match your Supabase and Square production settings.**

### Frontend
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend (Vercel)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature
SITE_URL=https://lmnl.space (or your domain)
RESEND_API_KEY=your_resend_api_key
```

---

## 4. Development & Build

### Installation
```bash
npm install
```

### Local Development
```bash
npm run dev
```
*Note: Admin functionality is accessible on `localhost` by default.*

### Production Build
```bash
npm run build
```
*This command runs `vite build` followed by `node scripts/postbuild.js` to ensure SEO metadata is correctly generated for all routes.*

---

## 5. Project Structure

- `api/`: Vercel Serverless Functions (webhooks, inventory checks).
- `scripts/`: Build-time utilities (SEO generation).
- `src/`:
  - `pages/`: Core views (Home, Space, Events, Community, Admin).
  - `components/`: Modular UI elements (Circle, Logo, HeaderBar).
  - `lib/`: Configuration for external services (Supabase client).
  - `utils/`: Constants, asset mapping, and formatting helpers.
- `public/`: Static assets and PWA manifests.
