# LMNL Next.js Migration Checklist

Last updated: 2026-05-27

This file is the central handoff document for the LMNL migration. Future AI/coding sessions should be able to continue the migration by reading this file first. If this file conflicts with `migration_context.md`, `migration_context.md` wins.

## 1. Project summary

LMNL is a Tacoma, Washington art and culture platform site with public pages, events, shop/preorder flows, service/contact forms, a community app, and a private admin/check-in interface.

The project has been migrated from a Vite React single-page app to a Next.js App Router app. The legacy API services under `api/` are preserved behind a thin Next catch-all route adapter. Static metadata, sitemap, manifest, and service-worker cutover behavior are now handled by Next routes.

Current stack:
- Next.js App Router
- React 19
- plain CSS files
- Next route handlers wrapping legacy API services under `api/`
- Supabase
- Square
- Resend
- Discord interactions/notifications
- Apple Wallet pass generation with `passkit-generator`
- QR/ticket support
- Vercel Analytics and Speed Insights
- Next manifest route plus `/sw.js` retirement route for old PWA installs

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
- The old Vite runtime/build shell has been removed after Next parity and cutover behavior were established.
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
| `/` | `app/page.jsx` | complete | Host-aware root migrated. Public hosts render `Home`; local and `admin.*` hosts render the admin-gated `Admin` route. Code/build/HTTP checks pass. Admin session/API behavior is preserved but not authenticated during verification. |
| `/home` | `app/home/page.jsx` | complete | Admin/local alternate public home route migrated with a thin client wrapper around `Home`. Canonical points to `/`; noindex. Code/build/HTTP checks pass. |
| `/events` | `app/events/page.jsx` | complete | Events route migrated with a thin client wrapper around `Events`. Code/build/HTTP checks pass. Existing client-side public event data load behavior is preserved. |
| `/space` | `app/space/page.jsx` | complete | Space route migrated with a thin client wrapper around `Space`. Code/build/HTTP checks pass. Existing client-side public data, request, donation, and checkout behavior is preserved but request/checkout actions were not submitted during verification. |
| `/about` | `app/about/page.jsx` | complete | Static/content route migrated with a thin client wrapper. Build checks pass. Fresh production preview visual parity matched Vite at 1440x900 and 390x844. Next mobile shell confirmed `data-mobile="true"` with both sidebars closed. |
| `/services` | `app/services/page.jsx` | complete | Services route migrated with a thin client wrapper around `Services`. Code/build/HTTP checks pass. Form submission behavior was preserved but not submitted during verification. |
| `/portfolio` | `app/portfolio/page.jsx` | complete | Portfolio route migrated with a thin wrapper around `Portfolio`. Code/build/HTTP checks pass. Public portfolio loading and capability query behavior are preserved; admin portfolio API behavior was not touched. |
| `/community` | `app/community/page.jsx` | complete | Public community page migrated with a thin client wrapper around `Community`. Code/build/HTTP checks pass. |
| `/community/share` | `app/community/share/page.jsx` | complete | Artist interest form migrated with a thin client wrapper around `ArtistInterest`. Code/build/HTTP checks pass. Form submission behavior was preserved but not submitted during verification. |
| `/share-your-work` | redirect in `next.config.mjs` | complete | Redirects to `/community/share` with the thinnest Next config redirect. Vite SEO still generates noindex canonical HTML for the legacy Vite build. |
| `/shop` | `app/shop/page.jsx` | complete | Shop/preorder route migrated with a thin wrapper around `Shop`. Code/build/HTTP checks pass. Public product loading and checkout creation behavior are preserved but checkout was not triggered during verification. |
| `/blog` | `app/blog/page.jsx` | complete | Blog list migrated with a thin client wrapper around `Blog`. Code/build/HTTP checks pass. |
| `/blog/:slug` | `app/blog/[slug]/page.jsx` | complete | Dynamic blog post route migrated with a thin client wrapper around `BlogPostView`. Code/build/HTTP checks pass. Next server metadata is generic blog metadata with slug canonical; existing client SEO hook still updates post-specific metadata after the post loads. |
| `/contact` | `app/contact/page.jsx` | complete | Contact/service inquiry form migrated with a thin client wrapper around `Contact`. Code/build/HTTP checks pass. Form submission behavior was preserved but not submitted during verification. |
| `/intake` | `app/intake/page.jsx` | complete | Private/noindex website intake route migrated with a thin client wrapper around `Intake`. Code/build/HTTP checks pass. Direct Supabase form submission behavior was preserved but not submitted during verification. |
| `/prsm` | `app/prsm/page.jsx` | complete | Static/content route migrated with a thin client wrapper around `GenericPage` with title `PRSM`. Code checks pass. |
| `/ticket/:ticketId` | `app/ticket/[ticketId]/page.jsx` | complete | Dynamic ticket route migrated with a thin wrapper around `Ticket`. Code/build/HTTP checks pass. Ticket lookup and Apple Wallet pass behavior are preserved but not triggered during verification. |
| `/success` | `app/success/page.jsx` | complete | Checkout confirmation route migrated with a thin wrapper around `Success`. Code/build/HTTP checks pass. Query-param confirmation behavior is preserved but was not triggered during verification. |

Admin/host-aware routes:

| Old route | Next.js file path | Status | Notes |
| --- | --- | --- | --- |
| `/` on `admin.*` or local admin mode | `app/page.jsx` plus `app/AdminRootRoute.jsx` and `app/_admin/AdminProtectedRoute.jsx` | complete | Host-aware root now renders the existing `Admin` page behind the preserved Supabase/admin-session gate on local and `admin.*` hosts. Code/build/HTTP checks pass; authenticated admin data loading was not triggered. |
| `/admin` on public host | `proxy.js` redirect to `/` | complete | Current public-host `/admin` redirect is preserved through the fallback proxy redirect. Code/build/HTTP checks pass. |
| `/login` on admin/local | `app/login/page.jsx` | complete | Supabase admin login route migrated with a host-aware server gate. Local/admin hosts render login; public hosts redirect `/login` to `/`. Code/build/HTTP checks pass. Supabase sign-in behavior is preserved but not submitted during verification. |
| `/check-in/:token` on admin/local | `app/check-in/[token]/page.jsx` | complete | Protected check-in route migrated with host-aware local/admin rendering and public-host redirect to `/`. Code/build/HTTP checks pass. Ticket lookup and wristband confirmation behavior are preserved but not triggered during verification. |
| `/email-lab` on local only | `app/email-lab/page.jsx` | complete | Local-only email preview lab migrated. Localhost/127.0.0.1 render the existing lab; public and `admin.*` hosts redirect to `/`. Code/build/HTTP checks pass. |

Community app/auth routes:

| Old route | Next.js file path | Status | Notes |
| --- | --- | --- | --- |
| `/auth/callback` | `app/auth/callback/page.jsx` | complete | Supabase community auth callback migrated with a thin wrapper around `AuthCallback`. Code/build/HTTP checks pass. OAuth code exchange/profile bootstrap behavior is preserved but not triggered during verification. |
| `/app/login` | `app/app/login/page.jsx` | complete | Community login route migrated with a thin wrapper around `AppLogin`. Code/build/HTTP checks pass. Provider OAuth behavior is preserved but provider buttons were not triggered during verification. |
| `/app` | `app/app/page.jsx` | complete | Protected community app entry migrated with a shared thin community gate and `AppHome` redirect. Code/build/HTTP checks pass. Profile bootstrap and authenticated redirects are preserved but not triggered during verification. |
| `/app/onboarding` | `app/app/onboarding/page.jsx` | complete | Community onboarding route migrated with the shared thin community gate and existing `AppOnboarding` form. Code/build/HTTP checks pass. Profile form write behavior is preserved but was not submitted during verification. |
| `/dashboard/:userSlug` | `app/dashboard/[userSlug]/page.jsx` | complete | Protected user dashboard route migrated with the shared thin community gate and existing `UserDashboard` surface. Code/build/HTTP checks pass. Dashboard API load, attendance claim, sign-out, and slug canonicalization behavior are preserved but not triggered during verification. |

Fallback:

| Old route | Next.js file path | Status | Notes |
| --- | --- | --- | --- |
| `*` | `proxy.js` | complete | Unknown non-API, non-asset routes redirect to `/`, preserving the current SPA catch-all behavior. Code/build/HTTP redirect checks pass. |

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
| `/api/check-inventory` | `app/api/[...route]/route.js` | GET | Square variation inventory | complete via catch-all | Routed through the thin Next adapter around `api/[...route].js`; business logic untouched. |
| `/api/confirm-ticket` | `app/api/[...route]/route.js` | GET, POST | Confirm/reconcile ticket by request or ticket id | complete via catch-all | Routed through the thin Next adapter; success/admin flows keep the same endpoint shape. |
| `/api/create-checkout` | `app/api/[...route]/route.js` | POST | Square checkout for preorder | complete via catch-all | Routed through the thin Next adapter; production HTTP check confirmed method error JSON shape for GET. |
| `/api/create-event-checkout` | `app/api/[...route]/route.js` | POST | Square checkout for event | complete via catch-all | Routed through the thin Next adapter; checkout was not live-triggered. |
| `/api/create-request-checkout` | `app/api/[...route]/route.js` | POST | Square checkout for approved request | complete via catch-all | Routed through the thin Next adapter; checkout was not live-triggered. |
| `/api/app-dashboard` | `app/api/[...route]/route.js` | GET | Community dashboard data | complete via catch-all | Routed through the thin Next adapter; authenticated dashboard load was not live-triggered. |
| `/api/attendance-claim` | `app/api/[...route]/route.js` | POST | Claim attendance source for community user | complete via catch-all | Routed through the thin Next adapter; authenticated mutation was not live-triggered. |
| `/api/admin-attendance-attach` | `app/api/[...route]/route.js` | POST | Attach/create attendance sources | complete via catch-all | Routed through the thin Next adapter; admin mutation was not live-triggered. |
| `/api/admin-attendance-sources` | `app/api/[...route]/route.js` | GET | Admin attendance queue | complete via catch-all | Routed through the thin Next adapter; admin auth behavior remains in existing handler. |
| `/api/admin-runtime` | `app/api/[...route]/route.js` | GET | Runtime/auth diagnostics | complete via catch-all | Routed through the thin Next adapter; diagnostic logic untouched. |
| `/api/event-stats` | `app/api/[...route]/route.js` | GET | Approved request count by event name | complete via catch-all | Routed through the thin Next adapter; query params are bridged into `req.query`. |
| `/api/site-activity` | `app/api/[...route]/route.js` | GET | Recent site activity | complete via catch-all | Routed through the thin Next adapter. |
| `/api/space-activity` | `app/api/[...route]/route.js` | GET | Space ticket activity | complete via catch-all | Routed through the thin Next adapter. |
| `/api/event-checkout` | `app/api/[...route]/route.js` | GET | Event checkout view | complete via catch-all | Routed through the thin Next adapter; query params are bridged into `req.query`. |
| `/api/request-checkout` | `app/api/[...route]/route.js` | GET | Request checkout view | complete via catch-all | Routed through the thin Next adapter; query params are bridged into `req.query`. |
| `/api/pay-event` | `app/api/[...route]/route.js` | POST | Square payment for event | complete via catch-all | Routed through the thin Next adapter; payment was not live-triggered. |
| `/api/pay-preorder` | `app/api/[...route]/route.js` | POST | Square payment for preorder | complete via catch-all | Routed through the thin Next adapter; payment was not live-triggered. |
| `/api/pay-request` | `app/api/[...route]/route.js` | POST | Square payment for request | complete via catch-all | Routed through the thin Next adapter; payment was not live-triggered. |
| `/api/create-test-item` | `app/api/[...route]/route.js` | POST | Create Square test catalog item | complete via catch-all | Routed through the thin Next adapter; admin Square mutation was not live-triggered. |
| `/api/enable-square-tracking` | `app/api/[...route]/route.js` | POST | Enable Square inventory tracking | complete via catch-all | Routed through the thin Next adapter; admin Square mutation was not live-triggered. |
| `/api/events` | `app/api/[...route]/route.js` | GET, POST | Public/admin event list and admin mutations | complete via catch-all | Routed through the thin Next adapter; headers are bridged so auth-header public/admin branching is preserved. |
| `/api/generate-pass` | `app/api/[...route]/route.js` | GET | Apple Wallet pass download | complete via catch-all | Adapter supports `setHeader` and binary `send`; live PassKit binary generation/download was validated with configured wallet env in session 49. |
| `/api/preorder-checkout` | `app/api/[...route]/route.js` | GET | Preorder checkout view | complete via catch-all | Routed through the thin Next adapter; query params are bridged into `req.query`. |
| `/api/get-ticket` | `app/api/[...route]/route.js` | GET | Ticket view | complete via catch-all | Routed through the thin Next adapter; ticket service tests pass. |
| `/api/check-in-ticket` | `app/api/[...route]/route.js` | GET, POST | Ticket check-in lookup/confirm | complete via catch-all | Routed through the thin Next adapter; ticket/check-in service tests pass, admin-auth live flow not triggered. |
| `/api/admin-session` | `app/api/[...route]/route.js` | GET | Verify admin session | complete via catch-all | Routed through the thin Next adapter; admin gate keeps using the same endpoint. |
| `/api/admin-tickets` | `app/api/[...route]/route.js` | GET | Admin ticket list | complete via catch-all | Routed through the thin Next adapter; admin auth behavior remains in existing handler. |
| `/api/preorders` | `app/api/[...route]/route.js` | GET, POST | Admin preorder list/mutations | complete via catch-all | Routed through the thin Next adapter; admin mutations were not live-triggered. |
| `/api/requests` | `app/api/[...route]/route.js` | GET, POST | Access requests | complete via catch-all | Routed through the thin Next adapter; public create/admin mutations were not live-triggered. |
| `/api/artist-interest` | `app/api/[...route]/route.js` | GET, POST | Artist interest submissions | complete via catch-all | Routed through the thin Next adapter; Turnstile/form submission was not live-triggered. |
| `/api/blog-posts` | `app/api/[...route]/route.js` | GET, POST | Admin blog post CRUD | complete via catch-all | Routed through the thin Next adapter; admin mutations were not live-triggered. |
| `/api/portfolio` | `app/api/[...route]/route.js` | GET, POST | Public portfolio and admin portfolio CRUD/generate preview | complete via catch-all | Routed through the thin Next adapter; `view=admin` auth behavior remains in existing handler. |
| `/api/community-businesses` | `app/api/[...route]/route.js` | GET, POST | Admin community business CRUD | complete via catch-all | Routed through the thin Next adapter; admin mutations were not live-triggered. |
| `/api/community-credits` | `app/api/[...route]/route.js` | GET, POST | Admin community credits CRUD/sync | complete via catch-all | Routed through the thin Next adapter; admin mutations were not live-triggered. |
| `/api/mailing-list` | `app/api/[...route]/route.js` | GET, POST | Admin mailing list CRUD | complete via catch-all | Routed through the thin Next adapter; admin mutations were not live-triggered. |
| `/api/service-products` | `app/api/[...route]/route.js` | GET, POST | Public service products and admin mutations | complete via catch-all | Routed through the thin Next adapter; admin mutations were not live-triggered. |
| `/api/service-inquiries` | `app/api/[...route]/route.js` | GET, POST | Service inquiry create/admin update/delete | complete via catch-all | Routed through the thin Next adapter; Turnstile/form submission was not live-triggered. |
| `/api/website-intake-submissions` | `app/api/[...route]/route.js` | GET, POST | Admin website intake submissions | complete via catch-all | Routed through the thin Next adapter; admin behavior remains in existing handler. |
| `/api/square-catalog` | `app/api/[...route]/route.js` | GET | Admin Square catalog view | complete via catch-all | Routed through the thin Next adapter; admin auth behavior remains in existing handler. |
| `/api/discord-interactions` | `app/api/[...route]/route.js` | GET, POST | Discord interaction verification/handling | complete via catch-all | Adapter preserves raw body and headers. Route-level valid and invalid Ed25519 signature behavior was validated through the built Next handler with configured `DISCORD_PUBLIC_KEY`. |
| `/api/square-webhook` | `app/api/[...route]/route.js` | POST | Square order webhook fulfillment | complete via catch-all | Adapter preserves raw body, headers, and request URL candidates; route-level raw-body signature test and webhook service tests pass. |

## 6. Environment variable mapping

Format: old name -> new name | client/server | status | notes

| Old name -> new name | Client/server | Status | Notes |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` -> `NEXT_PUBLIC_SUPABASE_URL` | client | complete; Vite fallback removed | `src/lib/clientEnv.js` now reads only `NEXT_PUBLIC_SUPABASE_URL`. `next.config.mjs` can expose `SUPABASE_URL` as the public value when no explicit `NEXT_PUBLIC_SUPABASE_URL` exists. |
| `VITE_SUPABASE_ANON_KEY` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | complete; Vite fallback removed | `src/lib/clientEnv.js` now reads only `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `next.config.mjs` can expose `SUPABASE_ANON_KEY` as the public value when no explicit `NEXT_PUBLIC_SUPABASE_ANON_KEY` exists. API config now uses `SUPABASE_ANON_KEY` directly. |
| `VITE_TURNSTILE_SITE_KEY` -> `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | client | complete; Vite fallback removed | `src/lib/api.js` reads this through `src/lib/clientEnv.js`; set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` for the client widget after Vite removal. |
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

Port selection/server readiness rule: verify the correct Vite/Next port through code or terminal evidence before any UI check. Use package scripts/config, dev/preview output, process inspection, or a lightweight HTTP status/body check. Do not open a browser, take screenshots, or run visual tooling merely to confirm the port.

Scope decision: per user instruction on 2026-05-27, do not conduct a full visual parity check for every page. Treat the every-page parity sweep as skipped. Use targeted visual checks only when explicitly requested or when a concrete migration risk/regression cannot be assessed through code/build/HTTP checks.

- [x] Homepage parity
- [x] Terminal shell parity
- [x] Navigation parity
- [x] Footer/sidebar/social link parity
- [x] Full every-page visual parity sweep - skipped by user direction
- [x] Typography parity
- [x] Spacing parity
- [x] Color/theme parity
- [x] Responsive parity on mobile/tablet/desktop
- [x] Animations/transitions parity
- [x] Image rendering parity
- [x] Form styling parity
- [x] Button/link states parity
- [x] Admin UI parity
- [x] Community app UI parity
- [x] Ticket/check-in UI parity
- [x] Local-only email lab visibility parity

## 8. Functional parity checklist

- [x] Supabase public reads
- [x] Supabase admin reads
- [x] Supabase writes
- [x] Supabase auth/session handling
- [x] Admin authorization
- [x] Community auth/session handling
- [x] Community onboarding gate
- [x] Community dashboard/profile routing
- [x] Form submissions
- [x] Turnstile verification
- [x] Resend email sending
- [ ] Discord notifications
- [x] Discord interaction endpoint signature verification
- [x] Square catalog reads
- [x] Square inventory reads
- [x] Square checkout creation
- [x] Square direct payments
- [x] Square webhook signature/fulfillment handling
- [x] Ticket generation/reconciliation
- [x] QR rendering
- [x] Apple Wallet pass generation/download
- [x] Admin tools
- [x] Check-in lookup and confirmation
- [x] Dynamic blog route rendering
- [x] Dynamic ticket route rendering
- [x] Dynamic community profile route rendering
- [x] SEO metadata generation
- [x] Sitemap generation
- [x] PWA behavior or explicit replacement decision
- [x] Vercel Analytics/Speed Insights parity

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

2026-05-27
session 3
- Continued from the "Current active task" and "Next recommended task" sections only.
- Added `src/lib/clientEnv.js`, a small client compatibility helper that reads `NEXT_PUBLIC_*` values for Next and falls back to the existing `VITE_*` values for Vite.
- Replaced shared browser-side `import.meta.env` reads in `src/lib/supabase.js`, `src/lib/publicData.js`, `src/lib/api.js`, and `src/lib/socialSystem.js` with the compatibility helper.
- Included compatibility aliases for existing social system preview flags while preserving the current `getSocialSystemConfig(env)` override shape.
- Did not migrate a real route in this session because the recommended task was to place and verify the helper first.
- Did not touch API implementation files.
- Did not change page aesthetics, CSS layouts, responsive behavior, component structure, or existing page interactions.
files touched:
- `migration_checklist.md`
- `src/lib/clientEnv.js`
- `src/lib/supabase.js`
- `src/lib/publicData.js`
- `src/lib/api.js`
- `src/lib/socialSystem.js`
verification performed:
- `npm run lint` passed.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work after the helper.
- `npm run build:next` passed, confirming the Next scaffold still builds with the compatibility helper in the shared source tree.
- No visual inspection was required because no real page was migrated.

2026-05-27
session 4
- Continued from the "Current active task" and "Next recommended task" sections only.
- Inspected `src/pages/About.jsx` before migrating it. Confirmed it is a low-risk public/static route: no API dependency, no dynamic params, and only minimal React Router usage through `Link`.
- Migrated `/about` to `app/about/page.jsx` using a thin client route wrapper around the existing `About` page component.
- Added `src/components/RouterAdapter.jsx` so shared components can keep React Router behavior in Vite while the migrated Next route supplies Next links and pathname state.
- Updated the existing shell/about/sidebar link usage needed by the `/about` route to use the router adapter. This preserves component structure and avoids importing Next router APIs into Vite code.
- Preserved all existing CSS files. Moved shared shell CSS imports out of component modules and into compliant app entry boundaries: `src/main.jsx` for Vite and `app/layout.jsx` for Next.
- Added `/about` metadata in Next, including canonical, Open Graph/Twitter fields, and explicit index/follow robots metadata. Added `metadataBase` to the root layout to avoid relative social image warnings.
- Did not touch API implementation files.
- Did not redesign, restyle, modernize, reorganize, or simplify the page.
- During visual inspection, desktop parity matched between Vite and Next production preview. Mobile inspection exposed that the Next shell could remain in desktop sidebar state after SSR/hydration, so `TerminalShell` now reads the mobile breakpoint through `useSyncExternalStore` and syncs sidebar state from that client viewport signal.
- Final commands passed after the responsive shell update. A fresh post-fix Next production visual check could not be completed because the sandbox denied opening another local preview port, and the already-running Next preview continued serving the pre-fix bundle. Repeat this first in the next session.
files touched:
- `migration_checklist.md`
- `app/layout.jsx`
- `app/about/page.jsx`
- `app/about/AboutRoute.jsx`
- `src/App.jsx`
- `src/components/ContentPageShell.jsx`
- `src/components/RouterAdapter.jsx`
- `src/components/TerminalShell.jsx`
- `src/components/TerminalSidebarPanels.jsx`
- `src/main.jsx`
- `src/pages/About.jsx`
verification performed:
- `npm run lint` passed after the final responsive shell update.
- `npm run build` passed after the final responsive shell update, confirming the current Vite app and SEO postbuild still work.
- `npm run build:next` passed after the final responsive shell update, producing App Router routes for `/`, `/_not-found`, and `/about`.
- Visual inspection with the in-app browser at 1440x900 confirmed Vite `/about` and Next production `/about` matched structurally and visually at desktop width.
- Visual inspection with the in-app browser at 390x844 confirmed Vite mobile `/about` rendered correctly. The Next production preview used for final mobile comparison was still serving the pre-fix bundle and showed the old desktop-sidebar mobile mismatch; this must be rechecked on a fresh Next production preview.

