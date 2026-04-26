# LMNL

LMNL is a modern, premium web platform designed for art and experience spaces. It combines a visually striking frontend with a robust backend architecture to handle event management, service booking, and automated digital ticketing.

## Key Features

- **Immersive Frontend**: A highly aesthetic, dark-mode optimized user interface built for modern browsers.
- **Dynamic Event Space**: Showcase upcoming events, services, and community initiatives.
- **Automated Ticketing Pipeline**:
  - **Square Integration**: Seamless order tracking and inventory management.
  - **Digital Fulfillment**: Automatic generation of secure QR-coded tickets upon purchase.
  - **Apple Wallet Support**: Generates `.pkpass` files for integration with Apple Wallet.
  - **Email Delivery**: Automated confirmation emails via Resend with ticket links and attachments.
- **Admin Dashboard**: A protected interface (accessible via `admin.` subdomain or localhost) for managing events, tickets, and fulfillment requests.
- **SEO Optimized**: Custom post-build scripts generate static Open Graph metadata for all routes.

## Tech Stack

- **Frontend**: React 19, Vite, React Router DOM, Vanilla CSS.
- **Backend**: Vercel Serverless Functions (Node.js).
- **Database**: Supabase.
- **Services**: 
  - [Square](https://squareup.com/) (Payments & Catalog)
  - [Resend](https://resend.com/) (Email Delivery)
  - [PassKit](https://github.com/alexandremartins/passkit-generator) (Apple Wallet Passes)

## Environment Variables

Create a `.env` file in the root directory with the following configurations:

### Frontend (`.env`)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend / Vercel
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature
SITE_URL=your_production_url
RESEND_API_KEY=your_resend_api_key
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
*Note: Admin functionality is enabled by default on `localhost` or when accessed via the `admin.` subdomain.*

### 3. Build for Production
```bash
npm run build
```
*This builds the Vite application and runs `scripts/postbuild.js` to generate SEO-optimized route endpoints.*

## Project Structure

- `src/`: React components, pages, and application logic.
  - `pages/`: Core views (Home, Space, Admin, Ticket Viewer, etc.).
  - `components/`: Reusable UI elements.
- `api/`: Vercel serverless functions for webhook handling and ticket generation.
- `scripts/`: Build utilities (e.g., SEO generation).
