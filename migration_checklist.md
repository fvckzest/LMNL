# LMNL Next.js Migration Checklist

Last updated: 2026-05-27

This file is the central handoff document for the LMNL migration. Future AI/coding sessions should be able to continue the migration by reading this file first. If this file conflicts with `migration_context.md`, `migration_context.md` wins.

## 1. Project summary

LMNL is a Tacoma, Washington art and culture platform site with public pages, events, shop/preorder flows, service/contact forms, a community app, and a private admin/check-in interface.

The current project is a Vite React single-page app deployed with Vercel-style serverless API files in `api/`. Client routing is handled by `react-router-dom`. Static SEO pages and `sitemap.xml` are generated after the Vite build by `scripts/postbuild.js`.

Current stack:
- Vite 8
- React 19
- React Router 7
- plain CSS files
- Vercel Functions under `api/`
- Supabase
- Square
- Resend
- Discord interactions/notifications
- Apple Wallet pass generation with `passkit-generator`
- QR/ticket support
- Vercel Analytics and Speed Insights
- Vite PWA plugin

Target stack:
- Next.js App Router
- React 19
- JavaScript, not TypeScript unless requested
- existing plain CSS preserved unless explicitly changed
- Next route handlers replacing or wrapping current Vercel API handlers
- Next metadata/sitemap behavior replacing Vite postbuild SEO generation

Migration philosophy:
- Preserve behavior first, then improve structure only where Next.js requires it.
- Move routes incrementally and verify parity after each small step.
- Prefer compatibility wrappers over rewrites during the migration.
- Treat the current API layer as fragile production infrastructure. Do not refactor, split, rename, or rewrite API handlers just to make the code look more "Next-like."
- Treat the current page aesthetics, CSS layouts, responsive behavior, and UI functionality as the desired product. The migration is not a redesign.
- Keep the existing Vite app runnable until the Next app has enough parity to replace it.
- Treat admin, checkout, webhook, ticket, and auth behavior as high-risk.

## 2. Migration objective

Success means:
- preserve LMNL visual identity
- preserve page aesthetics exactly unless a user explicitly requests a visual change
- preserve existing CSS layout behavior, including responsive layout behavior
- preserve page functionality and interaction behavior
- preserve layout behavior
- preserve all public and private URLs
- preserve API functionality and response shapes
- preserve Supabase reads and writes
- preserve Square checkout, inventory, payment, and webhook behavior
- preserve Resend email behavior
- preserve Discord interactions and notifications
- preserve admin functionality
- preserve community app login, onboarding, dashboard, profile routing, and auth callback behavior
- preserve ticket, QR, check-in, and Apple Wallet pass generation
- preserve SEO/social metadata parity, canonical URLs, robots rules, JSON-LD, and sitemap coverage
- avoid unnecessary redesign, TypeScript conversion, Tailwind conversion, or stack changes

## 3. Non-negotiable rules

- No redesign.
- No aesthetic changes unless the user explicitly requests them.
- No CSS layout changes unless they are the minimum required to make the same layout work in Next.js.
- No page interaction changes unless they are the minimum required to preserve current behavior in Next.js.
- Do not "modernize," simplify, restyle, reorganize, or polish pages as part of migration work.
- No TypeScript conversion unless the user explicitly requests it.
- No Tailwind conversion unless the user explicitly requests it.
- No business logic rewrites unless required by Next.js runtime differences.
- No database schema drift unless required and explicitly documented.
- Preserve current user-facing behavior.
- Preserve URL structure and redirects.
- Preserve current CSS and visual details.
- Preserve current component structure where practical, especially for complex pages where layout is already tuned.
- Preserve API contracts and JSON response shapes.
- Do not touch API business logic beyond the minimum adapter work required for the Next.js migration.
- Do not split the current API catch-all into many route handlers unless the migration is blocked without doing so.
- Do not rename endpoints, query parameters, request bodies, response fields, status codes, headers, or auth behavior.
- Do not change Square, Supabase, Resend, Discord, PassKit, ticket, webhook, or admin API logic unless a Next runtime incompatibility requires it and the change is documented here.
- Preserve auth and authorization behavior.
- Preserve integration credentials and environment variable meaning.
- Update this checklist before ending every migration session.