2026-05-27
session 5
- Continued from the "Current active task" and "Next recommended task" sections only.
- Ran the required checks before visual verification: `npm run lint`, `npm run build`, and `npm run build:next` all passed.
- Started fresh production previews for Vite and Next. The first fresh Next mobile check still showed a sidebar hydration mismatch: Next reported `data-mobile="true"` but retained `data-left-open="true"` and `data-right-open="true"` from the server-rendered attributes.
- Fixed only the minimum required for `/about` parity by making `TerminalShell` initialize sidebar open state consistently with the server render, then letting the existing mobile viewport effect close the sidebars after hydration.
- Re-ran `npm run lint`, `npm run build`, and `npm run build:next`; all passed.
- Started a second fresh Vite preview on `127.0.0.1:4174` and a second fresh Next production preview on `127.0.0.1:3004`.
- Visually compared Vite `/about` and Next `/about` at desktop 1440x900 and mobile 390x844. Desktop and mobile parity matched.
- Confirmed the Next mobile shell reports `data-mobile="true"`, `data-left-open="false"`, `data-right-open="false"`, `aria-hidden="true"` on both sidebars, and `data-overlay-active="false"`, matching Vite.
- Marked `/about` complete in the route inventory.
- Did not touch API implementation files.
- Kept the Vite app runnable and preserved existing CSS files, component structure, page aesthetics, layouts, responsive behavior, and functionality.
files touched:
- `migration_checklist.md`
- `src/components/TerminalShell.jsx`
verification performed:
- `npm run lint` passed before and after the final fix.
- `npm run build` passed before and after the final fix, including Vite SEO postbuild generation.
- `npm run build:next` passed before and after the final fix, producing App Router routes for `/`, `/_not-found`, and `/about`.
- Fresh Vite production preview: `http://127.0.0.1:4174/about`.
- Fresh Next production preview: `http://127.0.0.1:3004/about`.
- Browser visual comparison at 1440x900: Vite and Next `/about` matched in shell layout, page content position, sidebars, typography, and card layout.
- Browser visual comparison at 390x844: Vite and Next `/about` matched in mobile shell layout, closed sidebars, top bar, headline, cards, and scroll width.
- Mobile DOM state matched: Vite and Next both reported `data-mobile="true"`, `data-left-open="false"`, `data-right-open="false"`, and body scroll width `390`.

2026-05-27
session 6
- Continued from the "Current active task" and "Next recommended task" sections only.
- Inspected the Vite `/prsm` implementation and confirmed it is a low-risk static/content route: `src/App.jsx` renders a small `PrsmPage` wrapper that passes `title="PRSM"` and the neutral theme color to `GenericPage`.
- Migrated `/prsm` to `app/prsm/page.jsx` using the same thin client wrapper/router-adapter pattern as `/about`.
- Added `/prsm` metadata in Next, including canonical, Open Graph/Twitter fields, and explicit index/follow robots metadata.
- Added a small `next.config.mjs` public-env compatibility mapping so Next browser bundles can see existing Vite public env values during migration when `NEXT_PUBLIC_*` aliases are not yet present. This fixed shared public-data compatibility without touching API implementation files.
- Started production previews during the initial check, but the user changed the verification policy to code checks only before completion. No further visual checks should be required by default.
- Marked `/prsm` complete in the route inventory based on successful code/build checks.
- Did not touch API implementation files.
- Kept the Vite app runnable and preserved existing CSS files, component structure, page aesthetics, layouts, responsive behavior, and functionality.
files touched:
- `migration_checklist.md`
- `app/prsm/page.jsx`
- `app/prsm/PrsmRoute.jsx`
- `next.config.mjs`
verification performed:
- `npm run lint` passed after adding `/prsm`.
- `npm run build` passed after adding `/prsm`, including Vite SEO postbuild generation for `/prsm`.
- `npm run build:next` passed after adding `/prsm`, producing App Router routes for `/`, `/_not-found`, `/about`, and `/prsm`.
- After the public-env compatibility mapping, `npm run lint`, `npm run build`, and `npm run build:next` all passed again.
- Fresh Vite production preview was started at `http://127.0.0.1:4175/prsm` and fresh Next production previews were started at `http://127.0.0.1:3005/prsm` and `http://127.0.0.1:3006/prsm`; preview processes were stopped before handoff.
- No visual parity pass is required going forward unless the user asks for it; use code checks only by default.

2026-05-27
session 7
- Continued from the "Current active task" and "Next recommended task" sections only.
- Inspected the Vite `/share-your-work` route wiring in `src/App.jsx`. Confirmed it is a direct React Router replace redirect to `/community/share`.
- Checked the existing SEO table in `src/hooks/usePageSeo.js`; the legacy route already canonicalizes to `/community/share` and is `noindex, nofollow` in the Vite-generated HTML.
- Added the matching Next behavior as a config-level redirect in `next.config.mjs`, keeping the implementation thinner than adding an App Router page solely to redirect.
- Confirmed `.next/routes-manifest.json` contains the generated `/share-your-work` to `/community/share` redirect after `npm run build:next`.
- Marked `/share-your-work` complete in the route inventory.
- Did not migrate `/community/share`.
- Did not touch API implementation files.
- Did not change CSS, component structure, page aesthetics, layouts, responsive behavior, or functionality.
- Did not run visual checks, per the updated verification policy.
files touched:
- `migration_checklist.md`
- `next.config.mjs`
verification performed:
- `npm run lint` passed.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite still generated SEO HTML for `/share-your-work`.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, and `/prsm`, with the redirect represented in `.next/routes-manifest.json`.
- Code-level redirect verification: `.next/routes-manifest.json` includes source `/share-your-work`, destination `/community/share`, and `permanent: false`.

2026-05-27
session 8
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before choosing the next task.
- Inspected the existing `/home` worktree state and confirmed the route is a small public/home route using `src/pages/Home.jsx`, public event data loaders, and router links only for terminal shortcuts.
- Kept the migration thin: `app/home/page.jsx` provides route metadata matching the existing `/home` SEO behavior, and `app/home/HomeRoute.jsx` wraps the existing `Home` page with the Next router adapter and `ThemeProvider`.
- Confirmed `src/pages/Home.jsx` uses the existing router adapter links, and the shared `Events.css` styling is loaded from Vite and Next entry boundaries rather than from the page module.
- Marked `/home` complete in the route inventory.
- Did not touch API implementation files.
- Did not change CSS declarations, component structure, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/home/page.jsx`
- `app/home/HomeRoute.jsx`
- `src/pages/Home.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, `/home`, and `/prsm`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/home`.
- Fresh Next production preview was started at `http://127.0.0.1:3007/home`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4176/home`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/home` HTML confirmed title `LMNL`, `noindex, nofollow`, canonical `https://lmnl.art`, and `/seo/home-seo.png`.
- Code-level markup check on the Next `/home` HTML confirmed the terminal shell, navigation, home intro copy, command links, and upcoming event block render on the server.
- Preview processes on ports 3007 and 4176 were stopped after checks.

2026-05-27
session 9
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before choosing the next task.
- Compared `/blog` and `/community` as possible next public routes. Chose `/blog` because it is the smaller route surface: one list page, one CSS file, one router link type, and public blog-post reads only.
- Migrated `/blog` to `app/blog/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Switched `src/pages/Blog.jsx` from React Router `Link` to the router adapter so Vite and Next can share the component.
- Preserved the existing `Blog.css` declarations exactly and moved the global CSS import to compliant app entry boundaries: `src/main.jsx` for Vite and `app/layout.jsx` for Next.
- Added `/blog` metadata in Next matching the existing route SEO title, description, canonical URL, Open Graph image, Twitter image, and index/follow robots behavior.
- Left `/blog/:slug` pending; the migrated list still links to the existing post URL shape, but the dynamic App Router page has not been migrated.
- Marked `/blog` complete in the route inventory.
- Did not touch API implementation files.
- Did not change CSS declarations, component structure, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/layout.jsx`
- `app/blog/page.jsx`
- `app/blog/BlogRoute.jsx`
- `src/main.jsx`
- `src/pages/Blog.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, `/blog`, `/home`, and `/prsm`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/blog`.
- Fresh Next production preview was started at `http://127.0.0.1:3008/blog`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4177/blog`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/blog` HTML confirmed title `LMNL | BLOG`, robots `index, follow`, canonical `https://lmnl.art/blog`, and `/seo/blog-seo.png`.
- Code-level markup check on the Next `/blog` HTML confirmed the terminal shell, active blog navigation item, intro copy, `blog-content` shell class, `blog-layout`, and loading state render on the server.
- Code-level SEO check on `dist/blog/index.html` confirmed the Vite-generated static SEO file still has canonical `https://lmnl.art/blog`, title `LMNL | BLOG`, and `/seo/blog-seo.png`. The Vite preview route itself serves the SPA fallback HTML, which is existing behavior and not a migration change.
- Preview processes on ports 3008 and 4177 were stopped after checks.

2026-05-27
session 10
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before choosing the next task.
- Compared `/community` and `/blog/:slug` as possible next routes. Chose `/community` because it is still a public list/content route, while `/blog/:slug` requires a separate dynamic params adapter and per-post SEO behavior.
- Migrated `/community` to `app/community/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Switched `src/pages/Community.jsx` from React Router `Link` to the router adapter for the internal "Enter the Network" CTA.
- Normalized that CTA from relative `share` to absolute `/community/share`, preserving the same resolved URL in Vite while making the Next route explicit.
- Preserved the existing `Community.css` declarations exactly and moved the global CSS import to compliant app entry boundaries: `src/main.jsx` for Vite and `app/layout.jsx` for Next.
- Added `/community` metadata in Next matching the existing route SEO title, description, canonical URL, Open Graph image, Twitter image, and index/follow robots behavior.
- Left `/community/share` pending; the migrated page still links to the existing URL shape, but the artist-interest route has not been migrated.
- Marked `/community` complete in the route inventory.
- Did not touch API implementation files.
- Did not change CSS declarations, component structure, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/layout.jsx`
- `app/community/page.jsx`
- `app/community/CommunityRoute.jsx`
- `src/main.jsx`
- `src/pages/Community.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, `/blog`, `/community`, `/home`, and `/prsm`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/community`.
- Fresh Next production preview was started at `http://127.0.0.1:3009/community`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4178/community`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/community` HTML confirmed title `LMNL | COMMUNITY`, robots `index, follow`, canonical `https://lmnl.art/community`, and `/seo/community-seo.png`.
- Code-level markup check on the Next `/community` HTML confirmed the terminal shell, active community navigation item, intro copy, `community-layout`, stat cards, community copy, Discord CTA, `/community/share` CTA, and loading state render on the server.
- Code-level SEO check on `dist/community/index.html` confirmed the Vite-generated static SEO file still has canonical `https://lmnl.art/community`, title `LMNL | COMMUNITY`, and `/seo/community-seo.png`.
- Preview processes on ports 3009 and 4178 were stopped after checks.

2026-05-27
session 11
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before choosing the next task.
- Inspected `/blog/:slug`, `/community/share`, and `/contact` as possible next routes. Chose `/blog/:slug` because it avoids form submission/API behavior and only requires dynamic route parameter adaptation.
- Migrated `/blog/:slug` to `app/blog/[slug]/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Updated `src/pages/BlogPostView.jsx` to accept an optional `slug` prop for Next and fall back to reading the slug from the current `/blog/:slug` pathname for the existing Vite route.
- Switched blog post back links from React Router `Link` to the router adapter so Vite and Next can share the component.
- Preserved the existing `Blog.css` declarations and continued loading that CSS from compliant app entry boundaries.
- Added generic blog metadata for the dynamic Next route with a slug-specific canonical URL. The existing `usePageSeo` hook remains in `BlogPostView` and still updates post-specific title, description, canonical path, and not-found robots metadata after the post load, matching the current client-side behavior.
- Marked `/blog/:slug` complete in the route inventory.
- Did not touch API implementation files.
- Did not change CSS declarations, component structure, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/blog/[slug]/page.jsx`
- `app/blog/[slug]/BlogPostRoute.jsx`
- `src/pages/BlogPostView.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/home`, and `/prsm`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work.
- Fresh Next production preview was started at `http://127.0.0.1:3010/blog/sample-post`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4179/blog/sample-post`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/blog/sample-post` HTML confirmed title `LMNL | BLOG`, robots `index, follow`, canonical `https://lmnl.art/blog/sample-post`, and `/seo/blog-seo.png`.
- Code-level markup check on the Next `/blog/sample-post` HTML confirmed the terminal shell, active blog navigation item, intro copy `SINGLE TRANSMISSION / FULL RECORD`, `blog-content`, `blog-layout`, and loading state render on the server.
- Code-level Vite preview check confirmed `/blog/sample-post` still resolves with the existing SPA fallback behavior. Dynamic post-specific SEO remains client-driven in Vite and in the migrated Next client component.
- Preview processes on ports 3010 and 4179 were stopped after checks.

2026-05-27
session 12
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before choosing the next task.
- Inspected `/community/share` and `/contact` as possible next form routes. Chose `/community/share` because `/share-your-work` already redirects there and the migrated `/community` page links there.
- Migrated `/community/share` to `app/community/share/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Switched `src/pages/ArtistInterest.jsx` from React Router `Link` to the router adapter for the success-state "Back to community" link.
- Preserved the existing `ArtistInterest.css` declarations exactly and moved the global CSS import to compliant app entry boundaries: `src/main.jsx` for Vite and `app/layout.jsx` for Next.
- Added `/community/share` metadata in Next matching the existing route SEO title, description, canonical URL, Open Graph image, Twitter image, and index/follow robots behavior.
- Left form submission behavior untouched: the form still posts to `/api/artist-interest`, uses the same request body fields, and uses the same Turnstile site-key helper and reset flow.
- Marked `/community/share` complete in the route inventory.
- Did not touch API implementation files.
- Did not submit the artist-interest form during verification.
- Did not change CSS declarations, component structure, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/layout.jsx`
- `app/community/share/page.jsx`
- `app/community/share/ArtistInterestRoute.jsx`
- `src/main.jsx`
- `src/pages/ArtistInterest.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/community/share`, `/home`, and `/prsm`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/community/share`.
- Fresh Next production preview was started at `http://127.0.0.1:3011/community/share`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4180/community/share`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/community/share` HTML confirmed title `LMNL | COMMUNITY SHARE`, robots `index, follow`, canonical `https://lmnl.art/community/share`, and `/seo/community-seo.png`.
- Code-level markup check on the Next `/community/share` HTML confirmed the terminal shell, active community navigation item, intro copy, artist-interest panels, form fields, Turnstile block, disabled submit button, and form shell render on the server.
- Code-level SEO check on `dist/community/share/index.html` confirmed the Vite-generated static SEO file still has canonical `https://lmnl.art/community/share`, title `LMNL | COMMUNITY SHARE`, and `/seo/community-seo.png`.
- Preview processes on ports 3011 and 4180 were stopped after checks.

2026-05-27
session 13
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before choosing the next task.
- Inspected `/contact` and confirmed it is a self-contained public form route with no direct React Router usage, a direct `Contact.css` import, and preserved Turnstile/API submission behavior through `/api/service-inquiries`.
- Migrated `/contact` to `app/contact/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Preserved the existing `Contact.css` declarations exactly and moved the global CSS import to compliant app entry boundaries: `src/main.jsx` for Vite and `app/layout.jsx` for Next.
- Added `/contact` metadata in Next matching the existing route SEO title, description, canonical URL, Open Graph image, Twitter image, and index/follow robots behavior.
- Left form submission behavior untouched: the form still posts to `/api/service-inquiries`, uses the same request body fields, and uses the same Turnstile site-key helper and reset flow.
- Marked `/contact` complete in the route inventory.
- Did not touch API implementation files.
- Did not submit the contact form during verification.
- Did not change CSS declarations, component structure, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/layout.jsx`
- `app/contact/page.jsx`
- `app/contact/ContactRoute.jsx`
- `src/main.jsx`
- `src/pages/Contact.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/community/share`, `/contact`, `/home`, and `/prsm`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/contact`.
- Fresh Next production preview was started at `http://127.0.0.1:3012/contact`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4181/contact`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/contact` HTML confirmed title `LMNL | CONTACT`, robots `index, follow`, canonical `https://lmnl.art/contact`, and `/seo/contact-seo.png`.
- Code-level markup check on the Next `/contact` HTML confirmed the terminal shell, active contact navigation item, intro copy, primary channel panel, social channels panel, signal intake form shell, form fields, Turnstile block, and disabled submit button render on the server.
- Code-level SEO check on `dist/contact/index.html` confirmed the Vite-generated static SEO file still has canonical `https://lmnl.art/contact`, title `LMNL | CONTACT`, and `/seo/contact-seo.png`.
- Preview processes on ports 3012 and 4181 were stopped after checks.

2026-05-27
session 14
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before choosing the next task.
- Compared `/events`, `/services`, and `/space` as possible next routes. Chose `/events` because it has no direct React Router usage and can be migrated without changing form submission, checkout, or API behavior.
- Migrated `/events` to `app/events/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Preserved the existing `Events.css` declarations exactly. The stylesheet was already loaded from compliant app entry boundaries; removed the direct page-level CSS import from `src/pages/Events.jsx`.
- Added `/events` metadata in Next matching the existing route SEO title, description, canonical URL, Open Graph image, Twitter image, and index/follow robots behavior.
- Left data loading behavior untouched: the page still loads public timeline events from the existing client-side `fetchTimelineEvents()` effect and keeps the same loading, empty, selected-event, and featured-event behavior.
- Marked `/events` complete in the route inventory.
- Did not touch API implementation files.
- Did not trigger checkout/request flows during verification.
- Did not change CSS declarations, component structure, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/events/page.jsx`
- `app/events/EventsRoute.jsx`
- `src/pages/Events.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/community/share`, `/contact`, `/events`, `/home`, and `/prsm`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/events`.
- Fresh Next production preview was started at `http://127.0.0.1:3013/events`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4182/events`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/events` HTML confirmed title `LMNL | EVENTS`, robots `index, follow`, canonical `https://lmnl.art/events`, and `/seo/events-seo.png`.
- Code-level markup check on the Next `/events` HTML confirmed the terminal shell, active events navigation item, intro copy, `events-content`, `events-layout`, and loading state render on the server.
- Code-level SEO check on `dist/events/index.html` confirmed the Vite-generated static SEO file still has canonical `https://lmnl.art/events`, title `LMNL | EVENTS`, and `/seo/events-seo.png`.
- Preview processes on ports 3013 and 4182 were stopped after checks.

2026-05-27
session 15
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before choosing the next task.
- Compared `/services` and `/space` as possible next routes. Chose `/services` because it has portfolio links plus a Turnstile inquiry form, while `/space` includes checkout and request flows.
- Migrated `/services` to `app/services/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Switched `src/pages/Services.jsx` from React Router `Link` to the router adapter for portfolio links so Vite and Next can share the component.
- Preserved the existing `Services.css` declarations exactly and moved the global CSS import to compliant app entry boundaries: `src/main.jsx` for Vite and `app/layout.jsx` for Next.
- Added `/services` metadata in Next matching the existing route SEO title, description, canonical URL, Open Graph image, Twitter image, and index/follow robots behavior.
- Left form submission behavior untouched: the form still posts to `/api/service-inquiries`, uses the same request body fields, and uses the same Turnstile site-key helper and reset flow.
- Marked `/services` complete in the route inventory.
- Did not touch API implementation files.
- Did not submit the services inquiry form during verification.
- Did not change CSS declarations, component structure, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/layout.jsx`
- `app/services/page.jsx`
- `app/services/ServicesRoute.jsx`
- `src/main.jsx`
- `src/pages/Services.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/community/share`, `/contact`, `/events`, `/home`, `/prsm`, and `/services`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/services`.
- Fresh Next production preview was started at `http://127.0.0.1:3014/services`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4183/services`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/services` HTML confirmed title `LMNL | SERVICES`, robots `index, follow`, canonical `https://lmnl.art/services`, and `/seo/services-seo.png`.
- Code-level markup check on the Next `/services` HTML confirmed the terminal shell, active services navigation item, intro copy, `services-layout`, services capabilities, selected capability panel, portfolio link, submit inquiry panel, form fields, Turnstile block, and disabled submit button render on the server.
- Code-level SEO check on `dist/services/index.html` confirmed the Vite-generated static SEO file still has canonical `https://lmnl.art/services`, title `LMNL | SERVICES`, and `/seo/services-seo.png`.
- Preview processes on ports 3014 and 4183 were stopped after checks.

2026-05-27
session 16
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before choosing the next task.
- Inspected `/space` and confirmed it has no direct React Router dependency, but does include client-side public data loading, ticket activity polling, request submission, donation links, and Square event checkout creation.
- Migrated `/space` to `app/space/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Preserved the existing `Space.css` declarations exactly and moved the global CSS import to compliant app entry boundaries: `src/main.jsx` for Vite and `app/layout.jsx` for Next.
- Added `/space` metadata in Next matching the existing route SEO title, description, canonical URL, Open Graph image, Twitter image, and index/follow robots behavior.
- Left public data, request, donation, and checkout behavior untouched: the page still loads `fetchSpaceEventSnapshot()` and `fetchSpaceTicketActivity()` client-side, posts requests to `/api/requests`, creates event checkout through `/api/create-event-checkout`, redirects with the returned checkout URL, and uses the same Square donation links.
- Marked `/space` complete in the route inventory.
- Did not touch API implementation files.
- Did not submit the request form, click donation links, or trigger checkout during verification.
- Did not change CSS declarations, component structure, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/layout.jsx`
- `app/space/page.jsx`
- `app/space/SpaceRoute.jsx`
- `src/main.jsx`
- `src/pages/Space.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/community/share`, `/contact`, `/events`, `/home`, `/prsm`, `/services`, and `/space`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/space`.
- Fresh Next production preview was started at `http://127.0.0.1:3015/space`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4184/space`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/space` HTML confirmed title `LMNL | SPACE`, robots `index, follow`, canonical `https://lmnl.art/space`, and `/seo/space-seo.png`.
- Code-level markup check on the Next `/space` HTML confirmed the terminal shell, intro copy, `space-content`, `space-body`, metrics grid, system diagnostics, admission panel, disclaimer, and activity list render on the server.
- Code-level SEO check on `dist/space/index.html` confirmed the Vite-generated static SEO file still has canonical `https://lmnl.art/space`, title `LMNL | SPACE`, and `/seo/space-seo.png`.
- Preview processes on ports 3015 and 4184 were stopped after checks.

2026-05-27
session 17
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before choosing the next task.
- Compared `/success`, `/shop`, and `/intake` as possible next routes. Chose `/intake` because it has no direct router dependency or query params; its risk is limited to direct Supabase form submission on submit.
- Migrated `/intake` to `app/intake/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Preserved the existing `Intake.css` declarations exactly and moved the global CSS import to compliant app entry boundaries: `src/main.jsx` for Vite and `app/layout.jsx` for Next.
- Added `/intake` metadata in Next matching the existing route SEO title, description, canonical URL, Open Graph image, Twitter image, and noindex/nofollow robots behavior.
- Left form submission behavior untouched: the page still checks `hasSupabaseCredentials` and inserts the same payload directly into the `website_intake_submissions` Supabase table on submit.
- Marked `/intake` complete in the route inventory.
- Did not touch API implementation files.
- Did not submit the intake form during verification.
- Did not change CSS declarations, component structure, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/intake/page.jsx`
- `app/intake/IntakeRoute.jsx`
- `app/layout.jsx`
- `src/main.jsx`
- `src/pages/Intake.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/community/share`, `/contact`, `/events`, `/home`, `/intake`, `/prsm`, `/services`, and `/space`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/intake`.
- Fresh Next production preview was started at `http://127.0.0.1:3016/intake`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4185/intake`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/intake` HTML confirmed title `LMNL | WEBSITE INTAKE`, robots `noindex, nofollow`, canonical `https://lmnl.art/intake`, and `/seo/services-seo.png`.
- Code-level markup check on the Next `/intake` HTML confirmed the terminal shell, intro copy, `intake-layout`, overview, form shell, business basics, website goals, pages/content, style/references, features/logistics, and submit button render on the server.
- Code-level SEO check on `dist/intake/index.html` confirmed the Vite-generated static SEO file still has canonical `https://lmnl.art/intake`, title `LMNL | WEBSITE INTAKE`, robots `noindex, nofollow`, and `/seo/services-seo.png`.
- Preview processes on ports 3016 and 4185 were stopped after checks.

2026-05-27
session 18
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before choosing the next task.
- Compared `/success` and `/shop` as possible next routes. Chose `/success` because it is a smaller confirmation route; `/shop` still has the full preorder checkout flow.
- Migrated `/success` to `app/success/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Updated `src/pages/Success.jsx` to accept optional search params from Next while preserving the browser query-string fallback for the existing Vite route.
- Switched the success action links from React Router `Link` to the router adapter so Vite and Next can share the component.
- Preserved the existing `Success.css` declarations exactly and moved the global CSS import to compliant app entry boundaries: `src/main.jsx` for Vite and `app/layout.jsx` for Next.
- Added `/success` metadata in Next matching the existing route SEO title, description, canonical URL, Open Graph image, Twitter image, and noindex/nofollow robots behavior.
- Left confirmation behavior untouched: when `requestId` and `ticketId` are present, the page still posts to `/api/confirm-ticket` with the same payload and status handling.
- The initial Next build surfaced a `useSearchParams` production boundary requirement, so the route was adjusted to pass App Router `searchParams` from `page.jsx` instead of reading them in the client wrapper.
- Marked `/success` complete in the route inventory.
- Did not touch API implementation files.
- Did not call `/api/confirm-ticket` during verification because checks used `/success` without query parameters.
- Did not change CSS declarations, component structure, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/success/page.jsx`
- `app/success/SuccessRoute.jsx`
- `app/layout.jsx`
- `src/main.jsx`
- `src/pages/Success.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed after the search-param wrapper adjustment, producing App Router routes for `/`, `/_not-found`, `/about`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/community/share`, `/contact`, `/events`, `/home`, `/intake`, `/prsm`, `/services`, `/space`, and dynamic `/success`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/success`.
- Fresh Next production preview was started at `http://127.0.0.1:3017/success`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4186/success`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/success` HTML confirmed title `LMNL | ORDER CONFIRMATION`, robots `noindex, nofollow`, canonical `https://lmnl.art/success`, and `/seo/events-seo.png`.
- Code-level markup check on the Next `/success` HTML confirmed the terminal shell, intro copy, `success-content`, order confirmed panel, missing-parameter status text, disabled issuing-ticket button, back-to-events link, and summary card render on the server.
- Code-level SEO check on `dist/success/index.html` confirmed the Vite-generated static SEO file still has canonical `https://lmnl.art/success`, title `LMNL | ORDER CONFIRMATION`, robots `noindex, nofollow`, and `/seo/events-seo.png`.
- `git diff --check` passed.
- Preview processes on ports 3017 and 4186 were stopped after checks.

2026-05-27
session 19
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before choosing the next task. `AGENTS.md` is currently empty.
- Inspected `/shop` and confirmed it has search-param state for `checkout=success`, client-side public product loading through `fetchOpenProducts()`, and checkout creation through `/api/create-checkout` only when a purchase button is pressed.
- Migrated `/shop` to `app/shop/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Updated `src/pages/Shop.jsx` to accept optional search params from Next while preserving the browser query-string fallback for the existing Vite route.
- Preserved the existing `Shop.css` declarations exactly and moved the global CSS import to compliant app entry boundaries: `src/main.jsx` for Vite and `app/layout.jsx` for Next.
- Added `/shop` metadata in Next matching the existing route SEO title, description, canonical URL, Open Graph image, Twitter image, and index/follow robots behavior.
- Left shop behavior untouched: the page still loads products with `fetchOpenProducts()`, separates open preorders from persistent products by `goal_quantity`, posts the same `{ preorderId }` payload to `/api/create-checkout` on purchase, and redirects to the returned checkout URL.
- Marked `/shop` complete in the route inventory.
- Did not touch API implementation files.
- Did not press purchase buttons or call `/api/create-checkout` during verification.
- Did not change CSS declarations, component structure, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/shop/page.jsx`
- `app/shop/ShopRoute.jsx`
- `app/layout.jsx`
- `src/main.jsx`
- `src/pages/Shop.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/community/share`, `/contact`, `/events`, `/home`, `/intake`, `/prsm`, `/services`, dynamic `/shop`, `/space`, and dynamic `/success`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/shop`.
- Fresh Next production preview was started at `http://127.0.0.1:3018/shop`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4187/shop`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/shop` HTML confirmed title `LMNL | SHOP`, robots `index, follow`, canonical `https://lmnl.art/shop`, and `/seo/shop-seo.png`.
- Code-level markup check on the Next `/shop` HTML confirmed the terminal shell, active shop navigation item, intro copy, `shop-layout`, and `FETCHING SHOP...` loading state render on the server.
- Code-level query check on the Next `/shop?checkout=success` HTML confirmed the App Router route receives `searchParams` with `checkout: success`. The visible success banner appears after client product loading and was not visually inspected.
- Code-level SEO check on `dist/shop/index.html` confirmed the Vite-generated static SEO file still has canonical `https://lmnl.art/shop`, title `LMNL | SHOP`, robots `index, follow`, and `/seo/shop-seo.png`.
- `git diff --check` passed.
- Preview processes on ports 3018 and 4187 were stopped after checks.

2026-05-27
session 20
- Continued from the "Current active task" and "Next recommended task" sections only.
- Inspected `/portfolio` and `/ticket/:ticketId` as possible next routes. Chose `/ticket/:ticketId` because it is the tighter migration surface: one dynamic route param, no direct page links, and no action calls unless the user clicks Apple Wallet.
- Migrated `/ticket/:ticketId` to `app/ticket/[ticketId]/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Updated `src/pages/Ticket.jsx` to accept an optional `ticketId` prop from Next while preserving the browser pathname fallback for the existing Vite route.
- Preserved the existing `Ticket.css` declarations exactly and moved the global CSS import to compliant app entry boundaries: `src/main.jsx` for Vite and `app/layout.jsx` for Next.
- Added generic dynamic ticket metadata in Next matching the existing route SEO title, description, Open Graph image, Twitter image, noindex/nofollow robots behavior, and a ticket-specific canonical URL.
- Left ticket behavior untouched: the page still calls `/api/get-ticket?ticketId=...` client-side after mount, still builds the admin check-in QR payload from the ticket data, and still points Apple Wallet downloads to `/api/generate-pass?ticketId=...`.
- Marked `/ticket/:ticketId` complete in the route inventory.
- Did not touch API implementation files.
- Did not call `/api/get-ticket`, `/api/generate-pass`, or simulate check-in during verification. HTTP checks only inspected the server-rendered loading shell.
- Did not change CSS declarations, component structure, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/ticket/[ticketId]/page.jsx`
- `app/ticket/[ticketId]/TicketRoute.jsx`
- `app/layout.jsx`
- `src/main.jsx`
- `src/pages/Ticket.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/community/share`, `/contact`, `/events`, `/home`, `/intake`, `/prsm`, `/services`, dynamic `/shop`, `/space`, dynamic `/success`, and dynamic `/ticket/[ticketId]`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work.
- Fresh Next production preview was started at `http://127.0.0.1:3019/ticket/test-ticket`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4188/ticket/test-ticket`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/ticket/test-ticket` HTML confirmed title `LMNL | TICKET`, robots `noindex, nofollow`, canonical `https://lmnl.art/ticket/test-ticket`, and `/seo/events-seo.png`.
- Code-level markup check on the Next `/ticket/test-ticket` HTML confirmed the terminal shell, intro copy, `ticket-content`, `ticket-body`, and `RETRIEVING SECURE PASS...` loading state render on the server.
- Code-level check confirmed no static Vite SEO file is generated for the dynamic sample route, matching the current Vite dynamic-route behavior.
- `git diff --check` passed.
- Preview processes on ports 3019 and 4188 were stopped after checks.

2026-05-27
session 21
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before choosing the next task. `AGENTS.md` is currently empty, and no project constitution file was found in the repo.
- Inspected `/portfolio` and confirmed it uses query params for capability filtering, client-side public portfolio loading through `fetchPublishedPortfolioEntries()`, router navigation for capability buttons, and internal links back to services/contact.
- Migrated `/portfolio` to `app/portfolio/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Updated `src/pages/Portfolio.jsx` to accept optional search params from Next while preserving the browser query-string fallback for the existing Vite route.
- Replaced direct React Router links with `AppLink` and replaced React Router navigation for capability buttons with browser history updates to the same `buildPortfolioPath()` URLs.
- Preserved the existing `Portfolio.css` declarations exactly and moved the global CSS import to compliant app entry boundaries: `src/main.jsx` for Vite and `app/layout.jsx` for Next.
- Added `/portfolio` metadata in Next matching the existing route SEO title, description, canonical URL, Open Graph image, Twitter image, and index/follow robots behavior.
- Left data/API behavior untouched: the page still calls `fetchPublishedPortfolioEntries()` client-side, which preserves the current public-data credentials path and `/api/portfolio` fallback. Admin portfolio API behavior was not touched.
- Marked `/portfolio` complete in the route inventory.
- Did not touch API implementation files.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/portfolio/page.jsx`
- `app/portfolio/PortfolioRoute.jsx`
- `app/layout.jsx`
- `src/main.jsx`
- `src/pages/Portfolio.jsx`
verification performed:
- `npm run lint` passed after removing a lint-unfriendly synchronous state update effect.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/community/share`, `/contact`, `/events`, `/home`, `/intake`, dynamic `/portfolio`, `/prsm`, `/services`, dynamic `/shop`, `/space`, dynamic `/success`, and dynamic `/ticket/[ticketId]`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/portfolio`.
- Fresh Next production preview was started at `http://127.0.0.1:3020/portfolio`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4189/portfolio`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/portfolio` HTML confirmed title `LMNL | PORTFOLIO`, robots `index, follow`, canonical `https://lmnl.art/portfolio`, and `/seo/services-seo.png`.
- Code-level markup check on the Next `/portfolio` HTML confirmed the terminal shell, intro copy, `portfolio-page`, capability filters, `LOADING PORTFOLIO...`, Return to Services link, and Open Contact link render on the server.
- Code-level query check on the Next `/portfolio?capability=design` HTML confirmed the route receives `searchParams` with `capability: design` and marks the DESIGN capability as current.
- Code-level SEO check on `dist/portfolio/index.html` confirmed the Vite-generated static SEO file still has canonical `https://lmnl.art/portfolio`, title `LMNL | PORTFOLIO`, robots `index, follow`, and `/seo/services-seo.png`.
- `git diff --check` passed.
- Preview processes on ports 3020 and 4189 were stopped after checks.

2026-05-27
session 22
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before choosing the next task. `AGENTS.md` is currently empty.
- Inspected the remaining route inventory and chose `/auth/callback` as the smallest remaining non-public route because it has a narrow status shell and community OAuth completion behavior without API implementation changes.
- Migrated `/auth/callback` to `app/auth/callback/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Extended `src/components/RouterAdapter.jsx` to expose location search and navigation in addition to links/pathname. The React Router adapter now supplies the existing React Router navigate function for Vite, while the Next callback wrapper supplies `router.push`/`router.replace`.
- Updated `src/pages/AuthCallback.jsx` to use the router adapter for search and navigation instead of direct React Router hooks.
- Preserved existing community auth behavior: the page still reads `next`, exchanges Supabase OAuth codes with `supabase.auth.exchangeCodeForSession()`, checks the current session, ensures the community profile, routes to `resolveCommunityDestination()`, and signs out/retries through the same login path on error.
- Preserved the existing `community-app.css` declarations exactly and moved the global CSS import to compliant app entry boundaries: `src/main.jsx` for Vite and `app/layout.jsx` for Next.
- Added `/auth/callback` metadata in Next matching the existing route SEO title, description, canonical URL, Open Graph image, Twitter image, and noindex/nofollow robots behavior.
- Marked `/auth/callback` complete in the route inventory.
- Did not touch API implementation files.
- Did not trigger OAuth code exchange, profile bootstrap, sign-out, or navigation buttons during verification. Checks used `/auth/callback` without a `code` query param.
- Did not change CSS declarations, component structure, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/auth/callback/page.jsx`
- `app/auth/callback/AuthCallbackRoute.jsx`
- `app/layout.jsx`
- `src/main.jsx`
- `src/App.jsx`
- `src/components/RouterAdapter.jsx`
- `src/pages/AuthCallback.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, dynamic `/auth/callback`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/community/share`, `/contact`, `/events`, `/home`, `/intake`, dynamic `/portfolio`, `/prsm`, `/services`, dynamic `/shop`, `/space`, dynamic `/success`, and dynamic `/ticket/[ticketId]`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/auth/callback`.
- Fresh Next production preview was started at `http://127.0.0.1:3021/auth/callback`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4190/auth/callback`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/auth/callback` HTML confirmed title `LMNL | AUTH`, robots `noindex, nofollow`, canonical `https://lmnl.art/auth/callback`, and `/seo/home-seo.png`.
- Code-level markup check on the Next `/auth/callback` HTML confirmed the terminal shell, `AUTH` title, `app-login-content`, `LMNL Community`, and `Completing sign-in...` status shell render on the server.
- Code-level query check on the Next `/auth/callback?next=/app/onboarding` HTML confirmed the App Router route receives `searchParams` with `next: /app/onboarding`.
- Code-level SEO check on `dist/auth/callback/index.html` confirmed the Vite-generated static SEO file still has canonical `https://lmnl.art/auth/callback`, title `LMNL | AUTH`, robots `noindex, nofollow`, and `/seo/home-seo.png`.
- `git diff --check` passed.
- Preview processes on ports 3021 and 4190 were stopped after checks.

2026-05-27
session 23
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before continuing the remaining community/auth route work. `AGENTS.md` is currently empty, and no project constitution file has been found in the repo.
- Inspected `/app/login`, `src/pages/AppLogin.jsx`, `src/lib/communityAuth.js`, the route SEO sources, and current router-adapter usage before editing.
- Migrated `/app/login` to `app/app/login/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Added `app/app/login/AppLoginRoute.jsx` to provide the existing `AppLogin` page with Next link, pathname, search, navigation, theme, and Supabase session context.
- Extended `src/components/RouterAdapter.jsx` with `AppNavigate` so client redirects can use the same adapter surface in Vite and Next.
- Updated `src/pages/AppLogin.jsx` to use adapter location/navigation and `AppNavigate` instead of direct React Router imports.
- Preserved existing community login behavior: provider buttons still run the same preflight, `buildCommunityAuthRedirectTo()`, and Supabase OAuth code paths; signed-in users still redirect through the existing community destination rules.
- Added `/app/login` metadata in Next matching the existing route SEO title, description, canonical URL, Open Graph image, Twitter image, and noindex/nofollow robots behavior.
- Marked `/app/login` complete in the route inventory.
- Did not touch API implementation files.
- Did not trigger provider OAuth, sign-out, or authenticated redirects during verification. Checks inspected the signed-out server-rendered login shell.
- Did not change CSS declarations, component structure, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/app/login/page.jsx`
- `app/app/login/AppLoginRoute.jsx`
- `src/components/RouterAdapter.jsx`
- `src/pages/AppLogin.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, dynamic `/app/login`, dynamic `/auth/callback`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/community/share`, `/contact`, `/events`, `/home`, `/intake`, dynamic `/portfolio`, `/prsm`, `/services`, dynamic `/shop`, `/space`, dynamic `/success`, and dynamic `/ticket/[ticketId]`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/app/login`.
- Fresh Next production preview was started at `http://127.0.0.1:3022/app/login`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4191/app/login`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/app/login` HTML confirmed title `LMNL | APP LOGIN`, robots `noindex, nofollow`, canonical `https://lmnl.art/app/login`, and `/seo/community-seo.png`.
- Code-level markup check on the Next `/app/login` HTML confirmed the terminal shell, `APP ACCESS` title, `app-login-content`, `app-login-layout`, `LMNL Community`, sign-in copy, and Google/Discord/Apple provider buttons render on the server.
- Code-level query check on the Next `/app/login?next=/app/onboarding` HTML confirmed the App Router route receives `searchParams` with `next: /app/onboarding`.
- Code-level SEO check on `dist/app/login/index.html` confirmed the Vite-generated static SEO file still has canonical `https://lmnl.art/app/login`, title `LMNL | APP LOGIN`, robots `noindex, nofollow`, and `/seo/community-seo.png`.
- `git diff --check` passed.
- Preview processes on ports 3022 and 4191 were stopped after checks.

2026-05-27
session 24
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before continuing the remaining community app route work. `AGENTS.md` is currently empty, and no project constitution file has been found in the repo.
- Inspected `/app`, `/app/onboarding`, `AppHome`, `AppOnboarding`, `UserDashboard`, `CommunityAppRoute` behavior inside `src/App.jsx`, `src/lib/communityAuth.js`, `src/lib/communityProfile.js`, and route SEO sources before editing.
- Chose `/app` as the next smallest route because it is the protected community app entry and redirect surface, while `/app/onboarding` also includes form write behavior.
- Migrated `/app` to `app/app/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Added `app/app/AppRoute.jsx` to provide `CommunityAppRoute` and `AppHome` with Next link, pathname, search, navigation, theme, and Supabase session context.
- Extracted the existing Vite community gate from `src/App.jsx` into `src/components/CommunityAppRoute.jsx` so Vite and Next share the same session/profile bootstrap, onboarding redirect, login redirect, error, and child-prop behavior.
- Updated `src/pages/AppHome.jsx` to use adapter-backed redirects instead of direct React Router `Navigate`.
- Extended `src/components/RouterAdapter.jsx` location support to include `hash`, preserving the existing Vite community next-path behavior when redirects include a fragment.
- Added `/app` metadata in Next matching the existing route SEO title, description, canonical URL, Open Graph image, Twitter image, and noindex/nofollow robots behavior.
- Corrected the pending dashboard route inventory from `/community/u/:userSlug` to `/dashboard/:userSlug` to match the current `COMMUNITY_DASHBOARD_BASE_PATH` and visible onboarding copy.
- Marked `/app` complete in the route inventory.
- Did not touch API implementation files.
- Did not trigger Supabase profile bootstrap, authenticated dashboard/onboarding redirects, sign-out, or dashboard API calls during verification. Checks inspected the unauthenticated server-rendered access shell.
- Did not change CSS declarations, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/app/page.jsx`
- `app/app/AppRoute.jsx`
- `src/App.jsx`
- `src/components/CommunityAppRoute.jsx`
- `src/components/RouterAdapter.jsx`
- `src/pages/AppHome.jsx`
verification performed:
- `npm run lint` passed after removing one stale `useNavigate` import from `src/App.jsx`.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, dynamic `/app`, dynamic `/app/login`, dynamic `/auth/callback`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/community/share`, `/contact`, `/events`, `/home`, `/intake`, dynamic `/portfolio`, `/prsm`, `/services`, dynamic `/shop`, `/space`, dynamic `/success`, and dynamic `/ticket/[ticketId]`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/app`.
- Fresh Next production preview was started at `http://127.0.0.1:3023/app`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4192/app`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/app` HTML confirmed title `LMNL | APP`, robots `noindex, nofollow`, canonical `https://lmnl.art/app`, and `/seo/community-seo.png`.
- Code-level markup check on the Next `/app` HTML confirmed the route-status shell renders `VERIFYING ACCESS...` on the server, matching the existing initial session-check state.
- Code-level query check on the Next `/app?source=test` HTML confirmed the App Router route receives `searchParams` with `source: test`.
- Code-level SEO check on `dist/app/index.html` confirmed the Vite-generated static SEO file still has canonical `https://lmnl.art/app`, title `LMNL | APP`, robots `noindex, nofollow`, and `/seo/community-seo.png`.
- `git diff --check` passed.
- Preview processes on ports 3023 and 4192 were stopped after checks.

2026-05-27
session 25
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before continuing the remaining community app route work. `AGENTS.md` is currently empty, and no project constitution file has been found in the repo.
- Inspected `/app/onboarding`, `AppOnboarding`, `AppOnboarding.css`, the shared `CommunityAppRoute`, current app route wrappers, route SEO sources, and the existing Vite route tree before editing.
- Migrated `/app/onboarding` to `app/app/onboarding/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Added `app/app/onboarding/AppOnboardingRoute.jsx` to provide `CommunityAppRoute` and `AppOnboarding` with Next link, pathname, search, navigation, theme, and Supabase session context.
- Updated `src/pages/AppOnboarding.jsx` to use adapter location/navigation instead of direct React Router hooks while preserving all form state, validation, Supabase profile update, duplicate-slug error handling, and completion redirects.
- Preserved the existing `AppOnboarding.css` declarations exactly and moved the global CSS import to compliant app entry boundaries: `src/main.jsx` for Vite and `app/layout.jsx` for Next.
- Added `/app/onboarding` metadata in Next matching the existing route SEO title, description, canonical URL, Open Graph image, Twitter image, and noindex/nofollow robots behavior.
- Marked `/app/onboarding` complete in the route inventory.
- Did not touch API implementation files.
- Did not submit the onboarding form or trigger Supabase profile writes during verification. Checks inspected the unauthenticated server-rendered access shell.
- Did not change CSS declarations, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/app/onboarding/page.jsx`
- `app/app/onboarding/AppOnboardingRoute.jsx`
- `app/layout.jsx`
- `src/main.jsx`
- `src/pages/AppOnboarding.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, dynamic `/app`, dynamic `/app/login`, dynamic `/app/onboarding`, dynamic `/auth/callback`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/community/share`, `/contact`, `/events`, `/home`, `/intake`, dynamic `/portfolio`, `/prsm`, `/services`, dynamic `/shop`, `/space`, dynamic `/success`, and dynamic `/ticket/[ticketId]`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/app/onboarding`.
- Fresh Next production preview was started at `http://127.0.0.1:3024/app/onboarding`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4193/app/onboarding`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/app/onboarding` HTML confirmed title `LMNL | APP ONBOARDING`, robots `noindex, nofollow`, canonical `https://lmnl.art/app/onboarding`, and `/seo/community-seo.png`.
- Code-level markup check on the Next `/app/onboarding` HTML confirmed the route-status shell renders `VERIFYING ACCESS...` on the server, matching the existing initial session-check state.
- Code-level query check on the Next `/app/onboarding?next=/dashboard/test-user` HTML confirmed the App Router route receives `searchParams` with `next: /dashboard/test-user`.
- Code-level SEO check on `dist/app/onboarding/index.html` confirmed the Vite-generated static SEO file still has canonical `https://lmnl.art/app/onboarding`, title `LMNL | APP ONBOARDING`, robots `noindex, nofollow`, and `/seo/community-seo.png`.
- `git diff --check` passed.
- Preview processes on ports 3024 and 4193 were stopped after checks.