## 4. Route inventory

Format: old route | Next.js file path | status | notes

Public/site routes:

| Old route | Next.js file path | Status | Notes |
| --- | --- | --- | --- |
| `/` | `app/page.jsx` | pending | Public host renders `Home`; admin subdomain currently renders `Admin`. Needs host-aware handling. |
| `/home` | `app/home/page.jsx` | pending | Admin/local alternate public home route. Canonical currently points to `/`; noindex. |
| `/events` | `app/events/page.jsx` | pending | Uses `src/pages/Events.jsx`; public data and checkout links. |
| `/space` | `app/space/page.jsx` | pending | Uses `src/pages/Space.jsx`; request and event checkout flows. |
| `/about` | `app/about/page.jsx` | pending | Static/content route. |
| `/services` | `app/services/page.jsx` | pending | Service products and inquiry form. |
| `/portfolio` | `app/portfolio/page.jsx` | pending | Uses search params and public/admin portfolio API depending on view. |
| `/community` | `app/community/page.jsx` | pending | Public community page. |
| `/community/share` | `app/community/share/page.jsx` | pending | Artist interest form. |
| `/share-your-work` | `app/share-your-work/page.jsx` or redirect in `next.config.mjs`/middleware | pending | Redirects to `/community/share`; currently noindex canonical to `/community/share`. |
| `/shop` | `app/shop/page.jsx` | pending | Preorder checkout flow with search params. |
| `/blog` | `app/blog/page.jsx` | pending | Blog list. |
| `/blog/:slug` | `app/blog/[slug]/page.jsx` | pending | Dynamic blog post route. |
| `/contact` | `app/contact/page.jsx` | pending | Contact/service inquiry form. |
| `/intake` | `app/intake/page.jsx` | pending | Private/noindex website intake route. |
| `/prsm` | `app/prsm/page.jsx` | pending | Currently `GenericPage` with title `PRSM`. |
| `/ticket/:ticketId` | `app/ticket/[ticketId]/page.jsx` | pending | Ticket lookup, QR, Apple Wallet pass link; noindex. |
| `/success` | `app/success/page.jsx` | pending | Checkout confirmation; reads query params; noindex. |

Admin/host-aware routes:

| Old route | Next.js file path | Status | Notes |
| --- | --- | --- | --- |
| `/` on `admin.*` or local admin mode | `app/page.jsx` plus host-aware gate, or route group/middleware | pending | Current `App.jsx` renders admin at root when hostname is local or starts with `admin.`. Must preserve. |
| `/admin` on public host | redirect to `/` | pending | Current public host redirects `/admin` to `/`. |
| `/login` on admin/local | `app/login/page.jsx` | pending | Supabase admin login route. Public host redirects `/login` to `/`. |
| `/check-in/:token` on admin/local | `app/check-in/[token]/page.jsx` | pending | Protected admin route. |
| `/email-lab` on local only | `app/email-lab/page.jsx` | pending | Local-only route. Do not expose in production. |

Community app/auth routes:

| Old route | Next.js file path | Status | Notes |
| --- | --- | --- | --- |
| `/auth/callback` | `app/auth/callback/page.jsx` | pending | Supabase auth callback. Public host allowed; admin host only local/community enabled. |
| `/app/login` | `app/app/login/page.jsx` | pending | Built by `buildCommunityLoginPath(COMMUNITY_APP_PATH)`. |
| `/app` | `app/app/page.jsx` | pending | Protected community app entry; redirects to dashboard/onboarding. |
| `/app/onboarding` | `app/app/onboarding/page.jsx` | pending | Allows incomplete community profile. |
| `/community/u/:userSlug` | `app/community/u/[userSlug]/page.jsx` | pending | Protected user dashboard/profile route. |

Fallback:

| Old route | Next.js file path | Status | Notes |
| --- | --- | --- | --- |
| `*` | `app/not-found.jsx` or middleware redirect | pending | Current SPA redirects all unknown routes to `/`. Decide whether to preserve redirect exactly or use Next 404 only if requested. |

## 5. API inventory

Format: old endpoint | new endpoint | method | purpose | status | notes

All current API endpoints are routed through `api/[...route].js`, except `api/discord-interactions.js`, which is also imported by the catch-all route. Next.js can first preserve this catch-all behavior with `app/api/[...route]/route.js`, then split endpoints later only if useful.

API migration guardrail:
- APIs are high-risk and should remain as untouched as possible.
- The preferred migration path is a thin Next.js adapter around the existing handlers/services, preserving current endpoint names and behavior.
- Avoid rewriting service/repository files in `api/_lib/`.
- Avoid changing webhook handling except for the minimum raw-body adapter work required by Next.js.
- Avoid changing auth helpers except for the minimum request/response adapter work required by Next.js.
- Any API change must include a checklist log entry naming why it was required, which endpoints were affected, and what tests/manual checks were run.
- Before changing any API implementation, run or identify the relevant existing tests in `tests/`, especially `tests/api-router.test.js`, `tests/webhook-fulfillment.test.js`, `tests/auth.test.js`, `tests/checkout*.test.js`, `tests/event-checkout.test.js`, `tests/request-checkout.test.js`, `tests/preorder-checkout.test.js`, `tests/tickets.test.js`, `tests/passkit*.test.js`, `tests/discord*.test.js`, and `tests/env.test.js`.