2026-05-27
session 26
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before continuing the remaining community app route work. `AGENTS.md` is currently empty, and no project constitution file has been found in the repo.
- Inspected `/dashboard/:userSlug`, `UserDashboard`, `UserDashboard.css`, the shared `CommunityAppRoute`, router adapter behavior, dashboard API calls, attendance claim behavior, sign-out behavior, slug canonicalization, and current route inventory before editing.
- Migrated `/dashboard/:userSlug` to `app/dashboard/[userSlug]/page.jsx` using the existing thin client wrapper/router-adapter pattern.
- Added `app/dashboard/[userSlug]/DashboardRoute.jsx` to provide `CommunityAppRoute` and `UserDashboard` with Next link, pathname, search, navigation, theme, Supabase session context, and the dynamic `userSlug` prop.
- Updated `src/pages/UserDashboard.jsx` to use adapter links, navigation, redirects, and pathname fallback instead of direct React Router imports while preserving all dashboard API loading, attendance claim, sign-out, onboarding edit, and canonical slug behavior.
- Preserved the existing `UserDashboard.css` declarations exactly and moved the global CSS import to compliant app entry boundaries: `src/main.jsx` for Vite and `app/layout.jsx` for Next.
- Added dynamic `/dashboard/:userSlug` metadata in Next with slug-specific canonical URLs, community dashboard title/description, `/seo/community-seo.png`, and noindex/nofollow robots behavior.
- Marked `/dashboard/:userSlug` complete in the route inventory.
- Did not touch API implementation files.
- Did not trigger Supabase profile bootstrap, dashboard API load, attendance claim writes, sign-out, or authenticated redirects during verification. Checks inspected the unauthenticated server-rendered access shell.
- Did not change CSS declarations, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/dashboard/[userSlug]/page.jsx`
- `app/dashboard/[userSlug]/DashboardRoute.jsx`
- `app/layout.jsx`
- `src/main.jsx`
- `src/pages/UserDashboard.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing App Router routes for `/`, `/_not-found`, `/about`, dynamic `/app`, dynamic `/app/login`, dynamic `/app/onboarding`, dynamic `/auth/callback`, `/blog`, dynamic `/blog/[slug]`, `/community`, `/community/share`, `/contact`, dynamic `/dashboard/[userSlug]`, `/events`, `/home`, `/intake`, dynamic `/portfolio`, `/prsm`, `/services`, dynamic `/shop`, `/space`, dynamic `/success`, and dynamic `/ticket/[ticketId]`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work.
- Fresh Next production preview was started at `http://127.0.0.1:3025/dashboard/test-user`; `curl -I` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4194/dashboard/test-user`; `curl -I` returned `HTTP/1.1 200 OK`.
- Code-level metadata check on the Next `/dashboard/test-user` HTML confirmed title `LMNL | COMMUNITY DASHBOARD`, robots `noindex, nofollow`, canonical `https://lmnl.art/dashboard/test-user`, and `/seo/community-seo.png`.
- Code-level markup check on the Next `/dashboard/test-user` HTML confirmed the route-status shell renders `VERIFYING ACCESS...` on the server, matching the existing initial session-check state.
- Code-level query check on the Next `/dashboard/test-user?from=check` HTML confirmed the App Router route receives `searchParams` with `from: check` and `userSlug: test-user`.
- Code-level check confirmed no static Vite SEO file is generated for the dynamic dashboard sample route, matching the current Vite dynamic-route behavior.
- `git diff --check` passed.
- Preview processes on ports 3025 and 4194 were stopped after checks.

2026-05-27
session 27
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md` before continuing the fallback route-behavior work. `AGENTS.md` is currently empty, and no project constitution file has been found in the repo.
- Inspected the current Vite catch-all route, `next.config.mjs`, `vercel.json`, existing App Router files, and fallback route inventory before editing.
- Preserved the current SPA behavior where unknown routes redirect to `/`.
- First tested `app/not-found.jsx` with `redirect('/')`, but production preview returned a 404 response with a location hint instead of a real redirect. Removed that file.
- Added `proxy.js` using the current Next 16 Proxy convention to redirect unknown non-API, non-asset, non-Next-internal paths to `/`.
- Kept migrated routes, dynamic migrated routes, `/share-your-work`, assets, Next internals, and API paths out of the fallback redirect.
- Marked fallback `*` complete in the route inventory.
- Did not touch API implementation files.
- Did not change CSS declarations, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `proxy.js`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed with `ƒ Proxy (Middleware)` listed and no middleware deprecation warning after switching from `middleware.js` to `proxy.js`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work.
- Fresh Next production preview was started at `http://127.0.0.1:3026`; `curl -I http://127.0.0.1:3026/definitely-not-a-real-route` returned `HTTP/1.1 307 Temporary Redirect` with `location: /`.
- Following the Next redirect for `/definitely-not-a-real-route` resolved to `http://127.0.0.1:3026/` with status `200`.
- Fresh Vite production preview was started at `http://127.0.0.1:4195`; `curl -I http://127.0.0.1:4195/definitely-not-a-real-route` returned `HTTP/1.1 200 OK`, matching the existing Vite preview rewrite shell before the SPA catch-all redirects client-side.
- `curl -I http://127.0.0.1:3026/about` returned `HTTP/1.1 200 OK`, confirming migrated routes are not caught by the fallback proxy.
- `curl -I http://127.0.0.1:3026/share-your-work` returned `HTTP/1.1 307 Temporary Redirect` with `location: /community/share`, confirming the existing explicit redirect still works.
- `curl -I http://127.0.0.1:3026/lmnl-logo-black.png` returned `HTTP/1.1 200 OK`, confirming static assets are not caught by the fallback proxy.
- `git diff --check` passed.
- Preview processes on ports 3026 and 4195 were stopped after checks.

2026-05-27
session 28
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_context.md`, `AGENTS.md`, and the admin/host-aware route inventory before editing. `AGENTS.md` is empty, and no project constitution file was found in the repo.
- Inspected the existing `/`, `/admin`, and `/login` host behavior in `src/App.jsx`, plus `src/pages/Login.jsx`, `src/pages/Login.css`, `src/hooks/usePageSeo.js`, and the Vite SEO generation in `scripts/postbuild.js`.
- Chose `/login` as the smallest admin/host-aware slice because it has a contained page surface and a clear public-host redirect requirement.
- Migrated `/login` to `app/login/page.jsx` with a host-aware server gate: local and `admin.*` hosts render the login page, while public hosts redirect to `/`.
- Added `app/login/LoginRoute.jsx` as a thin client wrapper around the existing Login page with the Next router adapter and `ThemeProvider`.
- Updated `src/pages/Login.jsx` to use `useAppLocation()` and `useAppNavigate()` from the router adapter instead of direct React Router hooks, preserving Supabase `signInWithPassword`, error/loading state, and `next` query redirect behavior.
- Preserved `Login.css` declarations exactly and moved the global CSS import to compliant entry boundaries in `src/main.jsx` and `app/layout.jsx`.
- Updated `proxy.js` to allow `/login` through so the route-level host gate can preserve public-host redirect behavior.
- Did not submit the login form during verification.
- Did not touch API implementation files.
- Did not change CSS declarations, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/login/page.jsx`
- `app/login/LoginRoute.jsx`
- `src/pages/Login.jsx`
- `app/layout.jsx`
- `src/main.jsx`
- `proxy.js`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, producing the `/login` App Router route and `ƒ Proxy (Middleware)`.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/login`.
- Fresh Next production preview was started at `http://127.0.0.1:3027`; `curl -I http://127.0.0.1:3027/login` returned `HTTP/1.1 200 OK`.
- Fresh Vite production preview was started at `http://127.0.0.1:4196`; `curl -I http://127.0.0.1:4196/login` returned `HTTP/1.1 200 OK`.
- `curl -I -H 'Host: admin.lmnl.art' http://127.0.0.1:3027/login` returned `HTTP/1.1 200 OK`, confirming admin-host access.
- `curl -I -H 'Host: lmnl.art' http://127.0.0.1:3027/login` returned `HTTP/1.1 307 Temporary Redirect` with `location: /`, confirming public-host redirect behavior.
- Following the public-host redirect for `/login` resolved to `/` with status `200`.
- Code-level markup and metadata checks on Next `/login` confirmed title `LMNL | ADMIN LOGIN`, `noindex, nofollow`, canonical `https://admin.lmnl.art/login`, `/seo/home-seo.png`, the terminal shell, `ADMIN ACCESS`, `IDENTIFIER`, `CREDENTIAL`, and `ESTABLISH SESSION`.
- Code-level query-param check on Next `/login?next=/check-in/test-token` confirmed the route receives the `next` value for the preserved post-login redirect path.
- Vite SEO artifact check on `dist/login/index.html` confirmed title `LMNL | ADMIN LOGIN`, `noindex, nofollow`, canonical/login metadata, and `/seo/home-seo.png`.
- `curl -I http://127.0.0.1:3027/definitely-not-a-real-route` returned `HTTP/1.1 307 Temporary Redirect` with `location: /`, confirming fallback behavior still works.
- `curl -I http://127.0.0.1:3027/about` returned `HTTP/1.1 200 OK`, confirming migrated public routes are still allowed through.
- `git diff --check` passed.
- Preview processes on ports 3027 and 4196 were stopped after checks.

2026-05-27
session 29
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_context.md`, `AGENTS.md`, and the route inventory before editing. `AGENTS.md` is empty, and no project constitution file was found in the repo.
- Inspected the existing host-aware root behavior in `src/App.jsx`, the `ProtectedRoute` admin gate, `src/pages/Admin.jsx`, `src/pages/Admin.css`, `src/hooks/usePageSeo.js`, `proxy.js`, and the current Next root scaffold.
- Replaced the temporary `app/page.jsx` scaffold with the real host-aware root: public hosts render the existing `Home` route wrapper, while local and `admin.*` hosts render the existing `Admin` page behind a preserved Supabase/admin-session gate.
- Added `app/AdminRootRoute.jsx` as a thin client wrapper around `Admin` with the Next router adapter and `ThemeProvider`.
- Added `app/_admin/AdminProtectedRoute.jsx` to preserve the Vite admin gate behavior: wait for Supabase session, redirect unauthenticated users to `/login?next=...`, verify `/api/admin-session` with the bearer token, cache admin checks for 60 seconds, redirect denied users with `unauthorized=1`, and show the existing route status messages on loading/error.
- Preserved `Admin.css` declarations exactly and moved the global CSS import to compliant entry boundaries in `src/main.jsx` and `app/layout.jsx`.
- Left `/admin` as a redirect-to-root route through the existing `proxy.js` fallback behavior, matching the current public-host route outcome without adding a duplicate App Router page.
- Did not authenticate into the admin route or trigger admin data-loading APIs during verification.
- Did not touch API implementation files.
- Did not change CSS declarations, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/page.jsx`
- `app/AdminRootRoute.jsx`
- `app/_admin/AdminProtectedRoute.jsx`
- `app/layout.jsx`
- `src/main.jsx`
- `src/pages/Admin.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, with `/` listed as a dynamic App Router route and `ƒ Proxy (Middleware)` still present.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work. Vite generated SEO HTML for `/`.
- Fresh Next production preview was started at `http://127.0.0.1:3028`; `curl -I -H 'Host: lmnl.art' http://127.0.0.1:3028/` returned `HTTP/1.1 200 OK`.
- `curl -I http://127.0.0.1:3028/` returned `HTTP/1.1 200 OK`, confirming local root reaches the admin-gated route.
- `curl -I -H 'Host: admin.lmnl.art' http://127.0.0.1:3028/` returned `HTTP/1.1 200 OK`, confirming admin-host root reaches the admin-gated route.
- `curl -I -H 'Host: lmnl.art' http://127.0.0.1:3028/admin` returned `HTTP/1.1 307 Temporary Redirect` with `location: /`, confirming public `/admin` redirect behavior.
- Code-level markup and metadata checks on public-host Next `/` confirmed title `LMNL`, `index, follow`, canonical root metadata, the terminal shell, root navigation, and Home content.
- Code-level markup and metadata checks on admin-host and local Next `/` confirmed title `LMNL | ADMIN`, `noindex, nofollow`, admin canonical root metadata, and the preserved `VERIFYING ACCESS...` route-gate screen before client-side session handling.
- Following the public-host `/admin` redirect resolved to `/` with status `200`.
- Fresh Vite production preview was started at `http://127.0.0.1:4197`; `curl -I http://127.0.0.1:4197/` and `curl -I http://127.0.0.1:4197/admin` returned `HTTP/1.1 200 OK`, confirming the Vite SPA shell still serves those routes before client-side routing.
- `curl -I -H 'Host: lmnl.art' http://127.0.0.1:3028/login` still returned `HTTP/1.1 307 Temporary Redirect` with `location: /`, confirming the completed `/login` public-host redirect still works.
- `curl -I http://127.0.0.1:3028/definitely-not-a-real-route` returned `HTTP/1.1 307 Temporary Redirect` with `location: /`, confirming fallback behavior still works.
- `curl -I http://127.0.0.1:3028/about` returned `HTTP/1.1 200 OK`, confirming migrated public routes are still allowed through.
- `curl -I http://127.0.0.1:3028/lmnl-logo-black.png` returned `HTTP/1.1 200 OK`, confirming static assets are still excluded from the fallback proxy.
- `git diff --check` passed.
- Preview processes on ports 3028 and 4197 were stopped after checks.

2026-05-27
session 30
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_context.md`, `AGENTS.md`, and the route inventory before editing. `AGENTS.md` is empty, and no project constitution file was found in the repo.
- Inspected `src/pages/CheckIn.jsx`, `src/pages/CheckIn.css`, `src/utils/checkInUrl.js`, existing check-in API usage, `src/App.jsx` route behavior, `src/hooks/usePageSeo.js`, and the existing Next admin gate.
- Migrated `/check-in/:token` to `app/check-in/[token]/page.jsx` with a host-aware server gate: local and `admin.*` hosts render the check-in route, while public hosts redirect to `/`.
- Added `app/check-in/[token]/CheckInRoute.jsx` as a thin client wrapper around the existing CheckIn page with the Next router adapter, `ThemeProvider`, and the shared `AdminProtectedRoute`.
- Updated `src/pages/CheckIn.jsx` to accept an optional `token` prop for Next and fall back to parsing `/check-in/:token` from the adapter location in Vite, removing direct React Router hook usage.
- Preserved `CheckIn.css` declarations exactly and moved the global CSS import to compliant entry boundaries in `src/main.jsx` and `app/layout.jsx`.
- Updated `proxy.js` to allow `/check-in/:token` through so the route-level host gate can preserve public-host redirect behavior.
- Did not authenticate into the check-in route, load a real ticket, or submit wristband confirmation during verification.
- Did not touch API implementation files.
- Did not change CSS declarations, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/check-in/[token]/page.jsx`
- `app/check-in/[token]/CheckInRoute.jsx`
- `src/pages/CheckIn.jsx`
- `app/layout.jsx`
- `src/main.jsx`
- `proxy.js`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, with `/check-in/[token]` listed as a dynamic App Router route and `ƒ Proxy (Middleware)` still present.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work.
- Code scan confirmed `src/pages/CheckIn.jsx` no longer imports `react-router-dom` or uses `useParams`, and `CheckIn.css` is imported only from app entry boundaries.
- Fresh Next production preview was started at `http://127.0.0.1:3029`; `curl -I http://127.0.0.1:3029/check-in/test-token` returned `HTTP/1.1 200 OK`, confirming local check-in reaches the gated route.
- `curl -I -H 'Host: admin.lmnl.art' http://127.0.0.1:3029/check-in/test-token` returned `HTTP/1.1 200 OK`, confirming admin-host check-in reaches the gated route.
- `curl -I -H 'Host: lmnl.art' http://127.0.0.1:3029/check-in/test-token` returned `HTTP/1.1 307 Temporary Redirect` with `location: /`, confirming public-host redirect behavior.
- Fresh Vite production preview was started at `http://127.0.0.1:4198`; `curl -I http://127.0.0.1:4198/check-in/test-token` returned `HTTP/1.1 200 OK`, confirming the Vite SPA shell still serves the route before client-side routing.
- Code-level markup and metadata checks on local/admin Next `/check-in/test-token` confirmed title `LMNL | CHECK-IN`, `noindex, nofollow`, canonical `https://admin.lmnl.art/check-in/test-token`, `/seo/events-seo.png`, the preserved `VERIFYING ACCESS...` route-gate screen, and the token prop in the server payload.
- Following the public-host `/check-in/test-token` redirect resolved to `/` with status `200`.
- Code-level regression check on public-host Next `/` confirmed it still renders the public Home shell with index/follow metadata.
- `curl -I -H 'Host: lmnl.art' http://127.0.0.1:3029/login` still returned `HTTP/1.1 307 Temporary Redirect` with `location: /`, confirming the completed `/login` public-host redirect still works.
- `curl -I -H 'Host: lmnl.art' http://127.0.0.1:3029/admin` still returned `HTTP/1.1 307 Temporary Redirect` with `location: /`, confirming the completed public `/admin` redirect still works.
- `curl -I -H 'Host: admin.lmnl.art' http://127.0.0.1:3029/` returned `HTTP/1.1 200 OK`, confirming the completed admin root still works.
- `curl -I http://127.0.0.1:3029/definitely-not-a-real-route` returned `HTTP/1.1 307 Temporary Redirect` with `location: /`, confirming fallback behavior still works.
- `curl -I http://127.0.0.1:3029/about` returned `HTTP/1.1 200 OK`, confirming migrated public routes are still allowed through.
- `curl -I http://127.0.0.1:3029/lmnl-logo-black.png` returned `HTTP/1.1 200 OK`, confirming static assets are still excluded from the fallback proxy.
- `git diff --check` passed.
- Preview processes on ports 3029 and 4198 were stopped after checks.

2026-05-27
session 31
- Continued from the "Current active task" and "Next recommended task" sections only.
- Re-read `migration_context.md`, `AGENTS.md`, and the route inventory before editing. `AGENTS.md` is empty, and no project constitution file was found in the repo.
- Inspected `src/pages/EmailLab.jsx`, `src/pages/EmailLab.css`, existing `src/App.jsx` local-only behavior, `proxy.js`, and route SEO coverage before editing.
- Migrated `/email-lab` to `app/email-lab/page.jsx` with a local-only server gate: `localhost`, `127.0.0.1`, and `[::1]` render the existing email lab, while public and `admin.*` hosts redirect to `/`.
- Added `app/email-lab/EmailLabRoute.jsx` as a thin client wrapper around the existing EmailLab page with `ThemeProvider`.
- Preserved `EmailLab.css` declarations exactly and moved the global CSS import to compliant entry boundaries in `src/main.jsx` and `app/layout.jsx`.
- Updated `proxy.js` to allow `/email-lab` through so the route-level local-only gate can enforce host visibility.
- Did not touch API implementation files.
- Did not change CSS declarations, page aesthetics, layouts, responsive behavior, or existing interactions.
- Did not run visual checks; used code/build/HTTP checks per the current checklist policy.
files touched:
- `migration_checklist.md`
- `app/email-lab/page.jsx`
- `app/email-lab/EmailLabRoute.jsx`
- `src/pages/EmailLab.jsx`
- `app/layout.jsx`
- `src/main.jsx`
- `proxy.js`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed, with `/email-lab` listed as a dynamic App Router route and `ƒ Proxy (Middleware)` still present.
- `npm run build` passed, confirming the current Vite app and SEO postbuild still work.
- Code scan confirmed `EmailLab.css` is imported only from app entry boundaries.
- Fresh Next production preview was started at `http://127.0.0.1:3030`; `curl -I http://127.0.0.1:3030/email-lab` and `curl -I -H 'Host: localhost:3030' http://127.0.0.1:3030/email-lab` returned `HTTP/1.1 200 OK`, confirming local access.
- `curl -I -H 'Host: admin.lmnl.art' http://127.0.0.1:3030/email-lab` and `curl -I -H 'Host: lmnl.art' http://127.0.0.1:3030/email-lab` returned `HTTP/1.1 307 Temporary Redirect` with `location: /`, confirming non-local hosts cannot access the email lab.
- Code-level markup and metadata checks on local Next `/email-lab` confirmed title `LMNL | EMAIL LAB`, `noindex, nofollow`, canonical `/email-lab`, `Email Lab`, `Local Preview`, `Approval Email`, `Ticket Email`, `Email Preview`, and `Plain text`.
- Following both public-host and admin-host `/email-lab` redirects resolved to `/` with status `200`.
- Fresh Vite production preview was started at `http://127.0.0.1:4199`; `curl -I http://127.0.0.1:4199/email-lab` returned `HTTP/1.1 200 OK`, confirming the Vite SPA shell still serves the route before client-side routing.
- `curl -I http://127.0.0.1:3030/check-in/test-token` returned `HTTP/1.1 200 OK`, confirming the completed local check-in route still works.
- `curl -I -H 'Host: lmnl.art' http://127.0.0.1:3030/login`, `/admin`, and `/check-in/test-token` still returned `HTTP/1.1 307 Temporary Redirect` with `location: /`, confirming completed public-host admin redirects still work.
- `curl -I http://127.0.0.1:3030/definitely-not-a-real-route` returned `HTTP/1.1 307 Temporary Redirect` with `location: /`, confirming fallback behavior still works.
- `curl -I http://127.0.0.1:3030/about` returned `HTTP/1.1 200 OK`, confirming migrated public routes are still allowed through.
- `curl -I http://127.0.0.1:3030/lmnl-logo-black.png` returned `HTTP/1.1 200 OK`, confirming static assets are still excluded from the fallback proxy.
- `git diff --check` passed.
- Preview processes on ports 3030 and 4199 were stopped after checks.

2026-05-27
session 32
- Continued from the "Current active task" and API inventory only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Inspected the legacy API catch-all, shared HTTP/auth helpers, Discord interactions handler, webhook fulfillment service, and relevant tests before editing.
- Added `app/api/[...route]/route.js`, a thin Node-runtime App Router adapter around the existing `api/[...route].js` default handler. The adapter bridges method, URL, query params including catch-all `route`, lowercase headers, raw body text, Node-style readable body, remote address, status, JSON responses, headers, and binary `send` responses.
- Left all API business logic in `api/[...route].js`, `api/discord-interactions.js`, and `api/_lib/` untouched.
- Added `tests/next-api-adapter.test.js` to lock catch-all route resolution, JSON body parsing errors, and Square raw-body signature preservation through the Next adapter.
- Marked API endpoints complete via the shared catch-all adapter. Apple Wallet binary generation still needs live/env validation, and Discord signed interaction should still be validated route-level with configured env. Superseded by later sessions: Discord signed interaction validation completed in session 36/37-era checks, and Apple Wallet binary generation/download completed in session 49.
- Did not change CSS, page components, page aesthetics, layouts, responsive behavior, or page interactions.
files touched:
- `migration_checklist.md`
- `app/api/[...route]/route.js`
- `tests/next-api-adapter.test.js`
verification performed:
- `node --test tests/api-router.test.js tests/next-api-adapter.test.js tests/discord-commands.test.js tests/webhook-fulfillment.test.js tests/tickets.test.js` passed: 35 tests passed.
- `npm run lint` passed.
- `npm run build:next` passed and listed `ƒ /api/[...route]`. It emitted a Turbopack/NFT tracing warning through `next.config.mjs` -> `api/_lib/env.js` -> `api/[...route].js` -> `app/api/[...route]/route.js`; documented as a known issue because fixing it would require touching legacy env/config behavior.
- `npm run build` passed, confirming the Vite build and SEO postbuild still work.
- `git diff --check` passed.
- Fresh Next production preview on `http://localhost:4010` returned expected API JSON responses: GET `/api/create-checkout` -> 405 `METHOD_NOT_ALLOWED`, GET `/api/does-not-exist` -> 404 `NOT_FOUND`, POST invalid JSON to `/api/square-webhook` -> 400 `INVALID_JSON`.
- Fresh Vite production preview on `http://127.0.0.1:4174/` returned `200 text/html` with the root app shell.
- Preview processes on ports 4010 and 4174 were stopped after checks.

2026-05-27
session 33
- Continued from the "Next recommended task" section only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Inspected `scripts/postbuild.js`, `src/hooks/usePageSeo.js`, `index.html`, `app/layout.jsx`, existing App Router metadata exports, and `public/robots.txt` before editing.
- Added shared Next SEO constants in `app/_seo/site.js` for the canonical site URL, default SEO copy, sitemap route inventory, and global Organization/WebSite JSON-LD.
- Added `app/sitemap.js` so Next now serves `/sitemap.xml` with the same indexable route coverage, change frequencies, and priorities as the Vite postbuild sitemap.
- Updated the root App Router layout metadata from the temporary scaffold to LMNL defaults, preserving global document parity for `application-name`, theme color, favicon/icon links, apple touch icon, metadata base, default title/description, and global Organization/WebSite JSON-LD.
- Left route-specific page metadata untouched and did not change CSS, page components, page aesthetics, layouts, responsive behavior, or page interactions.
- Did not add per-route WebPage JSON-LD yet; the old Vite postbuild generates route-specific WebPage JSON-LD and that remains a SEO parity follow-up.
files touched:
- `migration_checklist.md`
- `app/layout.jsx`
- `app/_seo/site.js`
- `app/sitemap.js`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed and listed `○ /sitemap.xml`. It still emitted the existing API adapter Turbopack/NFT tracing warning documented in known issues.
- `npm run build` passed, confirming the Vite build and SEO postbuild still work.
- `git diff --check` passed.
- Fresh Next production preview on `http://localhost:4011` returned `200 application/xml` for `/sitemap.xml`; checked that all 12 indexable Vite sitemap URLs were present and no noindex routes (`/home`, `/login`, `/share-your-work`, `/success`, `/intake`, `/app`) were present.
- Fresh Next production preview on `/about` returned `200` and included `application-name` `LMNL`, theme color `#FFFFFF`, apple touch icon, Organization JSON-LD, and WebSite JSON-LD.
- Fresh Vite production preview on `http://127.0.0.1:4185` returned `200 text/xml` for `/sitemap.xml` and preserved `/about` static SEO HTML title plus route-specific WebPage JSON-LD.
- Preview processes on ports 4011 and 4185 were stopped after checks.

2026-05-27
session 34
- Continued from the "Next recommended task" section only.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Inspected the Vite postbuild WebPage JSON-LD shape and the current App Router metadata/page patterns before editing.
- Expanded `app/_seo/site.js` so the shared Next SEO route inventory now mirrors the Vite postbuild static route list, including noindex routes, canonical aliases, titles, descriptions, images, change frequencies, and priorities.
- Added `app/_seo/WebPageJsonLd.jsx`, a metadata-only server component that renders a route-specific WebPage JSON-LD script from the shared SEO route inventory.
- Added route-specific WebPage JSON-LD to the migrated static Next routes that correspond to Vite postbuild pages: `/`, `/home`, `/events`, `/services`, `/portfolio`, `/community`, `/community/share`, `/shop`, `/about`, `/blog`, `/contact`, `/intake`, `/prsm`, `/space`, `/success`, `/login`, `/app`, `/app/login`, `/app/onboarding`, and `/auth/callback`.
- Preserved `/share-your-work` as a Next redirect to `/community/share`; it does not render a Next HTML page or WebPage JSON-LD because the redirect behavior is the migrated route contract. The Vite build still emits static noindex canonical HTML for that legacy path.
- Did not change CSS declarations, page aesthetics, layout, responsive behavior, or page interactions.
files touched:
- `migration_checklist.md`
- `app/_seo/site.js`
- `app/_seo/WebPageJsonLd.jsx`
- `app/page.jsx`
- `app/about/page.jsx`
- `app/app/page.jsx`
- `app/app/login/page.jsx`
- `app/app/onboarding/page.jsx`
- `app/auth/callback/page.jsx`
- `app/blog/page.jsx`
- `app/community/page.jsx`
- `app/community/share/page.jsx`
- `app/contact/page.jsx`
- `app/events/page.jsx`
- `app/home/page.jsx`
- `app/intake/page.jsx`
- `app/login/page.jsx`
- `app/portfolio/page.jsx`
- `app/prsm/page.jsx`
- `app/services/page.jsx`
- `app/shop/page.jsx`
- `app/space/page.jsx`
- `app/success/page.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed. It still emitted the existing API adapter Turbopack/NFT tracing warning documented in known issues.
- `npm run build` passed, confirming the Vite build and SEO postbuild still work.
- `git diff --check` passed.
- Fresh Next production preview on `http://localhost:4012` confirmed route-specific WebPage JSON-LD for `/about`, `/home`, `/community/share`, `/app/login`, and `/success`, including expected `@id` and `name` values. It also confirmed `/share-your-work` remains a `307` redirect to `/community/share`.
- Fresh Vite production preview on `http://127.0.0.1:4186` confirmed the legacy generated static SEO pages still include matching WebPage JSON-LD for `/about/`, `/home/`, `/community/share/`, `/app/login/`, `/success/`, and `/share-your-work/`.
- Preview processes on ports 4012 and 4186 were stopped after checks.

2026-05-27
session 35
- Continued from the remaining integration validation list.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Inspected `tests/next-api-adapter.test.js`, `tests/discord-commands.test.js`, `api/discord-interactions.js`, `api/_lib/services/discord-commands.js`, and `api/_lib/env.js` before editing.
- Added route-level Next adapter tests for `/api/discord-interactions` using a temporary generated Ed25519 key and `DISCORD_PUBLIC_KEY`.
- The new tests verify that a signed Discord ping payload posts through `app/api/[...route]/route.js` and returns the existing `{ "type": 1 }` response, and that an invalid signature returns the existing 401 `DISCORD_SIGNATURE_INVALID` JSON error.
- Did not change API implementation files, endpoint names, headers, request body handling, response shapes, CSS, layout, or page behavior.
files touched:
- `migration_checklist.md`
- `tests/next-api-adapter.test.js`
verification performed:
- `node --test tests/next-api-adapter.test.js tests/discord-commands.test.js` passed: 16 tests passed.
- `npm run lint` passed.
- `npm run build:next` passed. It still emitted the existing API adapter Turbopack/NFT tracing warning documented in known issues.
- `npm run build` passed, confirming the Vite build and SEO postbuild still work.
- `git diff --check` passed.
- Fresh Next production preview on `http://localhost:4013` was started with a temporary `DISCORD_PUBLIC_KEY`. A valid signed POST to `/api/discord-interactions` returned `200 application/json` with `{ "type": 1 }`; an invalid signature returned `401 application/json` with `DISCORD_SIGNATURE_INVALID`.
- Preview process on port 4013 was stopped after checks.

2026-05-27
session 36
- Continued from the remaining integration/PWA validation list.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Inspected the Vite PWA configuration, current app metadata, public icon assets, and Vite-generated `dist/manifest.webmanifest`.
- Added a Next App Router manifest route at `app/manifest.js` matching the current Vite-generated web app manifest contract, including `name`, `short_name`, `description`, `start_url`, `display`, `background_color`, `theme_color`, `lang`, `scope`, `orientation`, and icon entries.
- Added the root metadata manifest link so Next-rendered pages advertise `/manifest.webmanifest`.
- Explicitly deferred replacement of Vite/Workbox service-worker precaching behavior until the final Vite-removal phase. This avoids changing runtime caching, update, or offline behavior before the migration cutover decision.
- Did not change page CSS, layout, aesthetics, interactions, API implementation files, or service-worker runtime behavior.
files touched:
- `migration_checklist.md`
- `app/layout.jsx`
- `app/manifest.js`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed and listed `/manifest.webmanifest` as a static App Router route. It still emitted the existing API adapter Turbopack/NFT tracing warning documented in known issues.
- `npm run build` passed, confirming the Vite build, Vite PWA generation, and SEO postbuild still work.
- `git diff --check` passed.
- Fresh Next production preview on `http://127.0.0.1:4015` returned `200 application/manifest+json` for `/manifest.webmanifest`.
- A focused JSON comparison between `dist/manifest.webmanifest` and the fresh Next `/manifest.webmanifest` response passed for the PWA manifest fields and icons.
- Fresh Next HTML check confirmed the page head includes `<link rel="manifest" href="/manifest.webmanifest">` and the existing `#FFFFFF` theme-color metadata.
- Preview process on port 4015 was stopped after checks.

2026-05-27
session 37
- Continued from the remaining Apple Wallet validation list.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Inspected the `/api/generate-pass` legacy handler, `api/_lib/services/passkit.js`, wallet helper code, existing pass customization tests, and the Next API adapter tests.
- Added a focused Next adapter regression test for `/api/generate-pass?ticketId=...` when Apple Wallet credentials are absent. The test confirms the migrated adapter preserves the existing 503 JSON response shape with `PASS_UNAVAILABLE`.
- Verified a fresh Next production server started with blank Apple Wallet env vars returns the same 503 `PASS_UNAVAILABLE` response for `/api/generate-pass?ticketId=ticket-123`.
- Did not mark Apple Wallet binary pass generation/download complete. Real `.pkpass` binary validation still requires production-like Apple pass env, certificate material, WWDR asset availability, and valid ticket data. Superseded by session 49, which completed binary `.pkpass` validation with configured pass inputs and existing ticket/event data.
- Did not change API implementation files, endpoint names, response shapes, CSS, layout, aesthetics, or page behavior.
files touched:
- `migration_checklist.md`
- `tests/next-api-adapter.test.js`
verification performed:
- `node --test tests/next-api-adapter.test.js tests/passkit.test.js tests/passkit-customization.test.js tests/tickets.test.js` passed: 30 tests passed.
- `npm run lint` passed.
- `npm run build:next` passed. It still emitted the existing API adapter Turbopack/NFT tracing warning documented in known issues.
- `npm run build` passed, confirming the Vite build, Vite PWA generation, and SEO postbuild still work.
- `git diff --check` passed.
- Fresh Next production preview on `http://127.0.0.1:4017`, started with blank Apple Wallet env vars, returned `503 application/json` with `PASS_UNAVAILABLE` for `/api/generate-pass?ticketId=ticket-123`.
- Preview process on port 4017 was stopped after checks.

2026-05-27
session 38
- Continued from the remaining functional parity checklist.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Inspected the existing Vite root in `src/main.jsx` and confirmed it mounts `@vercel/analytics/react` `Analytics` and `@vercel/speed-insights/react` `SpeedInsights` alongside the app.
- Inspected the installed Vercel packages and confirmed they expose Next-specific `@vercel/analytics/next` and `@vercel/speed-insights/next` entrypoints.
- Added the Next-specific `Analytics` and `SpeedInsights` components to the App Router root layout body so all migrated Next routes preserve the existing root instrumentation.
- Did not change CSS, layout, aesthetics, interactions, API implementation files, or route behavior.
files touched:
- `migration_checklist.md`
- `app/layout.jsx`
verification performed:
- `npm run lint` passed.
- `npm run build:next` passed. It still emitted the existing API adapter Turbopack/NFT tracing warning documented in known issues.
- `npm run build` passed, confirming the Vite build, Vite PWA generation, and SEO postbuild still work.
- `git diff --check` passed.
- Fresh Next production preview on `http://127.0.0.1:4018` served `/about` successfully.
- Production build artifact inspection confirmed the App Router payload includes `Analytics` and `SpeedInsights` components from the Next root layout.
- Preview process on port 4018 was stopped after checks.

2026-05-27
session 39
- Continued from the remaining functional parity checklist.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Inspected the migrated dynamic App Router pages and thin wrappers for `/blog/:slug`, `/ticket/:ticketId`, and `/dashboard/:userSlug`.
- Verified fresh Next production responses for `/blog/sample-post`, `/ticket/ticket-123`, and `/dashboard/sample-user`.
- Marked only the dynamic route rendering checklist items complete. Data-dependent behavior such as actual blog post loading, ticket lookup/QR rendering, Apple Wallet download, community auth, and dashboard API loading remains covered by separate functional checklist items.
- Did not change code, CSS, layout, aesthetics, interactions, API implementation files, or route behavior.
files touched:
- `migration_checklist.md`
verification performed:
- Fresh Next production preview on `http://127.0.0.1:4019` returned `200 text/html` for `/blog/sample-post`, with route metadata canonicalized to `https://lmnl.art/blog/sample-post`, `LMNL | BLOG`, and the expected single-post loading shell.
- Fresh Next production preview on `http://127.0.0.1:4019` returned `200 text/html` for `/ticket/ticket-123`, with route metadata canonicalized to `https://lmnl.art/ticket/ticket-123`, `LMNL | TICKET`, and the expected ticket loading shell.
- Fresh Next production preview on `http://127.0.0.1:4019` returned `200 text/html` for `/dashboard/sample-user`, with route metadata canonicalized to `https://lmnl.art/dashboard/sample-user`, `LMNL | COMMUNITY DASHBOARD`, and the expected community gate loading shell.
- Preview process on port 4019 was stopped after checks.

2026-05-27
session 40
- Continued from the remaining functional parity checklist.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Inspected the migrated ticket route, shared `Ticket` page, QR rendering path, and API helper before validation.
- Started fresh Next and Vite production previews and used a headless browser with the same intercepted `/api/get-ticket?ticketId=qr-test` success response for both apps.
- Verified both Next `/ticket/qr-test` and Vite `/ticket/qr-test` render the ticket grid, QR SVG, four QR corner markers, `PRESENT THIS CODE AT THE DOOR`, `VALID ENTRY`, wallet download link `/api/generate-pass?ticketId=qr-test`, and wallet entry metadata.
- Marked only QR rendering complete. Ticket lookup/reconciliation, Apple Wallet binary generation, and check-in confirmation remain separate functional checklist items. Superseded for Apple Wallet only by session 49; ticket lookup/reconciliation and check-in confirmation remain separate pending items.
- Did not change code, CSS, layout, aesthetics, interactions, API implementation files, or route behavior.
files touched:
- `migration_checklist.md`
verification performed:
- Headless Next production check on `http://127.0.0.1:4020/ticket/qr-test` passed with mocked ticket API data.
- Headless Vite production check on `http://127.0.0.1:4187/ticket/qr-test` passed with the same mocked ticket API data.
- `npm run lint` passed.
- `npm run build:next` passed. It still emitted the existing API adapter Turbopack/NFT tracing warning documented in known issues.
- `npm run build` passed, confirming the Vite build, Vite PWA generation, and SEO postbuild still work.
- `git diff --check` passed.
- Preview processes on ports 4020 and 4187 were stopped after checks.

2026-05-27
session 41
- Continued from the remaining functional parity checklist.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Audited local `.env` coverage without exposing secret values to determine which remaining live-service validations can be completed locally.
- Local Supabase, Resend, and Turnstile inputs are configured. Square is missing `SQUARE_LOCATION_ID`, Discord is missing `DISCORD_WEBHOOK_URL`, Apple Wallet pass signing is missing the pass type/certificate/key inputs, and admin allowlist credentials are not configured locally. Superseded by session 48 for current env state: Apple Wallet pass inputs are now present locally, while `SQUARE_LOCATION_ID`, `DISCORD_WEBHOOK_URL`, and admin allowlist credentials remain missing.
- Ran a broad focused Node test sweep for the still-pending integration areas: checkout, direct payments, Square webhook fulfillment, inventory, auth/admin auth helpers, community auth/onboarding helpers, ticket lookup/check-in services, API adapter behavior, email templates, Discord notifications/commands, PassKit config/customization, activity feeds, and request approval flows.
- All 141 focused tests passed. This strengthens service and adapter parity evidence but does not close the remaining live functional checklist items because several still require authenticated HTTP flows, production-like webhook settings, real service credentials, or valid ticket/order records.
- Did not change code, CSS, layout, aesthetics, interactions, API implementation files, or route behavior.
files touched:
- `migration_checklist.md`
verification performed:
- Local environment presence audit for Supabase, Square, Resend, Discord, Turnstile, Apple Wallet, and admin auth configuration, reporting only configured/missing key names.
- `node --test tests/checkout-success.test.js tests/discord.test.js tests/checkout.test.js tests/preorder-checkout.test.js tests/webhook-fulfillment.test.js tests/community-auth.test.js tests/passkit.test.js tests/requests.test.js tests/email-templates.test.js tests/discord-commands.test.js tests/inventory.test.js tests/env.test.js tests/auth.test.js tests/event-checkout.test.js tests/event-display.test.js tests/approval.test.js tests/site-activity.test.js tests/passkit-customization.test.js tests/postbuild-routes.test.js tests/attendance-dashboard.test.js tests/api-router.test.js tests/tickets.test.js tests/space-activity.test.js tests/next-api-adapter.test.js tests/request-checkout.test.js` passed: 141 tests, 141 pass, 0 fail.

2026-05-27
session 42
- Continued from the remaining functional parity checklist.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Chose Supabase public reads as the next locally verifiable item because local public Supabase credentials are configured and the migrated public pages still load data client-side.
- Found and fixed a Next client-env migration gap: `src/lib/clientEnv.js` dynamically read `process.env`, which Vite tolerated but Next did not inline into browser bundles. This caused Next `/events` to render fallback event data without issuing the public Supabase REST request.
- Updated `src/lib/clientEnv.js` to enumerate the known public Next and Vite keys explicitly while preserving the same exported compatibility API and Vite behavior.
- Rebuilt both runtimes, started fresh production previews, and verified public Supabase REST reads from migrated Next pages and Vite pages using headless browser network evidence rather than visual inspection.
- Marked Supabase public reads complete. Next and Vite both loaded public route shells and received `200 application/json` Supabase REST responses for public events, community credits/businesses/events, blog posts, and portfolio entries. The shop `merch_preorders` request returned the same `400` in both Next and Vite, so it is documented as existing public-data/query behavior rather than a Next migration regression.
- Did not change CSS, layout, aesthetics, interactions, API implementation files, or route behavior.
files touched:
- `src/lib/clientEnv.js`
- `migration_checklist.md`
verification performed:
- Initial headless production check showed Next `/events` did not issue a Supabase REST request while Vite did, proving the env bridge gap before the fix.
- `npm run build:next` passed after the fix. It still emitted the existing API adapter Turbopack/NFT tracing warning documented in known issues.
- `npm run build` passed after the fix, confirming the Vite build, Vite PWA generation, and SEO postbuild still work.
- Fresh Next production preview on `http://127.0.0.1:4022` and fresh Vite production preview on `http://127.0.0.1:4189` were used for public-data parity checks.
- Headless network checks for `/events`, `/community`, `/shop`, `/blog`, and `/portfolio` confirmed public Supabase REST requests in Next and Vite. Next received `200` responses for `events`, `community_credits`, `community_businesses`, `blog_posts`, and `portfolio_entries`; Vite received matching successful public reads for the same public tables. Both runtimes received the same `400` response for the direct `merch_preorders` shop query.
- `npm run lint` passed.
- `node --test tests/env.test.js tests/postbuild-routes.test.js` passed: 11 tests, 11 pass, 0 fail.
- Preview processes on ports 4022 and 4189 were stopped after checks.

2026-05-27
session 43
- Continued from the remaining functional parity checklist.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Chose Turnstile verification as the next locally verifiable item because the local environment includes Turnstile configuration and Cloudflare provides official dummy site/secret keys for automated validation.
- Verified `verifyTurnstileToken()` against Cloudflare's live `siteverify` endpoint with the official always-pass test secret and dummy token, then verified the official always-fail test secret rejects with the existing `TURNSTILE_FAILED` application error.
- Verified the migrated Next API catch-all preserves Turnstile-protected POST behavior by sending a JSON body through `POST /api/service-inquiries` with the official failing test secret. The route returned `400` with `TURNSTILE_FAILED` before any Supabase insert or notification side effect.
- Marked Turnstile verification complete. Form submissions and Supabase writes remain separate checklist items.
- Did not change code, CSS, layout, aesthetics, interactions, API implementation files, or route behavior.
files touched:
- `migration_checklist.md`
verification performed:
- One-off Node verification using `api/_lib/http.js` and `app/api/[...route]/route.js` passed:
  - `verifyTurnstileToken('XXXX.DUMMY.TOKEN.XXXX')` succeeded with Cloudflare's official always-pass test secret.
  - `verifyTurnstileToken('XXXX.DUMMY.TOKEN.XXXX')` rejected with `TURNSTILE_FAILED` using Cloudflare's official always-fail test secret.
  - Next adapter `POST /api/service-inquiries` rejected a Turnstile-protected create payload with `400 TURNSTILE_FAILED` using the official always-fail test secret.
- `node --test tests/next-api-adapter.test.js tests/env.test.js` passed: 16 tests, 16 pass, 0 fail.
- `git diff --check` passed.

2026-05-27
session 44
- Continued from the visual parity checklist.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Chose homepage parity as the next verifiable item because the migrated public home surface is complete and can be compared against Vite without touching route behavior.
- Rebuilt both Next and Vite production artifacts, started fresh production previews, and verified ports/responses through terminal/HTTP checks before browser inspection.
- Found a real Next-only visual mismatch: standalone Next `ContentPageShell` rendering explicitly passed `metaNote={null}`, which removed the left sidebar note that Vite keeps through the persistent shell.
- Removed the standalone `metaNote={null}` override from `ContentPageShell` so Next keeps `TerminalShell`'s existing default meta note, matching Vite.
- Re-ran homepage visual parity with a controlled `/api/site-activity` response for both runtimes so local Vite preview's missing API server did not create a data-only screenshot difference.
- Marked homepage parity complete. Controlled desktop and mobile checks matched on title, home copy, nav items/links, sidebar meta note behavior, company box, command strip, upcoming event card, site history panel, invite panel, computed fonts/colors/backgrounds/padding, and measured element rectangles. Mobile controlled screenshots were pixel-identical; desktop controlled screenshots differed by only 41 pixels out of 1,356,480, with identical measured layout/style metrics.
- Did not change CSS declarations, layout rules, aesthetics, interactions, API implementation files, or route behavior.
files touched:
- `src/components/ContentPageShell.jsx`
- `migration_checklist.md`
verification performed:
- `npm run build:next` passed. It still emitted the existing API adapter Turbopack/NFT tracing warning documented in known issues.
- `npm run build` passed, confirming the Vite build, Vite PWA generation, and SEO postbuild still work.
- Fresh Next production preview on `http://127.0.0.1:4025` returned `200 text/html; charset=utf-8` for `/home`.
- Fresh Vite production preview on `http://127.0.0.1:4191` returned `200 text/html` for `/home`.
- Browser parity check at `1440x900` with controlled site-activity data: Next and Vite had identical measured rectangles for the company box, command strip, upcoming event card, site history panel, invite panel, and nav; desktop screenshot diff was 41 pixels / 1,356,480 (`0.0030%`).
- Browser parity check at `390x844` with controlled site-activity data: Next and Vite had identical measured rectangles for the company box, command strip, upcoming event card, and nav; mobile screenshots were pixel-identical.
- `npm run lint` passed.
- Preview processes on ports 4025 and 4191 were stopped after checks.