| Old endpoint | New endpoint | Method | Purpose | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/api/check-inventory` | `app/api/check-inventory/route.js` or catch-all | GET | Square variation inventory | pending | Public inventory read. |
| `/api/confirm-ticket` | `app/api/confirm-ticket/route.js` or catch-all | GET, POST | Confirm/reconcile ticket by request or ticket id | pending | Used by success/admin flows. |
| `/api/create-checkout` | `app/api/create-checkout/route.js` or catch-all | POST | Square checkout for preorder | pending | Shop checkout. |
| `/api/create-event-checkout` | `app/api/create-event-checkout/route.js` or catch-all | POST | Square checkout for event | pending | Space/events flow. |
| `/api/create-request-checkout` | `app/api/create-request-checkout/route.js` or catch-all | POST | Square checkout for approved request | pending | Request checkout flow. |
| `/api/app-dashboard` | `app/api/app-dashboard/route.js` or catch-all | GET | Community dashboard data | pending | Requires community auth. |
| `/api/attendance-claim` | `app/api/attendance-claim/route.js` or catch-all | POST | Claim attendance source for community user | pending | Requires community auth. |
| `/api/admin-attendance-attach` | `app/api/admin-attendance-attach/route.js` or catch-all | POST | Attach/create attendance sources | pending | Admin auth required. |
| `/api/admin-attendance-sources` | `app/api/admin-attendance-sources/route.js` or catch-all | GET | Admin attendance queue | pending | Admin auth required. |
| `/api/admin-runtime` | `app/api/admin-runtime/route.js` or catch-all | GET | Runtime/auth diagnostics | pending | Admin support endpoint. |
| `/api/event-stats` | `app/api/event-stats/route.js` or catch-all | GET | Approved request count by event name | pending | Query param `eventName`. |
| `/api/site-activity` | `app/api/site-activity/route.js` or catch-all | GET | Recent site activity | pending | Public route. |
| `/api/space-activity` | `app/api/space-activity/route.js` or catch-all | GET | Space ticket activity | pending | Public route. |
| `/api/event-checkout` | `app/api/event-checkout/route.js` or catch-all | GET | Event checkout view | pending | Query param `eventId`. |
| `/api/request-checkout` | `app/api/request-checkout/route.js` or catch-all | GET | Request checkout view | pending | Query param `requestId`. |
| `/api/pay-event` | `app/api/pay-event/route.js` or catch-all | POST | Square payment for event | pending | Direct payment flow. |
| `/api/pay-preorder` | `app/api/pay-preorder/route.js` or catch-all | POST | Square payment for preorder | pending | Direct payment flow. |
| `/api/pay-request` | `app/api/pay-request/route.js` or catch-all | POST | Square payment for request | pending | Direct payment flow. |
| `/api/create-test-item` | `app/api/create-test-item/route.js` or catch-all | POST | Create Square test catalog item | pending | Admin auth required. |
| `/api/enable-square-tracking` | `app/api/enable-square-tracking/route.js` or catch-all | POST | Enable Square inventory tracking | pending | Admin auth required. |
| `/api/events` | `app/api/events/route.js` or catch-all | GET, POST | Public/admin event list and admin mutations | pending | GET auth header changes public/admin behavior. |
| `/api/generate-pass` | `app/api/generate-pass/route.js` or catch-all | GET | Apple Wallet pass download | pending | Must preserve binary response headers. |
| `/api/preorder-checkout` | `app/api/preorder-checkout/route.js` or catch-all | GET | Preorder checkout view | pending | Query param `preorderId`. |
| `/api/get-ticket` | `app/api/get-ticket/route.js` or catch-all | GET | Ticket view | pending | Query param `ticketId`. |
| `/api/check-in-ticket` | `app/api/check-in-ticket/route.js` or catch-all | GET, POST | Ticket check-in lookup/confirm | pending | Admin auth required. |
| `/api/admin-session` | `app/api/admin-session/route.js` or catch-all | GET | Verify admin session | pending | Used by `ProtectedRoute`. |
| `/api/admin-tickets` | `app/api/admin-tickets/route.js` or catch-all | GET | Admin ticket list | pending | Admin auth required. |
| `/api/preorders` | `app/api/preorders/route.js` or catch-all | GET, POST | Admin preorder list/mutations | pending | Admin auth required. |
| `/api/requests` | `app/api/requests/route.js` or catch-all | GET, POST | Access requests | pending | Public create, admin approve/update/delete/archive. |
| `/api/artist-interest` | `app/api/artist-interest/route.js` or catch-all | GET, POST | Artist interest submissions | pending | Public create with Turnstile; admin list/update/delete. |
| `/api/blog-posts` | `app/api/blog-posts/route.js` or catch-all | GET, POST | Admin blog post CRUD | pending | Admin auth required. |
| `/api/portfolio` | `app/api/portfolio/route.js` or catch-all | GET, POST | Public portfolio and admin portfolio CRUD/generate preview | pending | `view=admin` requires auth. |
| `/api/community-businesses` | `app/api/community-businesses/route.js` or catch-all | GET, POST | Admin community business CRUD | pending | Admin auth required. |
| `/api/community-credits` | `app/api/community-credits/route.js` or catch-all | GET, POST | Admin community credits CRUD/sync | pending | Admin auth required. |
| `/api/mailing-list` | `app/api/mailing-list/route.js` or catch-all | GET, POST | Admin mailing list CRUD | pending | Admin auth required. |
| `/api/service-products` | `app/api/service-products/route.js` or catch-all | GET, POST | Public service products and admin mutations | pending | GET public, POST admin. |
| `/api/service-inquiries` | `app/api/service-inquiries/route.js` or catch-all | GET, POST | Service inquiry create/admin update/delete | pending | Public create with Turnstile; admin GET/mutations. |
| `/api/website-intake-submissions` | `app/api/website-intake-submissions/route.js` or catch-all | GET, POST | Admin website intake submissions | pending | Admin auth required. |
| `/api/square-catalog` | `app/api/square-catalog/route.js` or catch-all | GET | Admin Square catalog view | pending | Admin auth required. |
| `/api/discord-interactions` | `app/api/discord-interactions/route.js` or catch-all | GET, POST | Discord interaction verification/handling | pending | Requires raw body/signature preservation. |
| `/api/square-webhook` | `app/api/square-webhook/route.js` or catch-all | POST | Square order webhook fulfillment | pending | Requires raw body/signature preservation and exact webhook URL handling. |

## 6. Environment variable mapping

Format: old name -> new name | client/server | status | notes

| Old name -> new name | Client/server | Status | Notes |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` -> `NEXT_PUBLIC_SUPABASE_URL` | client | pending | Existing client files use `import.meta.env.VITE_SUPABASE_URL`. Add compatibility layer before page migration. |
| `VITE_SUPABASE_ANON_KEY` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | pending | Existing API env fallback also accepts `VITE_SUPABASE_ANON_KEY`; preserve during transition. |
| `VITE_TURNSTILE_SITE_KEY` -> `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | client | pending | Used by `src/lib/api.js`. |
| `SUPABASE_URL` -> `SUPABASE_URL` | server | pending | Required by API. |
| `SUPABASE_SERVICE_ROLE_KEY` -> `SUPABASE_SERVICE_ROLE_KEY` | server | pending | Used for admin Supabase client. |
| `SUPABASE_ANON_KEY` -> `SUPABASE_ANON_KEY` | server | pending | Server fallback if service role missing. |
| `SUPABASE_PORTFOLIO_BUCKET` -> `SUPABASE_PORTFOLIO_BUCKET` | server | pending | Portfolio preview storage bucket. |
| `PORTFOLIO_PREVIEW_TIMEOUT_MS` -> `PORTFOLIO_PREVIEW_TIMEOUT_MS` | server | pending | Playwright preview timeout. |
| `SITE_URL` -> `SITE_URL` | server | pending | Defaults to `https://lmnl.art`. |
| `SQUARE_WEBHOOK_URL` -> `SQUARE_WEBHOOK_URL` | server | pending | Defaults to `https://lmnl.art/api/square-webhook`; verify after route handler migration. |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` -> `SQUARE_WEBHOOK_SIGNATURE_KEY` | server | pending | Required for webhook verification. |
| `SQUARE_ENVIRONMENT` -> `SQUARE_ENVIRONMENT` | server | pending | `production` or sandbox fallback. |
| `SQUARE_ACCESS_TOKEN` -> `SQUARE_ACCESS_TOKEN` | server | pending | Sandbox token or fallback production token. |
| `SQUARE_PROD_ACCESS_TOKEN` -> `SQUARE_PROD_ACCESS_TOKEN` | server | pending | Production token override. |
| `SQUARE_APPLICATION_ID` -> `SQUARE_APPLICATION_ID` | server | pending | App ID fallback. |
| `SQUARE_SANDBOX_APPLICATION_ID` -> `SQUARE_SANDBOX_APPLICATION_ID` | server | pending | Sandbox App ID. |
| `SQUARE_PROD_APPLICATION_ID` -> `SQUARE_PROD_APPLICATION_ID` | server | pending | Production App ID. |
| `SQUARE_LOCATION_ID` -> `SQUARE_LOCATION_ID` | server | pending | Optional, can be discovered. |
| `RESEND_API_KEY` -> `RESEND_API_KEY` | server | pending | Required for email notifications. |
| `TURNSTILE_SECRET_KEY` -> `TURNSTILE_SECRET_KEY` | server | pending | Required for Turnstile verification. |
| `APPLE_PASS_TYPE_IDENTIFIER` -> `APPLE_PASS_TYPE_IDENTIFIER` | server | pending | PassKit config. |
| `APPLE_TEAM_ID` -> `APPLE_TEAM_ID` | server | pending | PassKit config. |
| `APPLE_PASS_CERTIFICATE` -> `APPLE_PASS_CERTIFICATE` | server | pending | Base64/string certificate source. |
| `APPLE_PASS_CERTIFICATE_PATH` -> `APPLE_PASS_CERTIFICATE_PATH` | server | pending | File certificate fallback. |
| `APPLE_PASS_CERTIFICATE_PASSWORD` -> `APPLE_PASS_CERTIFICATE_PASSWORD` | server | pending | PassKit password. |
| `ADMIN_AUTH_SOURCE` -> `ADMIN_AUTH_SOURCE` | server | pending | `auto`, `table`, or `env`. |
| `ADMIN_USER_IDS` -> `ADMIN_USER_IDS` | server | pending | CSV admin allowlist. |
| `ADMIN_USER_EMAILS` -> `ADMIN_USER_EMAILS` | server | pending | CSV admin allowlist. |
| `DISCORD_APPLICATION_ID` -> `DISCORD_APPLICATION_ID` | server | pending | Discord command/interaction config. |
| `DISCORD_BOT_TOKEN` -> `DISCORD_BOT_TOKEN` | server | pending | Discord API token. |
| `DISCORD_PUBLIC_KEY` -> `DISCORD_PUBLIC_KEY` | server | pending | Interaction signature verification. |
| `DISCORD_TICKET_CHANNEL_ID` -> `DISCORD_TICKET_CHANNEL_ID` | server | pending | Ticket notifications. |
| `DISCORD_INTAKE_CHANNEL_ID` -> `DISCORD_INTAKE_CHANNEL_ID` | server | pending | Intake notifications. |
| `COMMUNITY_AUTH_REDIRECT_TO` -> `COMMUNITY_AUTH_REDIRECT_TO` | script/server | pending | Used by `scripts/check-community-oauth.mjs`. |
| `NODE_ENV` -> `NODE_ENV` | server | pending | Runtime diagnostics. |
| `VERCEL_ENV` -> `VERCEL_ENV` | server | pending | Runtime diagnostics. |

## 7. Visual parity checklist

- [ ] Homepage parity
- [ ] Terminal shell parity
- [ ] Navigation parity
- [ ] Footer/sidebar/social link parity
- [ ] Typography parity
- [ ] Spacing parity
- [ ] Color/theme parity
- [ ] Responsive parity on mobile/tablet/desktop
- [ ] Animations/transitions parity
- [ ] Image rendering parity
- [ ] Form styling parity
- [ ] Button/link states parity
- [ ] Admin UI parity
- [ ] Community app UI parity
- [ ] Ticket/check-in UI parity
- [ ] Local-only email lab visibility parity

## 8. Functional parity checklist

- [ ] Supabase public reads
- [ ] Supabase admin reads
- [ ] Supabase writes
- [ ] Supabase auth/session handling
- [ ] Admin authorization
- [ ] Community auth/session handling
- [ ] Community onboarding gate
- [ ] Community dashboard/profile routing
- [ ] Form submissions
- [ ] Turnstile verification
- [ ] Resend email sending
- [ ] Discord notifications
- [ ] Discord interaction endpoint signature verification
- [ ] Square catalog reads
- [ ] Square inventory reads
- [ ] Square checkout creation
- [ ] Square direct payments
- [ ] Square webhook signature/fulfillment handling
- [ ] Ticket generation/reconciliation
- [ ] QR rendering
- [ ] Apple Wallet pass generation/download
- [ ] Admin tools
- [ ] Check-in lookup and confirmation
- [ ] Dynamic blog route rendering
- [ ] Dynamic ticket route rendering
- [ ] Dynamic community profile route rendering
- [ ] SEO metadata generation
- [ ] Sitemap generation
- [ ] PWA behavior or explicit replacement decision
- [ ] Vercel Analytics/Speed Insights parity

## 9. Completed work log

2026-05-27
session 1
- Read `migration_context.md`.
- Audited current repo structure, Vite entrypoints, route table, API catch-all, environment variables, SEO/postbuild behavior, CSS imports, and React Router usage.
- Created this handoff checklist before making migration changes.
- Added a minimal `next.config.mjs` scaffold with `reactStrictMode: true`. This is intentionally inert until Next dependencies/scripts are added and does not change the current Vite runtime.
- Added explicit API preservation guardrails at user request: API code should not be touched beyond the minimum adapter work required for the migration because endpoint breakage would be expensive to recover from.
- Added explicit page preservation guardrails at user request: aesthetics, CSS layouts, responsive behavior, and page functionality must remain unchanged unless the user explicitly asks for a visual or behavioral change.
files touched:
- `migration_checklist.md`
- `next.config.mjs`
verification performed:
- Inspected `package.json`, `src/App.jsx`, `src/main.jsx`, `api/[...route].js`, `api/discord-interactions.js`, `api/_lib/env.js`, `api/_lib/http.js`, `api/_lib/clients.js`, `src/hooks/usePageSeo.js`, `scripts/postbuild.js`, `vite.config.js`, `vercel.json`, `src/lib/api.js`, `src/lib/supabase.js`, `src/lib/publicData.js`, and `index.html`.
- Verified the first migration step is config-only and should not affect Vite commands.

2026-05-27
session 2
- Continued from the "Next recommended task" section only.
- Installed `next` with npm so `package.json` and `package-lock.json` remain lockfile-consistent. The first install attempt hit a user npm cache permission problem, so the successful install used a temporary cache under `/private/tmp/lmnl-npm-cache`.
- Added explicit Next scripts: `dev:next`, `build:next`, and `start:next`. Existing Vite `dev`, `build`, `preview`, `lint`, and `test` commands were preserved.
- Added a tiny non-production App Router shell in `app/`. It is marked `noindex` and intentionally does not import existing page CSS or migrate any real LMNL page.
- Added an empty root `pages/.gitkeep` marker because Next otherwise detects the existing Vite component folder at `src/pages` as a Pages Router directory and refuses a root `app/` directory. This marker keeps the current Vite page components untouched and prevents accidental Pages Router migration.
- Updated ESLint config to ignore generated `.next` output and include root `app/` files in lint coverage.
- Added `.next` to `.gitignore`.
- Did not touch API implementation files.
- Did not change page aesthetics, CSS layouts, responsive behavior, or existing page interactions.
- Documented the first real page migration strategies below before any real page migration begins.
files touched:
- `package.json`
- `package-lock.json`
- `app/layout.jsx`
- `app/page.jsx`
- `pages/.gitkeep`
- `next.config.mjs`
- `eslint.config.js`
- `.gitignore`
- `migration_checklist.md`
verification performed:
- `npm run build:next` passed and produced App Router routes for `/` and `/_not-found`.
- `npm run lint` passed.
- `npm run build` passed, confirming the current Vite build and SEO postbuild still work after adding Next.

## 10. Current active task

Safest second migration step completed: Next dependency/scripts and a tiny non-production App Router shell were added without migrating real pages or changing current Vite runtime behavior.

Important active constraint: do not modify API implementation files unless a concrete Next.js migration step requires it. Prefer documenting an adapter plan before touching API code.

Important visual/functionality constraint: do not change page aesthetics, CSS layouts, responsive behavior, or existing page interactions as part of the migration. Any page migration should aim for visual and functional parity, not redesign.

First real page migration strategy, documented before implementation:
- CSS import strategy: preserve current CSS files exactly. Import global CSS only from the Next root layout or route-level client wrappers allowed by App Router rules. Do not rewrite CSS modules, Tailwind, or restyle selectors. If a page currently imports a CSS file directly, move that import to the nearest compliant Next boundary without changing declarations.
- React Router replacement strategy: migrate route by route using thin client wrappers. Replace `Link`, `Navigate`, `useNavigate`, `useLocation`, `useParams`, and `useSearchParams` with Next equivalents only inside the migrated route surface. Do not reorganize page component structure unless required by a router API mismatch.
- Env compatibility strategy: add a small client env compatibility helper before migrating pages that currently use `import.meta.env`. It should read `NEXT_PUBLIC_*` in Next and preserve `VITE_*` behavior for Vite until Vite is retired.
- Visual/functionality parity strategy: migrate one route at a time, keep existing components/CSS/assets, run Vite build plus Next build, and visually compare key responsive states before marking any page complete.
- Root/pages scaffold strategy: keep `pages/.gitkeep` while `src/pages` remains the Vite page-component folder so Next does not interpret it as a Pages Router app. Remove this marker only after the route structure is intentionally settled.

## 11. Remaining work

Priority order:
- Create a compatibility layer for client env access so code can run under both Vite and Next during migration.
- Use the documented CSS, React Router, env, and parity strategies before migrating the first real page.
- Migrate global document metadata from `index.html`/`scripts/postbuild.js` to Next metadata APIs.
- Migrate static/public pages one at a time.
- Preserve or replace host-aware admin root behavior.
- Migrate protected route/auth gates.
- Migrate community app routes.
- Migrate dynamic routes.
- Migrate API catch-all with the thinnest possible Next.js adapter. Avoid individual route handler splits unless strictly necessary.
- Validate Square webhook raw-body behavior.
- Validate Discord interaction raw-body behavior.
- Validate Apple Wallet pass binary response behavior.
- Replace Vite PWA plugin behavior or document explicit deferral.
- Run visual and functional parity checks.
- Remove Vite-only infrastructure only after Next parity is proven.

## 12. Known issues

- Existing client code depends heavily on `react-router-dom` (`Link`, `Navigate`, `useNavigate`, `useLocation`, `useParams`, `useSearchParams`, `matchPath`).
- Existing pages/components import CSS directly. Next App Router has stricter global CSS import rules; plan this before migrating pages.
- Existing client env access uses `import.meta.env`, which will not work directly in Next.
- `src/main.jsx` uses Vite-specific preload error and local service worker reset behavior.
- `scripts/postbuild.js` currently generates route-specific SEO HTML and `sitemap.xml`; Next needs equivalent metadata/sitemap handling.
- Admin root behavior is hostname-dependent: `/` is `Admin` on local/admin host and `Home` on public host.
- API route migration must preserve raw body handling for Square webhook and Discord interactions.
- `vercel.json` contains a Vite SPA rewrite to `/index.html`; this will need removal/replacement when Next becomes primary.
- No `next.config.*`, `app/`, `pages/`, `tsconfig.json`, or `jsconfig.json` existed at the start of this migration.
- `next.config.mjs`, Next dependencies, Next scripts, and a temporary App Router shell now exist.
- `next` 16.2.6 is installed and requires Node >= 20.9.0.
- A root `pages/.gitkeep` marker currently exists only to stop Next from treating `src/pages` as a Pages Router directory while the Vite app still uses `src/pages` for page components.
- The current Next shell is not a migrated LMNL route and should stay noindex/non-production until real route parity work begins.

## 13. Commands

Current commands:

```bash
npm install
npm run dev
npm run dev:next
npm run build
npm run build:next
npm run lint
npm run test
npm run preview
npm run start:next
```

Current Vite-specific commands:

```bash
npm run build
```

This runs:

```bash
vite build && node scripts/postbuild.js
```

Migration-specific commands:

```bash
npm run dev:next
npm run build:next
npm run test
```

Use `npm run test` after API/service changes.

## 14. Files changed

- `migration_checklist.md` - created central migration handoff document.
- `next.config.mjs` - added minimal Next.js config scaffold.
- `package.json` - added `next` dependency and explicit Next scripts while preserving Vite scripts.
- `package-lock.json` - lockfile updated by npm for Next 16.2.6 and its dependencies.
- `app/layout.jsx` - added noindex temporary root layout for the migration shell.
- `app/page.jsx` - added temporary non-production App Router shell page.
- `pages/.gitkeep` - added root Pages Router marker so Next does not confuse Vite `src/pages` with its own pages directory.
- `eslint.config.js` - ignored generated `.next` output and included root `app/` files in lint coverage.
- `.gitignore` - ignored generated `.next` output.

## 15. Next recommended task

Create the client env compatibility helper so browser code can read both Vite `VITE_*` values and Next `NEXT_PUBLIC_*` values during migration. Verify with Vite build, Next build, and lint. Do not migrate a real page until the helper is in place. Do not touch API implementation files during that step, and do not change page aesthetics or layouts.