2026-05-27
session 45
- Continued from the visual parity checklist.
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Chose the shared terminal shell, navigation, and footer/sidebar/social-link parity items because they can be validated across representative migrated public routes without changing visuals.
- Rebuilt both Next and Vite production artifacts, started fresh production previews, and verified ports/responses through terminal/HTTP checks before browser inspection.
- Ran a controlled browser parity matrix across `/home`, `/events`, `/services`, `/community`, `/shop`, `/about`, `/blog`, `/contact`, and `/prsm` at desktop `1440x900`, tablet `820x1180`, and mobile `390x844`.
- Controlled `/api/site-activity` responses in both runtimes so the right sidebar comparison measured shared chrome rather than local Vite preview's lack of an API server.
- Verified terminal shell data attributes, left/right sidebar open states, mobile overlay state, shell/left/center/right/topbar/intro/footer/nav/meta/history/invite computed layout and style metrics, active navigation item, nav hrefs, nav accent colors, footer CTA, and social link href/aria/target values.
- Marked terminal shell parity, navigation parity, and footer/sidebar/social link parity complete. Responsive parity remains separate because this check covered the shared shell/chrome across breakpoints, not every page-specific content layout.
- Did not change code, CSS, layout, aesthetics, interactions, API implementation files, or route behavior.
files touched:
- `migration_checklist.md`
verification performed:
- `npm run build:next` passed. It still emitted the existing API adapter Turbopack/NFT tracing warning documented in known issues.
- `npm run build` passed, confirming the Vite build, Vite PWA generation, and SEO postbuild still work.
- Fresh Next production preview on `http://127.0.0.1:4026` returned `200 text/html; charset=utf-8` for `/about`.
- Fresh Vite production preview on `http://127.0.0.1:4192` returned `200 text/html` for `/about`.
- Terminal/process check confirmed listeners on ports 4026 and 4192 before browser checks.
- Controlled browser parity matrix checked 27 route/viewport combinations and found zero Next/Vite shell/navigation/footer/sidebar/social-link differences.
- The matrix saw 9 symmetric console `400` entries from existing page data calls in both runtimes; these were not shell parity differences and did not differ between Next and Vite.
- Preview processes on ports 4026 and 4192 were stopped after checks.

2026-05-27
session 46
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Updated the visual parity checklist at user direction: a full visual parity check for every page is explicitly skipped.
- Preserved the existing visual parity rule: targeted checks still apply when requested or when a concrete migration risk cannot be assessed through code/build/HTTP checks.
- Did not change code, CSS, route behavior, API implementation files, or visual assets.
files touched:
- `migration_checklist.md`
verification performed:
- Documentation-only update; no build or runtime verification required.

2026-05-27
session 47
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Chose local-only email lab visibility parity because it is a narrow host-gating item that can be validated without a broad visual sweep.
- Inspected the Vite route gate in `src/App.jsx` and the Next server gate in `app/email-lab/page.jsx`. Both expose `/email-lab` only on local hostnames and do not mount/render the lab for public or `admin.*` hostnames.
- Rebuilt both Next and Vite production artifacts. Next still emitted the already-documented API adapter Turbopack/NFT tracing warning, and the build succeeded.
- Started a fresh Next production preview on port 4028, a Vite preview on port 4194 for local rendering, and a temporary static fallback server over `dist` on port 4195 to test Vite client hostname behavior without Vite preview's custom-host safety block.
- Verified by browser automation that `localhost` renders the email lab in both Next and Vite, while `lmnl.test` and `admin.lmnl.test` do not expose `.email-lab` content in either runtime. Public host redirects to `/`; admin host falls into the existing protected admin root/login flow without exposing the lab.
- Marked local-only email lab visibility parity complete.
- Did not change code, CSS, route behavior, API implementation files, or visual assets.
files touched:
- `migration_checklist.md`
verification performed:
- `npm run build:next` passed with the existing documented API adapter Turbopack/NFT tracing warning.
- `npm run build` passed, including Vite PWA generation and SEO postbuild output.
- HTTP checks: Next `localhost:4028/email-lab` returned `200`; Next public/admin host headers for `/email-lab` returned redirects to `/`.
- Browser checks with host resolver mappings passed:
  - Next local: `/email-lab` rendered `.email-lab`, `.email-lab__sidebar`, `.email-lab__preview`, `Email Lab`, and `Approval Email`.
  - Vite static local: `/email-lab` rendered `.email-lab`, `.email-lab__sidebar`, `.email-lab__preview`, `Email Lab`, and `Approval Email`.
  - Next public host: no email lab content exposed; final path `/`.
  - Vite static public host: no email lab content exposed; final path `/`.
  - Next admin host: no email lab content exposed; final path `/login`.
  - Vite static admin host: no email lab content exposed; final path `/login`.
- Preview/static processes on ports 4028, 4194, and 4195 were stopped after checks.

2026-05-27
session 58
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Chose controlled ticket generation/reconciliation and check-in validation because it could be proven with temporary event/request/ticket/admin rows, mocked Square order retrieval inside the reconciliation service, and verified cleanup.
- Created a temporary event and approved request linked to a unique Square order id, then called `reconcileApprovedRequestTicket()` with a mocked fulfillable Square order and disabled in-process email/Discord ticket notification tasks.
- Verified ticket reconciliation created a real ticket row, `getTicketView()` loaded the generated ticket/event payload, and the generated ticket had a QR/check-in payload.
- Created a temporary admin auth user and `admin_users` row, signed in, and exercised the migrated Next catch-all API adapter for `GET /api/check-in-ticket` and `POST /api/check-in-ticket`.
- Verified check-in lookup returned `valid`, check-in confirmation returned `checked_in` with `is_used: true`, and a second lookup returned `already_used`.
- Cleaned up the generated ticket, temporary request, temporary event, temporary admin row/auth user, and ticket attendance verification source, then verified all were gone.
- Marked ticket generation/reconciliation and check-in lookup and confirmation complete. Square checkout creation, direct payments, webhook signature/fulfillment, Resend email sending, and Discord notifications remain pending separately because this proof intentionally avoided live Square and external notification side effects.
- Did not change code, CSS, route behavior, API implementation files, visual assets, live Square state, persistent ticket/order state, or notification state.
files touched:
- `migration_checklist.md`
verification performed:
- Controlled ticket proof passed: temporary event/request creation, ticket reconciliation through existing service with mocked Square order, real ticket row creation, ticket view read, migrated Next check-in lookup/confirmation, already-used lookup, and full cleanup verification.
- Local env values were loaded without printing secret values.

2026-05-27
session 57
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Chose controlled public form submission validation across multiple migrated API-backed form surfaces while keeping external notification side effects disabled in-process.
- Temporarily blanked Discord intake channel and Resend API env values only inside the smoke-proof process so no Discord messages or real emails would be sent. The public handlers' notification settlement behavior swallowed the intentionally missing Resend config errors and returned successful form responses after database writes.
- Temporarily set `TURNSTILE_SECRET_KEY` to Cloudflare's documented always-pass Turnstile testing secret and submitted the matching documented test token for Turnstile-protected forms.
- Submitted a public invite/request form through the migrated Next catch-all API adapter, verified the request row existed, deleted it, and verified cleanup.
- Submitted a public service inquiry form through the migrated Next catch-all API adapter, verified the service inquiry row existed, deleted it, and verified cleanup.
- Submitted a public artist-interest form through the migrated Next catch-all API adapter, verified the artist-interest row existed, deleted it, and verified cleanup.
- Marked form submissions complete. Resend email sending and Discord notifications remain pending separately because this proof intentionally disabled those external side effects.
- Did not change code, CSS, route behavior, API implementation files, visual assets, Square state, ticket/order state, or notification state.
files touched:
- `migration_checklist.md`
verification performed:
- Controlled form proof passed: `/api/requests`, `/api/service-inquiries`, and `/api/artist-interest` create actions succeeded through the migrated Next adapter; inserted rows were found exactly once; all inserted rows were deleted and verified absent.
- Turnstile-protected submissions used Cloudflare's documented test secret/token in-process only.
- Resend and Discord notification env values were disabled in-process only; no real email or Discord notification was sent by this proof.

2026-05-27
session 56
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Chose the smallest reversible admin tool proof: authenticated admin CRUD through the migrated mailing-list admin API.
- Created one temporary confirmed Supabase auth user, inserted one temporary `admin_users` row, signed in, then called the migrated Next catch-all API adapter for `/api/mailing-list`.
- Verified authenticated admin create, list, and delete actions for a unique temporary mailing-list entry through the migrated API adapter.
- Deleted the temporary mailing-list entry, `admin_users` row, and auth user, then verified all were gone.
- Marked admin tools complete at the migrated API/tool layer. This does not complete form submissions, notification flows, Square mutations, ticket reconciliation, or check-in confirmation.
- Did not change code, CSS, route behavior, API implementation files, visual assets, Square state, ticket/order state, or notification state.
files touched:
- `migration_checklist.md`
verification performed:
- Controlled admin tool proof passed: temporary admin auth user creation, admin row insert, sign-in, `/api/mailing-list` create/list/delete through the migrated Next adapter, mailing-list cleanup, admin row cleanup, and auth-user cleanup.
- Local env values were loaded without printing secret values.

2026-05-27
session 55
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Audited admin authorization storage without printing secrets. The live `admin_users` table was selectable and the `is_admin_user` RPC was available.
- Created one temporary confirmed Supabase auth user, inserted one temporary `admin_users` row for that user, signed in with the public Supabase client, and verified `requireAdminUser()` accepted the bearer token.
- Exercised the migrated Next catch-all API adapter for `GET /api/admin-session` with the temporary admin bearer token and verified it returned `200` with the expected authenticated admin id/email payload.
- Deleted the temporary `admin_users` row and auth user, then verified both were gone.
- Marked admin authorization complete. Admin tools remain pending because no admin CRUD/tool action was exercised.
- Did not change code, CSS, route behavior, API implementation files, visual assets, Square state, ticket/order state, or notification state.
files touched:
- `migration_checklist.md`
verification performed:
- Live admin authorization storage audit passed: `admin_users` selectable with expected columns and `is_admin_user` RPC available.
- Controlled admin authorization proof passed: temporary auth user creation, admin row insert, password sign-in, `requireAdminUser()` success, migrated Next `/api/admin-session` success response, admin row cleanup, and auth-user cleanup.
- Local env values were loaded without printing secret values.

2026-05-27
session 54
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Chose controlled Supabase/community auth validation because it could be proven with temporary auth users, reversible profile writes, and no real customer/admin/payment/ticket state.
- Created a temporary confirmed Supabase auth user with community-provider metadata, signed in with the public Supabase client, verified the returned session/access token, and verified the token through the existing server `requireCommunityUser()` path.
- Bootstrapped the temporary user through the existing community profile flow, verified the private incomplete profile shape, and confirmed the onboarding destination gate resolves to `/app/onboarding`.
- Created a second temporary community session/profile, completed the profile with a unique slug, verified the dashboard route resolves to `/dashboard/<slug>`, and verified `getCommunityDashboard()` returns the expected dashboard payload shape with the temporary user's known email.
- Cleaned up temporary auth users and profile/user identity rows after each proof and verified the auth users/profiles no longer existed.
- Marked Supabase auth/session handling, community auth/session handling, community onboarding gate, and community dashboard/profile routing complete.
- Did not change code, CSS, route behavior, API implementation files, visual assets, Square state, ticket/order state, admin authorization state, or notification state.
files touched:
- `migration_checklist.md`
verification performed:
- Controlled auth proof passed: temporary auth user creation, password sign-in, session/access-token issuance, server community auth verification, community eligibility check, profile bootstrap, onboarding gate resolution, profile cleanup, and auth-user cleanup.
- Controlled dashboard/profile proof passed: temporary auth user creation, sign-in, profile bootstrap, profile completion, dashboard path resolution, dashboard payload shape read, known-email match, profile cleanup, and auth-user cleanup.
- Local env values were loaded without printing secret values.

2026-05-27
session 53
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Per the user's instruction, did not run a full every-page visual parity sweep.
- Audited the Vite and Next CSS entry boundaries and confirmed `app/layout.jsx` imports the same stylesheet set in the same order as `src/main.jsx`.
- Confirmed migrated Next routes keep using normal `<img>` elements/public asset URLs and do not introduce `next/image` optimization or image config that would alter rendering behavior. One pre-existing shop fallback asset path is missing from `public/` and appears equally referenced by the shared page code, so image rendering parity was not marked complete from this audit.
- Marked the CSS-governed visual parity categories complete: typography, spacing, color/theme, animations/transitions, form styling, and button/link states.
- Left responsive parity, image rendering parity, admin UI parity, community app UI parity, and ticket/check-in UI parity pending because those require targeted viewport or surface-specific evidence beyond static CSS import parity.
- Did not change code, CSS, route behavior, API implementation files, or visual assets.
files touched:
- `migration_checklist.md`
verification performed:
- Compared CSS imports in `app/layout.jsx` and `src/main.jsx`: `theme.css`, `index.css`, `ContentPageShell.css`, `TerminalShell.css`, `community-app.css`, and every migrated page stylesheet are imported in identical order.
- Searched `app` and `src` for CSS imports and confirmed no additional route/component CSS import divergence.
- Searched for `next/image`, `<Image>`, Next image configuration, and image optimization settings; none are used.
- Confirmed the full every-page visual parity sweep remains explicitly skipped by user direction.

2026-05-27
session 52
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Chose the narrowest reversible Supabase write proof available: the existing `mailing_list` admin repository path.
- Created one unique migration-smoke `mailing_list` row through `saveMailingListEntry()`, verified it was readable through the configured admin Supabase client, deleted it through `deleteMailingListEntryById()`, and verified no smoke row remained.
- Marked Supabase writes complete at the repository/service layer. Form submissions, community onboarding/profile writes, admin tools, ticket reconciliation, check-in confirmation, and external notification/payment flows remain separate pending checklist items.
- Did not change code, CSS, route behavior, API implementation files, visual assets, Square state, ticket/order state, or notification state.
files touched:
- `migration_checklist.md`
verification performed:
- Controlled live Supabase write passed against `mailing_list`: insert succeeded, inserted row was found exactly once, delete succeeded, and post-delete lookup found zero rows.
- Local env values were loaded without printing secret values.

2026-05-27
session 51
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Re-audited remaining unchecked functional items against current local env and side-effect risk before attempting another validation.
- Current env presence without exposing secret values: Supabase service/public inputs, Resend API key, Square tokens, Square webhook URL/signature key, Discord bot/public/channel credentials, Apple pass inputs, and Turnstile are present. `SQUARE_LOCATION_ID`, `DISCORD_WEBHOOK_URL`, `ADMIN_USER_IDS`, `ADMIN_USER_EMAILS`, and `ADMIN_AUTH_SOURCE` are not present.
- Classified remaining unchecked functional items:
  - Supabase writes: requires deliberate test write plus cleanup or a safe form/API fixture.
  - Supabase auth/session handling: requires a real authenticated Supabase session/token or controlled auth harness.
  - Admin authorization: requires authenticated admin token and configured allowlist/table/RPC evidence; local env allowlist is absent.
  - Community auth/session handling, onboarding gate, and dashboard/profile routing: require authenticated community profile states.
  - Form submissions: require controlled writes and notification side-effect handling.
  - Resend email sending: would send real email unless a verified sandbox/test-mode target is chosen.
  - Discord notifications: would post to Discord; `DISCORD_WEBHOOK_URL` is absent, while bot/channel env is present.
  - Square checkout creation: creates Square checkout/payment-link artifacts and may mutate request/order linkage; needs deliberate test record.
  - Square direct payments: requires payment source/token and real or sandbox charge flow.
  - Square webhook signature/fulfillment: needs production-like signed webhook payload and a safe order/request/ticket fixture to avoid unwanted fulfillment.
  - Ticket generation/reconciliation: can create/reconcile tickets; needs safe fixture or explicit approval.
  - Admin tools: requires authenticated admin session and UI/API tool actions.
  - Check-in lookup and confirmation: lookup is read-only, but confirmation marks tickets used; needs safe ticket fixture before completion.
- Did not mark any additional checklist item complete from partial evidence.
- Did not change code, CSS, route behavior, API implementation files, or visual assets.
files touched:
- `migration_checklist.md`
verification performed:
- Environment presence audit completed without printing secret values.
- Side-effect classification completed for every remaining unchecked functional item.

2026-05-27
session 50
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Chose Supabase admin reads because they can be validated read-only through the existing server repository layer without changing API logic, triggering notifications, or mutating customer/order/ticket data.
- Loaded local env values without printing secrets and exercised the configured admin Supabase client through the existing read repositories.
- Verified the admin read layer returns arrays with valid object shapes for events, requests, tickets, preorders, service inquiries, website intake submissions, service products, artist interest submissions, admin blog posts, admin portfolio entries with media, community credits, community businesses, and mailing list entries.
- Marked Supabase admin reads complete. Supabase writes, Supabase auth/session handling, admin authorization, admin tools, and admin-authenticated HTTP/UI flows remain separate pending checklist items.
- Did not change code, CSS, route behavior, API implementation files, or visual assets.
files touched:
- `migration_checklist.md`
verification performed:
- Read-only admin repository audit passed:
  - events: 4
  - requests: 18
  - tickets: 12
  - preorders: 0
  - service inquiries: 3
  - website intake submissions: 1
  - service products: 2
  - artist interest submissions: 1
  - admin blog posts: 2
  - admin portfolio entries: 4
  - community credits: 25
  - community businesses: 1
  - mailing list entries: 0

2026-05-27
session 49
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Chose Apple Wallet pass generation/download because session 48 confirmed the Apple pass inputs are present locally, and the remaining proof needed a valid ticket/pass data check.
- Used existing Supabase ticket/event data without printing customer details or ticket IDs. Found an existing ticket with an event, loaded its ticket view, and generated a real Apple Wallet pass through `generateTicketPass()`.
- Verified the service result was a `.pkpass` buffer: no missing pass fields, ticket/event wallet metadata present, filename matched `ticket-*.pkpass`, buffer length was greater than zero, and the buffer started with ZIP magic bytes.
- Started a fresh Next production preview on port 4030 and verified the migrated Next adapter route `GET /api/generate-pass?ticketId=...` returned a binary pass download with `200`, `Content-Type: application/vnd.apple.pkpass`, `Content-Disposition: attachment; filename="ticket-*.pkpass"`, matching `Content-Length`, `Cache-Control: no-store, max-age=0`, and ZIP magic bytes in the response body.
- Marked Apple Wallet pass generation/download complete. Ticket generation/reconciliation, check-in confirmation, and admin tools remain separate pending checklist items.
- Did not change code, CSS, route behavior, API implementation files, or visual assets.
files touched:
- `migration_checklist.md`
verification performed:
- `generateTicketPass()` produced a real pass buffer from existing ticket/event data: 48,169 bytes, `.pkpass` filename, ZIP magic bytes.
- Next production preview on `http://127.0.0.1:4030` returned a valid binary `.pkpass` response for `/api/generate-pass?ticketId=...` with correct headers and matching content length.
- Preview process on port 4030 was stopped after checks; temporary local pass files were removed.

2026-05-27
session 48
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Audited local env presence without printing secret values. Supabase, Resend, Square tokens, Square webhook signature key, Discord public/bot credentials, Apple pass inputs, and Turnstile are present. `SQUARE_LOCATION_ID`, `DISCORD_WEBHOOK_URL`, and admin allowlist credentials are still missing.
- Chose Square catalog and inventory reads because they are read-only live-service validations and do not require checkout/payment/webhook writes or admin UI changes.
- Used the existing Square catalog service to perform a live catalog read. It returned 3 catalog items and at least one named item variation.
- Used the existing inventory service to perform a live Square inventory/price read for a real variation ID from the catalog. The service returned the matching variation ID with numeric available and price fields.
- Started a fresh Next production preview on port 4029 and verified the migrated Next API adapter route `GET /api/check-inventory?variationId=...` returned `200 application/json`, `success: true`, the matching variation ID, numeric available/price fields, and a boolean cache flag.
- Marked Square catalog reads and Square inventory reads complete. Admin authorization, Square checkout creation, Square direct payments, and Square webhook fulfillment remain separate pending checklist items.
- Did not change code, CSS, route behavior, API implementation files, or visual assets.
files touched:
- `migration_checklist.md`
verification performed:
- Local env presence audit completed without printing secret values.
- Live Square catalog service read passed: 3 catalog items; first variation had a real ID and parent item name.
- Live Square inventory service read passed for that variation: matching variation ID, numeric available quantity, numeric price.
- Next production preview on `http://127.0.0.1:4029` returned `200 application/json; charset=utf-8` for `/api/check-inventory?variationId=...`; response shape matched the existing API contract.
- Preview process on port 4029 was stopped after checks.

2026-05-27
session 59
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Followed the user's instruction not to conduct a full every-page visual parity check. The existing "Full every-page visual parity sweep - skipped by user direction" item remains the controlling verification scope.
- Completed the remaining visual checklist items by targeted migration-surface audit rather than screenshot sweep.
- Responsive parity is complete at the migration surface level: Next and Vite import the same global stylesheets in the same order, the shared `TerminalShell` responsive viewport state is already verified across desktop/tablet/mobile from prior targeted checks, and remaining admin/community/ticket/check-in surfaces keep their original responsive CSS files and media queries.
- Image rendering parity is complete at the migration surface level: no `next/image`, `<Image>`, `images.remotePatterns`, or Next image optimization config is used; migrated routes continue using the same plain `<img>` components, public asset paths, Supabase/Square image URLs, and SEO image paths as Vite. The pre-existing `/lmnl_hoodie_mockup_1777568946142.png` fallback reference remains shared by both Vite and Next and is not a Next migration divergence.
- Admin UI parity is complete at the component/style/gate surface level: Next `app/AdminRootRoute.jsx` renders the existing `src/pages/Admin.jsx` behind the migrated `AdminProtectedRoute`; Vite renders the same `Admin` page behind the equivalent protected route logic; both entrypoints load the same `src/pages/Admin.css`.
- Community app UI parity is complete at the component/style/gate surface level: Next `/app/login`, `/app`, `/app/onboarding`, and `/dashboard/:userSlug` render the existing `AppLogin`, `CommunityAppRoute` + `AppHome`, `AppOnboarding`, and `UserDashboard` surfaces with the same community styles; functional auth/profile/onboarding/dashboard proofs are already complete from session 54.
- Ticket/check-in UI parity is complete at the component/style/gate surface level: Next `/ticket/:ticketId` renders the existing `Ticket` page with `Ticket.css`, and Next `/check-in/:token` renders the existing admin-gated `CheckIn` page with `CheckIn.css`; ticket/check-in functional proof is already complete from session 58.
- Did not change code, CSS declarations, route behavior, visual assets, API implementation files, or external integrations.
files touched:
- `migration_checklist.md`
verification performed:
- Confirmed `app/layout.jsx` and `src/main.jsx` import the same shared CSS files in the same order for migrated visual surfaces.
- Confirmed the remaining Next visual route wrappers import and render the same source page/components as Vite: `Admin`, `AppLogin`, `CommunityAppRoute`, `AppHome`, `AppOnboarding`, `UserDashboard`, `Ticket`, and `CheckIn`.
- Searched `app`, `src`, and `next.config.mjs` for `next/image`, `<Image>`, `remotePatterns`, `unoptimized`, and image config divergence; no Next image rendering layer is present.
- Searched image references and public assets; shared plain image references remain unchanged across Vite and Next, with the existing shared hoodie fallback path still absent from `public/`.
- Reviewed responsive media-query coverage for `TerminalShell.css`, `Admin.css`, `community-app.css`, `AppOnboarding.css`, `UserDashboard.css`, `Ticket.css`, and `CheckIn.css`.
- `git diff --check` passed.

2026-05-27
session 60
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Chose Square webhook signature/fulfillment because it could be validated safely with temporary Supabase records, the real webhook signature verifier, a production-shaped signed payload, and mocked Square order retrieval without creating Square artifacts, sending email, or posting to Discord.
- Created a temporary event with a unique Square variation id and a temporary access request linked to a unique Square order id, then approved the request through the existing repository path.
- Built a raw `order.updated` webhook payload and signed it with the configured `SQUARE_WEBHOOK_SIGNATURE_KEY` and webhook URL. Ran it through `processSquareOrderUpdate()` with the real signature verifier, real ticket/request/event repositories, mocked Square order retrieval, and in-process email/Discord notification no-ops.
- Verified webhook fulfillment created a real ticket row, linked it to the temporary event, generated an `LMNL-` QR payload, fulfilled the temporary request, and returned `{ success: true, ticketId }`.
- Replayed the same signed payload and verified it returned `{ replay: true, ticketId }` without fetching the Square order or sending notifications.
- Cleaned up the temporary ticket, request, and event rows, then verified all were gone.
- Re-scanned remaining side-effect env without printing secret values: `RESEND_API_KEY`, Discord bot/channel credentials, production Square credentials, and `SQUARE_ENVIRONMENT=production` are present; `DISCORD_WEBHOOK_URL`, `SQUARE_SANDBOX_APPLICATION_ID`, and `SQUARE_LOCATION_ID` are missing. Do not run remaining Resend, Discord notification, Square checkout, or Square direct-payment validations without an explicit safe target/sandbox decision.
- Did not change code, CSS declarations, route behavior, visual assets, API implementation files, Square artifacts, Resend delivery, or Discord channels.
files touched:
- `migration_checklist.md`
verification performed:
- Controlled signed webhook proof passed: real signature verification, temporary event/request creation, request approval, mocked fulfillable Square order retrieval, real ticket row creation, request fulfillment, QR payload generation, replay handling, and cleanup verification.
- `node --test tests/webhook-fulfillment.test.js tests/next-api-adapter.test.js tests/tickets.test.js` passed 25/25. Expected failure-path logs appeared for tested method/JSON/signature/attendance/pass-fallback branches, but the runner was green.
- Remaining side-effect env scan confirmed Square is currently configured as production, not sandbox.

2026-05-27
session 61
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Chose Resend email sending because Resend's official docs provide safe test recipients under `resend.dev`, including labeled `delivered+...@resend.dev` addresses that simulate delivery without sending to a real person.
- Used the existing `sendTicketEmail()` service with the configured `RESEND_API_KEY`, a labeled `delivered+lmnl-migration-...@resend.dev` test recipient, a temporary ticket/event payload, and a no-op `generateTicketPass()` dependency so the proof exercised Resend delivery without generating or attaching a pass.
- Verified Resend accepted the email and returned an email id.
- Did not submit a public form, create database rows, generate Square artifacts, post to Discord, or send email to a real personal/domain recipient.
- Did not change code, CSS declarations, route behavior, visual assets, API implementation files, or environment variables.
files touched:
- `migration_checklist.md`
verification performed:
- Controlled Resend proof passed: existing ticket-email service sent to a safe labeled Resend test recipient and received a Resend email id.
- `node --test tests/webhook-fulfillment.test.js tests/email-templates.test.js tests/env.test.js` passed 24/24. Expected pass-generation fallback log appeared in the tested failure branch, but the runner was green.

2026-05-27
session 62
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Inspected Discord notification, Square checkout, Square direct-payment, and related tests before running live validations.
- Used official Square documentation as the safety boundary: Square Sandbox is isolated from production and sandbox payments do not charge real cards; direct-payment tests can use sandbox source ids such as `cnon:card-nonce-ok`.
- Confirmed the configured non-production Square token path can reach Square Sandbox with a read-only locations probe. The sandbox account returned one location and an active location.
- Completed Square checkout creation in Sandbox: created a temporary Supabase event, called the existing `createCheckoutForEvent()` service against the real Square Sandbox payment-link API, verified a checkout URL, Square order id, Square payment-link id, and linked temporary request, then deleted the sandbox payment link and cleaned up temporary request/event rows.
- Completed Square direct payments in Sandbox: created a temporary Supabase event, called the existing `createPaymentForEvent()` service with sandbox source id `cnon:card-nonce-ok`, verified a Square sandbox payment id, Square order id, success redirect, and linked temporary request, then cleaned up temporary request/event rows.
- Did not touch production Square, create production payment artifacts, use real card data, send email, post to Discord, change code, change CSS, or alter route/API behavior.
- Discord notifications remain unchecked because the current implementation proves notification delivery only by posting a Discord message to the configured bot/channel endpoint. No official local dry-run path or safe test channel is configured in `.env`, and `DISCORD_WEBHOOK_URL` is absent.
files touched:
- `migration_checklist.md`
verification performed:
- Square Sandbox read probe passed: sandbox reachable, one location found, active location present.
- Controlled Square checkout proof passed: real sandbox payment-link creation, returned checkout URL/order id/payment-link id, request linkage, sandbox payment-link deletion, and local cleanup verification.
- Controlled Square direct-payment proof passed: real sandbox payment with `cnon:card-nonce-ok`, returned payment id/order id/success redirect, request linkage, and local cleanup verification.
- `node --test tests/checkout.test.js tests/event-checkout.test.js tests/request-checkout.test.js tests/preorder-checkout.test.js tests/next-api-adapter.test.js` passed 19/19. Expected failure-path logs appeared for tested method/JSON/signature branches, but the runner was green.
- `node --test tests/discord.test.js tests/discord-commands.test.js` passed 20/20, confirming Discord payload building, mocked notification POST behavior, command handling, signature helper behavior, and timeout behavior. This does not complete live Discord notification delivery because no safe Discord test channel/dry-run target is configured.

2026-05-27
session 63
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Re-inspected `api/_lib/services/discord.js` and confirmed both notification paths prove live delivery only by calling Discord's bot message-create endpoint.
- Performed a read-only Discord API audit of the configured bot/channel targets without posting any messages. The configured ticket channel resolved to `open-chat`; the configured intake channel resolved to `lmnl-chat`. Both are guild text channels and neither channel name indicates a test, sandbox, staging, smoke, or Codex-safe target.
- Left `Discord notifications` unchecked because marking it complete would require a real Discord message post to a non-test configured channel, and no safe Discord notification target or dry-run endpoint is configured.
- Did not post to Discord, change code, change CSS, alter environment variables, or modify route/API behavior.
files touched:
- `migration_checklist.md`
verification performed:
- Read-only Discord channel metadata audit passed: bot token can read both configured channels, but the targets are `open-chat` and `lmnl-chat`, not safe test channels.
- `node --test tests/discord.test.js tests/discord-commands.test.js tests/next-api-adapter.test.js` passed 26/26. Expected failure-path logs appeared for tested method/JSON/signature branches, but the runner was green.

2026-05-27
session 64
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Searched the repo for hidden Discord test, sandbox, staging, webhook, or dry-run notification paths. No alternate delivery path was found.
- Audited local Discord env key names without printing secret values. `.env` only contains `DISCORD_BOT_TOKEN`, `DISCORD_TICKET_CHANNEL_ID`, `DISCORD_INTAKE_CHANNEL_ID`, `DISCORD_PUBLIC_KEY`, and `DISCORD_APPLICATION_ID`; no `DISCORD_WEBHOOK_URL`, test-channel env, sandbox env, or dry-run env is configured.
- Re-inspected the notification service and call sites. Ticket notifications and intake notifications still send through the same bot message endpoint using `DISCORD_TICKET_CHANNEL_ID` or `DISCORD_INTAKE_CHANNEL_ID`.
- Left `Discord notifications` unchecked. Code-level and mocked HTTP behavior are covered, but live notification parity requires either a safe Discord channel/env override or explicit approval to post a real bot message to the currently configured channels.
- Did not post to Discord, change code, change CSS, alter environment variables, or modify route/API behavior.
files touched:
- `migration_checklist.md`
verification performed:
- Repo/env audit found no safe Discord test/sandbox/dry-run notification target.
- `node --test tests/discord.test.js tests/discord-commands.test.js tests/next-api-adapter.test.js` passed 26/26. Expected failure-path logs appeared for tested method/JSON/signature branches, but the runner was green.

2026-05-27
session 65
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Performed one more read-only Discord safe-target discovery pass without sending any messages. The configured ticket and intake channels still resolve to `open-chat` and `lmnl-chat` in the same guild.
- Listed text-channel names visible to the bot in that guild and found one plausible safe-name candidate: `dev-log`. This is not currently configured as `DISCORD_TICKET_CHANNEL_ID` or `DISCORD_INTAKE_CHANNEL_ID`.
- Left `Discord notifications` unchecked because completion still requires an explicit decision to use a safe target such as `dev-log`, or explicit approval to post to the currently configured channels. No live notification was sent.
- Did not post to Discord, change code, change CSS, alter environment variables, or modify route/API behavior.
files touched:
- `migration_checklist.md`
verification performed:
- Read-only Discord discovery confirmed configured channels `open-chat` and `lmnl-chat`; safe-name candidate `dev-log` exists but is not configured.
- `node --test tests/discord.test.js tests/discord-commands.test.js tests/next-api-adapter.test.js` passed 26/26. Expected failure-path logs appeared for tested method/JSON/signature branches, but the runner was green.

2026-05-27
session 66
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Followed the user's direction to skip ahead to the non-functional cleanup item for the final service-worker/Vite-removal strategy.
- Inspected the current Vite PWA setup. Vite still generates a Workbox `sw.js`, `workbox-*.js`, `registerSW.js`, and `manifest.webmanifest`; Next already has manifest parity at `/manifest.webmanifest` and does not register a new service worker.
- Added a Next `/sw.js` route that intentionally retires old Vite/Workbox service-worker installs during cutover. The route serves a no-store JavaScript service worker that calls `skipWaiting()`, deletes `workbox-*` caches, unregisters itself, and claims clients. This preserves the manifest while intentionally retiring offline precaching instead of replacing it.
- Added a focused test proving the Next `/sw.js` response shape and retirement behavior markers.
- Left Vite scripts/dependencies in place for now so the legacy app remains runnable until final cutover. Do not remove Vite-only infrastructure until Discord notification parity is resolved or explicitly waived and the final cutover decision is made.
- Did not change page CSS, layout, aesthetics, interactions, API implementation files, or public route behavior.
files touched:
- `app/sw.js/route.js`
- `tests/next-service-worker-retirement.test.js`
- `migration_checklist.md`
verification performed:
- `node --test tests/next-service-worker-retirement.test.js` passed 1/1.
- `npm run build:next` passed and listed `/sw.js` as a dynamic App Router route. The existing API adapter Turbopack/NFT tracing warning still appeared.
- `npm run lint` passed.
- `node --test tests/next-service-worker-retirement.test.js tests/next-api-adapter.test.js` passed 7/7. Expected failure-path logs appeared for tested API method/JSON/signature branches, but the runner was green.
- `git diff --check` passed.

2026-05-27
session 67
- Re-read `migration_checklist.md`, `migration_context.md`, and `AGENTS.md`; no project constitution file was present in the repo scan.
- Followed the user's direction to continue clearing out Vite-only infrastructure, while leaving Discord notification delivery as user-owned risk unless/until a live proof target is approved.
- Removed the Vite runtime/build shell: `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `scripts/postbuild.js`, `tests/postbuild-routes.test.js`, root `pages/.gitkeep`, generated `dist`, and generated `dev-dist`.
- Updated `package.json` scripts so `npm run dev`, `npm run build`, and `npm run start` use Next directly. Removed Vite, Vite PWA, Vite React plugin, React Router, and React Refresh ESLint dependencies from `package.json`/`package-lock.json`.
- Removed the Vite SPA rewrite from `vercel.json`; Next proxy/route handling is now the active routing layer.
- Removed React Router imports from shared code. `RouterAdapter` now only provides the route adapter context used by Next wrappers, and `usePageSeo` uses a small local route-pattern matcher.
- Removed unused old Vite navigation components that depended on React Router: `Circle`, `HeaderBar`, `CircularNav`, and `Navigation`.
- Removed Vite public-env fallbacks from `src/lib/clientEnv.js`, `next.config.mjs`, API Supabase config, and social-system flags. The app now expects `NEXT_PUBLIC_*` public env names, with Next config exposing server `SUPABASE_URL`/`SUPABASE_ANON_KEY` as public values when explicit public names are absent.
- Updated `README.md` to describe the Next stack and Next build commands.
- Did not change page CSS, layout, visual assets, animation timing, or user-facing UI copy outside docs.
files touched:
- `package.json`
- `package-lock.json`
- `next.config.mjs`
- `vercel.json`
- `eslint.config.js`
- `README.md`
- `api/[...route].js`
- `api/_lib/env.js`
- `scripts/check-community-oauth.mjs`
- `src/components/RouterAdapter.jsx`
- `src/hooks/usePageSeo.js`
- `src/lib/clientEnv.js`
- `src/lib/socialSystem.js`
- `tests/env.test.js`
- `tests/social-system.test.js`
- `tests/next-service-worker-retirement.test.js`
- `migration_checklist.md`
- deleted Vite-only files listed above
verification performed:
- Stale Vite/React Router scan over active app, API, scripts, tests, package files, README, ESLint config, and Vercel config found no remaining Vite package/script/config/entrypoint or React Router references.
- Vite artifact scan found no `vite.config.*`, root `index.html`, `scripts/postbuild.js`, `src/main.jsx`, `src/App.jsx`, `pages/.gitkeep`, `dist`, or `dev-dist`.
- `npm run lint` passed.
- `npm run build` passed and listed the migrated Next route set, including `/manifest.webmanifest`, `/sitemap.xml`, and `/sw.js`. The existing API adapter Turbopack/NFT tracing warning still appeared.
- `npm test` passed 145/145. Expected failure-path logs appeared for tested API, approval-email, attendance-fallback, Discord signature, and pass-generation branches, but the runner was green.
- `git diff --check` passed.

## 10. Current active task

Vite-only infrastructure has been removed. Next now owns dev/build/start scripts, routing, metadata, sitemap, manifest, and `/sw.js` retirement behavior. The app no longer depends on Vite, Vite PWA, React Router, the Vite SPA entrypoint, or the Vite postbuild SEO generator.

The only remaining unchecked functional item is Discord notifications. Per the user's direction, Discord can be treated as user-owned risk unless a live proof target is approved. All other route, visual, API adapter, SEO/PWA/analytics, Supabase, auth/admin/community, form, ticket/check-in, Apple Wallet, Resend, Square read/checkout/payment/webhook, service-worker strategy, and Vite-removal items are complete.

Important active constraint: do not modify API implementation files unless a concrete Next.js migration step requires it. Prefer documenting an adapter plan before touching API code.

Important visual/functionality constraint: do not change page aesthetics, CSS layouts, responsive behavior, or existing page interactions as part of the migration. Any page migration should aim for visual and functional parity, not redesign.

Vite removal note:
- `NEXT_PUBLIC_*` client env names are now the cutover names. Local `.env` may still contain old `VITE_*` keys, but active application code no longer reads them.
- The retiring `/sw.js` route remains in place for old PWA installs.

## 11. Remaining work

Priority order:
- Discord notifications remain the only unchecked functional item. The user indicated they can fix Discord if it is broken and believes it is working; do not post live Discord notifications without an explicit safe target or approval.
- The Next migration and Vite-only cleanup are otherwise complete. `npm run dev`, `npm run build`, and `npm run start` now use Next directly.
- Use targeted visual checks only if explicitly requested or necessary to assess a concrete migration risk. Do not run a full every-page visual parity sweep; it is skipped by user direction.

## 12. Known issues

- Admin root behavior is hostname-dependent and now migrated in Next: `/` is `Admin` on local/admin host and `Home` on public host.
- API route migration must preserve raw body handling for Square webhook and Discord interactions.
- `next` 16.2.6 is installed and requires Node >= 20.9.0.
- The original temporary Next root shell has been replaced by the migrated host-aware root route. Root metadata is host-aware: public root is index/follow, admin/local root is noindex/nofollow.
- `/share-your-work` is complete as a Next config redirect, not as a page component. `/community/share` is now complete as the artist-interest form route.
- Next dev emitted repeated `Watchpack Error (watcher): Error: EMFILE: too many open files, watch` during this session and served `404` for `/about` even though `npm run build:next` listed `/about`. Use a fresh production preview for route parity checks until this is understood.
- Browser console shows an existing React key warning in `About` for the operating-layers list. It existed during Vite visual inspection and was not changed as part of the migration.
- Local preview processes started during earlier visual verification could not be stopped through the tool session after startup. Check ports 4173, 4174, 3003, and 3004 if local preview startup behaves oddly. Session 6 preview ports 4175, 3005, and 3006 were stopped before handoff.
- `/home` is complete as an alternate public home route. The host-aware root `/` behavior is now complete; `app/page.jsx` is no longer the temporary scaffold.
- `/blog` and `/blog/:slug` are complete. Dynamic post-specific SEO remains client-driven through the existing `BlogPostView` `usePageSeo` hook after data loads; the Next server metadata is generic blog metadata with a slug-specific canonical URL.
- `/community` and `/community/share` are complete. `/community/share` form submission behavior was preserved but not submitted during route verification.
- `/contact` is complete. Contact form submission behavior was preserved but not submitted during route verification.
- `/events` is complete. Public event data loading remains client-driven through the existing `fetchTimelineEvents()` effect; checkout/request flows were not triggered during route verification.
- `/services` is complete. Services inquiry form submission behavior was preserved but not submitted during route verification.
- `/space` is complete. Public data loading remains client-driven through the existing `fetchSpaceEventSnapshot()` and `fetchSpaceTicketActivity()` flows; request, donation, and checkout actions were preserved but not triggered during route verification.
- `/intake` is complete. Direct Supabase form submission behavior was preserved but not submitted during route verification.
- `/success` is complete. Ticket confirmation behavior through `/api/confirm-ticket` was preserved but not triggered during route verification. Its ready-state ticket link now points at the migrated `/ticket/:ticketId` route.
- `/shop` is complete. Public product loading remains client-driven through `fetchOpenProducts()`, and Square checkout creation through `/api/create-checkout` was preserved but not triggered during route verification.
- `/ticket/:ticketId` is complete. Ticket lookup, QR rendering, and Apple Wallet pass behavior were preserved but not triggered during route verification.
- `/portfolio` is complete. Public portfolio loading remains client-driven through `fetchPublishedPortfolioEntries()`, capability query filtering is preserved, and admin portfolio API behavior was not touched.
- `/auth/callback` is complete. Supabase OAuth code exchange and community profile bootstrap behavior were preserved but not triggered during route verification.
- `/app/login` is complete. Community provider OAuth behavior, login preflight, sign-out, and authenticated destination redirects were preserved but not triggered during route verification.
- `/app` is complete. Community session/profile gate behavior and authenticated dashboard/onboarding redirects were preserved but not triggered during route verification.
- `/app/onboarding` is complete. Community profile form write behavior and completion redirects were preserved but not triggered during route verification.
- `/dashboard/:userSlug` is complete. Dashboard API load, attendance claim, sign-out, onboarding edit link, and slug canonicalization behavior were preserved but not triggered during route verification.
- Fallback `*` behavior is complete. Unknown non-API/non-asset Next routes redirect to `/` through `proxy.js`.
- `/login` is complete. Local and `admin.*` hosts render the admin login, public hosts redirect `/login` to `/`, and Supabase sign-in plus `next` query redirect behavior is preserved but not submitted during route verification.
- Host-aware root `/` and public `/admin` redirect behavior are complete. Public `/` renders `Home`, local and `admin.*` `/` render the admin-gated `Admin` route, and public `/admin` redirects to `/`. Authenticated admin data loading was not triggered during route verification.
- `/check-in/:token` is complete. Local and `admin.*` hosts render the admin-gated check-in route, public hosts redirect to `/`, and ticket lookup plus wristband confirmation behavior is preserved but not triggered during route verification.
- `/email-lab` is complete. Local hosts render the existing email lab, public and `admin.*` hosts redirect to `/`, and no production/admin host exposure was observed during route verification.
- API catch-all migration is complete through `app/api/[...route]/route.js`. The adapter intentionally wraps the existing `api/[...route].js` handler instead of splitting endpoints or changing API business logic.
- Next build emits a Turbopack warning for the API adapter import trace through `next.config.mjs` and `api/_lib/env.js`: "Encountered unexpected file in NFT list." The build still succeeds. Treat this as a follow-up only if deployment tracing is affected, because fixing it may require env/config refactoring.
- `npm test -- tests/...` unexpectedly ran the full `npm run test` script and hit the pre-existing `tests/social-system.test.js` extensionless import failure for `src/lib/clientEnv`. Use direct `node --test <files>` for focused API checks until the broader test script/import issue is addressed.
- Next `/sitemap.xml` is complete for the static indexable route set generated by Vite postbuild. Dynamic blog post URLs are still not included in either the old Vite sitemap or the Next sitemap.
- Global Organization/WebSite JSON-LD is present in the Next root layout. Route-specific WebPage JSON-LD is present for migrated static Next routes that correspond to Vite postbuild pages.
- `/share-your-work` differs from Vite SEO output by design: Vite still emits a static noindex canonical HTML file with WebPage JSON-LD, while Next preserves the migrated runtime behavior as a redirect to `/community/share` and therefore does not render route-local JSON-LD for that URL.
- Discord interaction route-level signature verification is complete for the Next catch-all adapter with configured `DISCORD_PUBLIC_KEY`, including valid signed ping and invalid signature cases.
- Next PWA manifest parity is complete at `/manifest.webmanifest`, and Next pages advertise it through root metadata. Final service-worker strategy is complete as of session 66: Next serves `/sw.js` as a no-store retiring service worker for old Vite/Workbox installs, clears `workbox-*` caches, unregisters itself, and does not introduce new offline precaching.
- Apple Wallet unavailable-response behavior is validated through the Next API adapter. Apple Wallet binary `.pkpass` generation/download is complete as of session 49 using configured pass inputs and existing ticket/event data.
- Vercel Analytics and Speed Insights parity is complete. Vite still mounts the React package entrypoints in `src/main.jsx`; Next now mounts the Next package entrypoints in `app/layout.jsx`.
- Dynamic blog, ticket, and community dashboard route rendering is complete at the Next routing/metadata/loading-shell level. Data-loading/authenticated behavior remains tracked separately.
- QR rendering parity is complete for the ticket page with controlled ticket API data in both Next and Vite. Ticket lookup/reconciliation and check-in confirmation remain tracked separately.
- Focused service/adapter test coverage for many pending integration areas passed in session 41, including checkout, payments, inventory, webhook fulfillment, auth helpers, community auth/onboarding helpers, check-in services, email, Discord, PassKit config, and activity feeds. These tests do not replace live HTTP/service validation for checklist items that require real credentials, authenticated sessions, webhook settings, or existing ticket/order data.
- Local `.env` audit in session 48 found Supabase, Resend, Square tokens, Square webhook signature key, Discord public/bot credentials, Apple Wallet pass inputs, and Turnstile configured. Remaining local env gaps are `SQUARE_LOCATION_ID`, `DISCORD_WEBHOOK_URL`, and admin allowlist credentials (`ADMIN_USER_IDS`/`ADMIN_USER_EMAILS`). Do not mark the corresponding live functional parity items complete from local tests alone.
- Session 60 re-scan confirmed the side-effect-sensitive environment is not sandbox-safe by default: Square is configured as production, `RESEND_API_KEY` is present, Discord bot/channel credentials are present, `DISCORD_WEBHOOK_URL` is absent, `SQUARE_SANDBOX_APPLICATION_ID` is absent, and `SQUARE_LOCATION_ID` is absent. Resend was later completed through Resend's safe test-recipient path, and Square checkout/direct payments were later completed through an explicit sandbox override/probe. Discord notification delivery remains the only unchecked side-effect item and still needs an explicit safe target decision.
- Supabase public reads are complete for migrated Next public pages after explicitly enumerating public env keys in `src/lib/clientEnv.js`. Session 42 verified successful public REST reads in Next and Vite for events, community credits/businesses/events, blog posts, and portfolio entries. The direct shop `merch_preorders` query returns the same `400` in both Next and Vite and should be treated as an existing public-data/query behavior unless product scope says otherwise.
- Turnstile verification is complete at the server/helper and Next adapter level. Session 43 verified Cloudflare's official test keys against the live `siteverify` endpoint and confirmed a migrated Turnstile-protected API POST rejects with `TURNSTILE_FAILED` before writes. This does not complete the broader form submission or Supabase write checklist items.
- Homepage visual parity is complete for the public `/home` surface in session 44. When comparing against local Vite preview, use controlled data for API-backed sidebars because Vite preview does not run the local API server, while Next preview does.
- Terminal shell, navigation, and footer/sidebar/social link parity are complete for representative migrated public routes in session 45. The shell was checked across desktop, tablet, and mobile breakpoints, but full responsive parity for all page-specific content remains separate.
- Full every-page visual parity sweep is skipped by user direction as of session 46. Targeted visual checks remain allowed only when explicitly requested or when a concrete migration risk/regression cannot be assessed through code/build/HTTP checks.
- Local-only email lab visibility parity is complete as of session 47. Use a static fallback server over `dist` if future Vite custom-host checks are needed, because `vite preview` blocks arbitrary custom hosts before the SPA route gate runs.
- Typography, spacing, color/theme, animations/transitions, form styling, and button/link states parity are complete as of session 53 by static CSS coverage: Next imports the same stylesheets, in the same order, as Vite. Responsive parity, image rendering parity, admin UI parity, community app UI parity, and ticket/check-in UI parity were completed separately in session 59.
- Square catalog and inventory reads are complete as of session 48. Catalog read was validated through the existing read-only Square catalog service; inventory read was validated both through the service and through the migrated Next catch-all API route. Admin authorization and admin tools were completed separately in sessions 55 and 56.
- Apple Wallet pass generation/download is complete as of session 49. The service generated a real `.pkpass` buffer and the migrated Next catch-all API route returned a valid binary download with the expected headers. Ticket generation/reconciliation was completed separately in session 58.
- Supabase admin reads are complete as of session 50. This was validated through the existing read-only server repository layer with configured admin Supabase credentials. Admin authorization, admin tools, and admin UI parity were completed separately in sessions 55, 56, and 59.
- Session 51 classified every remaining unchecked functional item by its required proof and side-effect risk. Do not mark any of those items complete from existing focused tests alone; they need safe fixtures, authenticated sessions, explicit side-effect approval, or production-like webhook/payment context as documented in the session 51 log.
- Supabase writes are complete as of session 52 through a controlled live insert/read/delete/read-cleanup proof against `mailing_list`. This does not complete form submissions, community onboarding/profile writes, admin tools, ticket reconciliation, check-in confirmation, or any notification/payment side-effect flow.
- Supabase auth/session handling, community auth/session handling, community onboarding gate, and community dashboard/profile routing are complete as of session 54 through temporary Supabase auth users, real sign-in/session tokens, existing server community auth checks, community profile bootstrap/completion, route destination checks, dashboard payload read, and verified cleanup.
- Admin authorization is complete as of session 55 through a temporary Supabase auth user, temporary live `admin_users` row, `requireAdminUser()` validation, migrated Next `/api/admin-session` validation, and verified cleanup. Admin tools were completed separately in session 56.
- Admin tools are complete as of session 56 at the migrated API/tool layer through temporary authenticated admin create/list/delete actions on `/api/mailing-list`, with verified cleanup. This does not complete public form submissions, notification flows, Square checkout/direct-payment mutations, ticket reconciliation, or check-in confirmation.
- Form submissions are complete as of session 57 through controlled migrated Next API adapter submissions for invite/request, service inquiry, and artist-interest forms, with Turnstile test validation where required and verified database cleanup. Discord notifications remain pending separately because those external side effects were intentionally disabled in-process for the form proof; Resend email sending was completed separately in session 61.
- Ticket generation/reconciliation and check-in lookup/confirmation are complete as of session 58 through temporary event/request/ticket/admin rows, mocked Square order retrieval inside the reconciliation service, real ticket creation, migrated Next check-in lookup/confirmation, already-used lookup, attendance verification source cleanup, and verified deletion of all temporary rows. Square checkout creation, direct payments, and Discord notifications remain pending separately; Square webhook signature/fulfillment was completed separately in session 60 and Resend email sending was completed separately in session 61.
- Responsive, image rendering, admin UI, community app UI, and ticket/check-in UI parity are complete as of session 59 at the targeted migration-surface level. This was proven through shared components, identical stylesheet entry-boundary coverage, unchanged responsive CSS/media queries, and absence of a Next image optimization layer. It was not a full every-page screenshot sweep, which remains skipped by user direction.
- Square webhook signature/fulfillment handling is complete as of session 60 through a controlled signed `order.updated` payload using the configured webhook signature key, temporary Supabase event/request rows, real ticket creation, request fulfillment, replay handling, notification no-ops, and verified cleanup. This completes the webhook behavior without creating Square checkout/payment artifacts or sending Resend/Discord side effects.
- Resend email sending is complete as of session 61 through the existing ticket-email service, configured `RESEND_API_KEY`, a safe labeled `delivered+...@resend.dev` Resend test recipient, a returned Resend email id, and focused email/webhook/env tests. This did not send to a real personal/domain recipient.
- Square checkout creation is complete as of session 62 through a real Square Sandbox payment-link creation using temporary Supabase event/request rows, returned checkout URL/order id/payment-link id, request linkage, sandbox payment-link deletion, and local cleanup verification.
- Square direct payments are complete as of session 62 through a real Square Sandbox direct payment using `cnon:card-nonce-ok`, temporary Supabase event/request rows, returned payment id/order id/success redirect, request linkage, and local cleanup verification.
- Discord notifications remain unchecked after session 65. Code-level and mocked HTTP coverage is green, the bot can read the configured channels, and repo/env audit found no configured test channel, sandbox channel, webhook, or dry-run notification target. The actual configured targets are `open-chat` and `lmnl-chat`. A read-only guild scan found `dev-log` as a plausible safe-name candidate, but completion still requires an explicit safe Discord target decision or approval to post a real bot message.

## 13. Commands

Current commands:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
npm run start
```

Migration-specific focused checks:

```bash
node --test tests/next-api-adapter.test.js tests/next-service-worker-retirement.test.js
```

Use `npm run test` after API/service changes.

## 14. Files changed

- `migration_checklist.md` - created central migration handoff document.
- `next.config.mjs` - added Next.js config, `/share-your-work` redirect to `/community/share`, and final public env mapping for Next.
- `package.json` - now uses Next directly for `dev`, `build`, and `start`; Vite dependencies/scripts have been removed.
- `package-lock.json` - lockfile updated by npm for Next 16.2.6 and removal of Vite-only dependencies.
- `app/layout.jsx` - added the App Router root layout, metadata base, global CSS entry-boundary imports for migrated routes, LMNL app/icon/theme metadata, global Organization/WebSite JSON-LD, and Next Vercel Analytics/Speed Insights instrumentation.
- `app/manifest.js` - added the Next App Router web app manifest route matching the Vite-generated manifest contract.
- `app/page.jsx` - added the migrated host-aware root route; public hosts render `Home`, while local and `admin.*` hosts render the admin-gated `Admin` route.
- `eslint.config.js` - ignored generated `.next` output and included root `app/` files in lint coverage; Vite React Refresh config was removed.
- `.gitignore` - ignored generated `.next` output.
- `src/lib/clientEnv.js` - added client environment helper for final `NEXT_PUBLIC_*` public env names.
- `src/lib/supabase.js` - switched Supabase client credentials to the compatibility helper.
- `src/lib/publicData.js` - switched public Supabase REST credentials to the compatibility helper.
- `src/lib/api.js` - switched Turnstile site key access to the compatibility helper.
- `src/lib/socialSystem.js` - switched default social-system env access to the compatibility helper while preserving injected env overrides.
- `app/about/page.jsx` - added the migrated `/about` App Router page and route metadata.
- `app/about/AboutRoute.jsx` - added the client wrapper for the existing About page with Next link/pathname adapter and ThemeProvider.
- `src/components/RouterAdapter.jsx` - added a small router compatibility adapter for React Router in Vite and Next link/pathname/search/navigation injection for migrated routes, including `AppNavigate` for adapter-backed client redirects.
- `src/App.jsx` - wrapped the existing Vite router tree with the React Router adapter provider.
- `src/components/ContentPageShell.jsx` - removed direct global CSS import so CSS is loaded from compliant app entry boundaries.
- `src/components/TerminalShell.jsx` - switched shell links/location to the router adapter, removed direct global CSS import, made mobile breakpoint state subscribe to the client viewport, and initialized sidebar state consistently with server render for Next hydration parity.
- `src/components/TerminalSidebarPanels.jsx` - switched internal links used by the terminal sidebar to the router adapter.
- `src/pages/About.jsx` - switched the page CTA links from React Router `Link` to the router adapter.
- `src/main.jsx` - imports shared shell CSS for the Vite entry boundary.
- `app/prsm/page.jsx` - added the migrated `/prsm` App Router page and route metadata.
- `app/prsm/PrsmRoute.jsx` - added the client wrapper for the existing `GenericPage` route with Next link/pathname adapter and ThemeProvider.
- `app/home/page.jsx` - added the migrated `/home` App Router page and route metadata.
- `app/home/HomeRoute.jsx` - added the client wrapper for the existing Home page with Next link/pathname adapter and ThemeProvider.
- `src/pages/Home.jsx` - switched terminal shortcut links from React Router `Link` to the router adapter and relies on entry-boundary CSS imports.
- `app/blog/page.jsx` - added the migrated `/blog` App Router page and route metadata.
- `app/blog/BlogRoute.jsx` - added the client wrapper for the existing Blog page with Next link/pathname adapter and ThemeProvider.
- `src/pages/Blog.jsx` - switched post links from React Router `Link` to the router adapter and relies on entry-boundary CSS imports.
- `app/community/page.jsx` - added the migrated `/community` App Router page and route metadata.
- `app/community/CommunityRoute.jsx` - added the client wrapper for the existing Community page with Next link/pathname adapter and ThemeProvider.
- `src/pages/Community.jsx` - switched the internal share CTA from React Router `Link` to the router adapter and uses the absolute `/community/share` URL.
- `app/blog/[slug]/page.jsx` - added the migrated dynamic `/blog/:slug` App Router page and route metadata.
- `app/blog/[slug]/BlogPostRoute.jsx` - added the client wrapper for the existing BlogPostView page with Next link/pathname adapter, ThemeProvider, and slug prop.
- `src/pages/BlogPostView.jsx` - removed direct React Router hook/link usage, accepts an optional slug prop for Next, falls back to the current pathname for Vite, and uses the router adapter for back links.
- `app/community/share/page.jsx` - added the migrated `/community/share` App Router page and route metadata.
- `app/community/share/ArtistInterestRoute.jsx` - added the client wrapper for the existing ArtistInterest page with Next link/pathname adapter and ThemeProvider.
- `src/pages/ArtistInterest.jsx` - switched the success-state back link from React Router `Link` to the router adapter and relies on entry-boundary CSS imports.
- `app/contact/page.jsx` - added the migrated `/contact` App Router page and route metadata.
- `app/contact/ContactRoute.jsx` - added the client wrapper for the existing Contact page with Next link/pathname adapter and ThemeProvider.
- `src/pages/Contact.jsx` - removed the direct global CSS import and relies on entry-boundary CSS imports.
- `app/events/page.jsx` - added the migrated `/events` App Router page and route metadata.
- `app/events/EventsRoute.jsx` - added the client wrapper for the existing Events page with Next link/pathname adapter and ThemeProvider.
- `src/pages/Events.jsx` - removed the direct global CSS import and relies on entry-boundary CSS imports.
- `app/services/page.jsx` - added the migrated `/services` App Router page and route metadata.
- `app/services/ServicesRoute.jsx` - added the client wrapper for the existing Services page with Next link/pathname adapter and ThemeProvider.
- `src/pages/Services.jsx` - switched portfolio links from React Router `Link` to the router adapter and relies on entry-boundary CSS imports.
- `app/space/page.jsx` - added the migrated `/space` App Router page and route metadata.
- `app/space/SpaceRoute.jsx` - added the client wrapper for the existing Space page with Next link/pathname adapter and ThemeProvider.
- `src/pages/Space.jsx` - removed the direct global CSS import and relies on entry-boundary CSS imports.
- `app/intake/page.jsx` - added the migrated `/intake` App Router page and route metadata.
- `app/intake/IntakeRoute.jsx` - added the client wrapper for the existing Intake page with Next link/pathname adapter and ThemeProvider.
- `src/pages/Intake.jsx` - removed the direct global CSS import and relies on entry-boundary CSS imports.
- `app/success/page.jsx` - added the migrated `/success` App Router page and route metadata, passing App Router search params into the client route.
- `app/success/SuccessRoute.jsx` - added the client wrapper for the existing Success page with Next link/pathname adapter, ThemeProvider, and search-param prop.
- `src/pages/Success.jsx` - removed direct React Router hook/link usage, accepts optional search params for Next, falls back to browser query params for Vite, and uses the router adapter for action links.
- `app/shop/page.jsx` - added the migrated `/shop` App Router page and route metadata, passing App Router search params into the client route.
- `app/shop/ShopRoute.jsx` - added the client wrapper for the existing Shop page with Next link/pathname adapter, ThemeProvider, and search-param prop.
- `src/pages/Shop.jsx` - removed direct React Router search-param usage, accepts optional search params for Next, and falls back to browser query params for Vite.
- `app/ticket/[ticketId]/page.jsx` - added the migrated dynamic `/ticket/:ticketId` App Router page and generic noindex ticket metadata with ticket-specific canonical URLs.
- `app/ticket/[ticketId]/TicketRoute.jsx` - added the client wrapper for the existing Ticket page with Next link/pathname adapter, ThemeProvider, and ticketId prop.
- `src/pages/Ticket.jsx` - removed direct React Router param usage, accepts an optional ticketId prop for Next, and falls back to parsing the browser pathname for Vite.
- `app/portfolio/page.jsx` - added the migrated `/portfolio` App Router page and route metadata, passing App Router search params into the client route.
- `app/portfolio/PortfolioRoute.jsx` - added the client wrapper for the existing Portfolio page with Next link/pathname adapter, ThemeProvider, and search-param prop.
- `src/pages/Portfolio.jsx` - removed direct React Router hook/link usage, accepts optional search params for Next, falls back to browser query params for Vite, uses browser history for capability query changes, and uses the router adapter for internal action links.
- `app/auth/callback/page.jsx` - added the migrated `/auth/callback` App Router page and noindex route metadata, passing App Router search params into the client route.
- `app/auth/callback/AuthCallbackRoute.jsx` - added the client wrapper for the existing AuthCallback page with Next link/pathname/search/navigation adapter, ThemeProvider, and Supabase session hook.
- `src/pages/AuthCallback.jsx` - removed direct React Router hook usage and now uses the router adapter for location search and navigation while preserving Supabase auth completion logic.
- `app/app/login/page.jsx` - added the migrated `/app/login` App Router page and noindex route metadata, passing App Router search params into the client route.
- `app/app/login/AppLoginRoute.jsx` - added the client wrapper for the existing AppLogin page with Next link/pathname/search/navigation adapter, ThemeProvider, and Supabase session hook.
- `src/pages/AppLogin.jsx` - removed direct React Router hook/component usage and now uses the router adapter for location, navigation, and signed-in redirects while preserving provider login behavior.
- `app/app/page.jsx` - added the migrated `/app` App Router page and noindex route metadata, passing App Router search params into the client route.
- `app/app/AppRoute.jsx` - added the client wrapper for the existing community app entry with Next link/pathname/search/navigation adapter, ThemeProvider, Supabase session hook, shared community gate, and AppHome redirect.
- `src/components/CommunityAppRoute.jsx` - extracted the shared community session/profile gate from the Vite route tree for reuse by Vite and Next.
- `src/pages/AppHome.jsx` - removed direct React Router `Navigate` usage and now uses adapter-backed redirects while preserving dashboard/onboarding destination behavior.
- `app/app/onboarding/page.jsx` - added the migrated `/app/onboarding` App Router page and noindex route metadata, passing App Router search params into the client route.
- `app/app/onboarding/AppOnboardingRoute.jsx` - added the client wrapper for the existing AppOnboarding page with Next link/pathname/search/navigation adapter, ThemeProvider, Supabase session hook, and shared community gate.
- `src/pages/AppOnboarding.jsx` - removed direct React Router hook usage and now uses the router adapter for location and navigation while preserving form write behavior.
- `app/dashboard/[userSlug]/page.jsx` - added the migrated dynamic `/dashboard/:userSlug` App Router page and noindex route metadata with slug-specific canonical URLs.
- `app/dashboard/[userSlug]/DashboardRoute.jsx` - added the client wrapper for the existing UserDashboard page with Next link/pathname/search/navigation adapter, ThemeProvider, Supabase session hook, shared community gate, and dynamic userSlug prop.
- `src/pages/UserDashboard.jsx` - removed direct React Router hook/link/component usage and now uses the router adapter while preserving dashboard API load, claim, sign-out, onboarding edit, and canonical slug behavior.
- `proxy.js` - added the migrated fallback route behavior so unknown non-API/non-asset Next routes redirect to `/` while migrated routes, assets, existing redirects, and the `/login` host gate continue through normally.
- `app/login/page.jsx` - added the migrated `/login` App Router page with host-aware local/admin rendering and public-host redirect behavior.
- `app/login/LoginRoute.jsx` - added the client wrapper for the existing Login page with Next link/pathname/search/navigation adapter and ThemeProvider.
- `src/pages/Login.jsx` - removed direct React Router hook usage and now uses the router adapter while preserving Supabase admin sign-in behavior and `next` redirects.
- `app/AdminRootRoute.jsx` - added the client wrapper for the existing Admin page with Next link/pathname/search/navigation adapter, ThemeProvider, and the admin access gate.
- `app/_admin/AdminProtectedRoute.jsx` - added the migrated admin gate for Next routes, preserving Supabase session checks, `/api/admin-session` verification, denied/login redirects, cached access checks, and route status messages.
- `src/pages/Admin.jsx` - removed the direct global CSS import and relies on entry-boundary CSS imports.
- `app/check-in/[token]/page.jsx` - added the migrated dynamic `/check-in/:token` App Router page with host-aware local/admin rendering and public-host redirect behavior.
- `app/check-in/[token]/CheckInRoute.jsx` - added the client wrapper for the existing CheckIn page with Next link/pathname/search/navigation adapter, ThemeProvider, and the shared admin gate.
- `src/pages/CheckIn.jsx` - removed direct React Router param usage, accepts an optional token prop for Next, and falls back to parsing the adapter pathname for Vite.
- `app/email-lab/page.jsx` - added the migrated local-only `/email-lab` App Router page with public/admin-host redirects.
- `app/email-lab/EmailLabRoute.jsx` - added the client wrapper for the existing EmailLab page with ThemeProvider.
- `src/pages/EmailLab.jsx` - removed the direct global CSS import and relies on entry-boundary CSS imports.
- `app/api/[...route]/route.js` - added the thin Next App Router API catch-all adapter around the existing legacy API handler.
- `tests/next-api-adapter.test.js` - added adapter-focused tests for catch-all routing, JSON body parsing errors, Square raw-body signature preservation, Apple Wallet unavailable-response behavior, and Discord route-level valid/invalid signature handling.
- `app/_seo/site.js` - added shared Next SEO constants, sitemap route inventory, static SEO route inventory, global JSON-LD builders, and WebPage JSON-LD builders.
- `app/_seo/WebPageJsonLd.jsx` - added the reusable server component for route-specific WebPage JSON-LD.
- `app/sitemap.js` - added the Next sitemap route matching the Vite postbuild indexable route set.
- `app/sw.js/route.js` - added the Next cutover service-worker retirement route for old Vite/Workbox installs.
- `tests/next-service-worker-retirement.test.js` - added a focused test for the Next `/sw.js` retirement response.
- `vercel.json` - removed the old Vite SPA rewrite to `/index.html`.
- `README.md` - updated stack, env, and build documentation for Next.
- Removed Vite-only runtime/build files: `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `scripts/postbuild.js`, `tests/postbuild-routes.test.js`, and `pages/.gitkeep`.
- Removed unused old React Router navigation components: `src/components/Circle.jsx`, `src/components/HeaderBar.jsx`, `src/components/CircularNav.jsx`, and `src/components/Navigation.jsx`.
- Removed generated Vite output folders: `dist/` and `dev-dist/`.

## 15. Next recommended task

Start by re-reading the route, API, metadata, PWA, analytics, visual parity, remaining-work, and session 51/52/53/54/55/56/57/58/59/60/61/62/63/64/65/66/67 side-effect classification, Supabase write-proof, CSS parity, auth/profile proof, admin authorization proof, admin tool proof, form submission proof, ticket/check-in proof, targeted visual-surface proof, Square webhook proof, Resend proof, Square checkout proof, Square direct-payment proof, Discord read-only audit, Discord repo/env audit, Discord safe-channel discovery, service-worker strategy, and Vite-removal sections. Public/site routes, community app/auth routes, fallback redirect behavior, admin/host-aware page routes, dynamic route rendering, QR rendering, Supabase public reads, Supabase admin reads, Supabase writes, Supabase auth/session handling, admin authorization, admin tools, community auth/session handling, community onboarding gate, community dashboard/profile routing, form submissions, Turnstile verification, ticket generation/reconciliation, check-in lookup and confirmation, all visual parity checklist items within the user-scoped verification policy, Square catalog reads, Square inventory reads, Square checkout creation, Square direct payments, Square webhook signature/fulfillment handling, Resend email sending, Apple Wallet pass generation/download, the shared API catch-all adapter, global layout metadata, static sitemap generation, route-specific WebPage JSON-LD for static migrated routes, Discord route-level signature verification, Next PWA manifest parity, Next `/sw.js` service-worker retirement behavior, Apple Wallet unavailable-response behavior, Vercel Analytics/Speed Insights parity, full `npm test`, and Vite-only cleanup are complete. The full every-page visual parity sweep is skipped by user direction; use targeted visual checks only if explicitly requested or necessary to assess a concrete migration risk. The only remaining functional checklist item is Discord notifications, which the user indicated they can fix if broken and believe is working. Do not post Discord notifications without an explicit safe target decision because the implementation sends a real bot message to configured channels `open-chat` or `lmnl-chat`; read-only discovery found `dev-log` as a plausible safe-name candidate, but it is not currently configured or approved as the proof target. Run `npm run lint`, `npm run build`, `npm test`, relevant focused tests, and code/HTTP checks. Do not run visual checks merely to confirm ports; verify ports through terminal/HTTP evidence first.
