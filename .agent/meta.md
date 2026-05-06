# LMNL Social System Meta Prompt

You are joining the LMNL codebase during the early implementation planning stage of the community social system.

Your job is to help design and implement the LMNL social layer carefully, without compromising:

- the current public website
- the existing admin console
- the legitimacy of the future social product

This document is the standing context prompt for each new Codex instance working on this area.

You should read it first, use it to orient your work, and update it whenever the state of the project changes in a meaningful way.

---

## 1. What We Are Building

LMNL is evolving toward a collectible, networked social system built around:

- identity
- attendance
- collection
- connection
- access
- contribution
- progression

The intended product is not a generic social app.

It should feel culturally intentional and legitimacy-driven.

The core loop is:

`enter -> attend -> collect -> link -> unlock`

The current priority is building the right foundation before overbuilding flashy UI or complex reward systems.

---

## 2. Current Project State

### Phase status

`Phase 0: Foundations and Product Framing` is now considered complete.

That means the project now has:

- product framing
- vocabulary
- data model direction
- user-flow context
- trust and consent assumptions
- attendance verification strategy
- OAuth auth implementation plan

### What has not been built yet

The actual community social product is not live yet.

There is not yet:

- attendance-based community user history
- collectible ownership system
- overlap/link system
- access/unlock logic for community users

There is now an initial community auth shell in the app layer, but it is still infrastructure-only:

- separate `/app/login` OAuth entry
- separate `/auth/callback`
- separate protected `/app` shell route

What still does not exist yet:

- production-ready provider configuration for all intended providers
- any live social data model on top of the auth shell

### What has already started in code

A small foundation module was added to begin separating social-system logic from current UI:

- [src/lib/socialSystem.js](../src/lib/socialSystem.js)

This currently provides:

- social system phases/primitives
- feature-flag helpers
- a read-only community directory bridge for the existing `/community` page

The current public community page now uses that bridge:

- [src/pages/Community.jsx](../src/pages/Community.jsx)

Tests were added for this foundation layer:

- [tests/social-system.test.js](../tests/social-system.test.js)

This work is intentionally low-risk and does not expose new social features publicly.

Community OAuth shell work has now started in the frontend routing layer:

- [src/pages/AppLogin.jsx](../src/pages/AppLogin.jsx)
- [src/pages/AuthCallback.jsx](../src/pages/AuthCallback.jsx)
- [src/pages/AppHome.jsx](../src/pages/AppHome.jsx)
- [src/lib/communityAuth.js](../src/lib/communityAuth.js)

Community profile bootstrap and onboarding routing have now started on top of that shell:

- [src/lib/communityProfile.js](../src/lib/communityProfile.js)
- [src/pages/AppOnboarding.jsx](../src/pages/AppOnboarding.jsx)
- [sql/phase1_community_profiles.sql](../sql/phase1_community_profiles.sql)

Admin authorization hardening has now started in code as the first Phase 1 safety step:

- [api/_lib/auth.js](../api/_lib/auth.js)
- [api/_lib/env.js](../api/_lib/env.js)
- [api/[...route].js](../api/[...route].js)
- [src/App.jsx](../src/App.jsx)
- [src/pages/Login.jsx](../src/pages/Login.jsx)

This new work introduces:

- explicit admin authorization checks on top of Supabase identity
- support for `admin_users` table authorization
- a temporary env-based allowlist fallback for safe rollout before the table exists
- an admin session verification endpoint for frontend route guarding
- protected admin API routes for dashboard reads and community-management writes
- a public `event-stats` API bridge so public pages no longer read `requests` counts directly from the browser
- broader Phase 1 SQL policy coverage for mixed public/admin tables like `events`, `requests`, `tickets`, `merch_preorders`, and `blog_posts`
- a manual SQL setup artifact for table-backed admin authorization:
  - [sql/phase1_admin_authorization.sql](../sql/phase1_admin_authorization.sql)

The database-side admin authorization hardening has now been applied in Supabase.

The current transitional pieces are now:

- Google OAuth is now enabled in Supabase
- Supabase signups are now enabled, which was required to allow first-time Google OAuth community users instead of failing with `signup_disabled`
- Google authorize preflight now reaches Google successfully for the local callback target `http://127.0.0.1:4174/auth/callback?next=%2Fapp`
- a real local browser pass has now completed the full Google Phase 1 community flow, confirming:
  - `/app/login` -> Google -> `/auth/callback` -> profile bootstrap -> `/app/onboarding`
  - onboarding submit now lands correctly in `/app`
  - sign out and re-enter with Google now skips onboarding and lands directly in `/app`
  - app home/profile shell state has been manually verified after onboarding completion
  - provider-backed LMNL profile bootstrap is functioning for at least one real community account
- Discord and Apple still need live provider enablement verification and currently still return `Unsupported provider: provider is not enabled` from authorize preflight
- the community login surface now preflights provider authorize URLs so disabled providers fail in-app with a readable message instead of bouncing users to a raw Supabase JSON error page
- if the local browser cannot fetch the provider preflight URL cleanly, enabled providers can now still continue through the real OAuth redirect instead of failing on `Failed to fetch`
- the Phase 1 `profiles` / `user_identities` SQL has been applied in Supabase
- community auth now bootstraps a LMNL-owned `profiles` row plus `user_identities` record after sign-in
- onboarding routing now exists at `/app/onboarding` for incomplete profiles, and preserved `/app` destinations now survive callback -> onboarding -> app redirects
- `/auth/callback` now always completes profile bootstrap before routing, even if a session is already present locally
- `/auth/callback` now prefers the fresh post-exchange community session instead of clinging to an older local app session during local testing
- onboarding save errors now provide a clearer message when a requested `profile_slug` is already taken
- first-time community profiles now stay onboarding-blocked until the user explicitly confirms LMNL profile details, even if the OAuth provider already supplied a usable display name/avatar:
  - bootstrap still prefills provider-derived profile data to reduce friction
  - but new `profiles` rows no longer mark `onboarding_completed` true automatically on insert
- community app bootstrap now rejects non-community Supabase sessions before profile creation:
  - `/app` no longer treats any arbitrary authenticated session as valid community access
  - supported community access is currently limited to provider-backed Google / Discord / Apple sessions, including cases where the client session has provider metadata but no visible `user.identities` array
  - `/app/login` now surfaces a recovery state for existing non-community sessions instead of auto-forwarding them into a failing bootstrap path
- community auth redirect preservation is now tighter around the current Phase 1 surface:
  - preserved `next` destinations still survive login -> callback -> onboarding for real `/app...` routes
  - but auth now drops invalid or loop-prone destinations like `/app-login` or `/app/login` back to `/app` instead of preserving them
- bootstrap is now more resilient under local React/Vite dev races:
  - duplicate `profiles_pkey` inserts are recovered by re-reading the row
  - duplicate `user_identities_user_provider_key` inserts are tolerated when a parallel bootstrap pass already recorded the provider identity
- the env-based admin allowlist fallback should still be treated as temporary until the project fully relies on `admin_users`
- provider metadata coverage now has direct tests for Google / Discord / Apple-shaped identity payloads in:
  - [tests/community-auth.test.js](../tests/community-auth.test.js)
- `createUserIdentityPayload()` now prefers provider-owned identity fields like `provider_id` / `sub` over Supabase's internal identity row id when persisting `user_identities.provider_user_id`
- `/auth/callback` now has a basic recovery path instead of acting like a dead-end error wall:
  - if the OAuth code exchange errors but a usable community session already exists locally, callback now continues through profile bootstrap instead of failing immediately
  - callback error states now give the user an in-app route back to `/app/login`, plus a clean sign-out-and-retry option when a session exists but bootstrap needs to be restarted
- `/app` and `/app/onboarding` now also avoid a bootstrap-failure dead end:
  - if `ensureCommunityProfile()` fails inside the protected community route gate after sign-in, the user now gets a community-scoped recovery screen with sign-out-and-retry and back-home actions instead of a bare static fallback message
- mixed admin + community access resolving to the same Supabase user is currently considered acceptable:
  - admin routes and APIs still require explicit admin authorization
  - community app routes still require eligible provider-backed community sessions
  - shared authentication identity is allowed; shared authorization is not
- local dev runtime now proactively clears stale service workers and caches in `import.meta.env.DEV` on `localhost` / `127.0.0.1`:
  - this is meant to prevent old PWA workers from pinning the in-app browser to stale community-auth UI while the source tree and served module code have already moved on
  - after restarting the local Vite server on `http://127.0.0.1:4174`, `/auth/callback?next=%2Fapp` now renders the recovery buttons in-browser again and `RETURN TO COMMUNITY SIGN-IN` successfully routes to `/app/login`

### Current GitHub checkpoint

The current Phase 1 security-first implementation work has been saved off `main` on:

- branch: `codex-phase1-admin-hardening`
- latest committed checkpoint: `ee903ad`
- PR entry point:
  - https://github.com/fvckzest/LMNL/pull/new/codex-phase1-admin-hardening

There is also newer post-`ee903ad` hardening covering:

- onboarding hardening so provider-prefilled community profiles still require explicit LMNL confirmation before `/app` access is granted:
  - new profile bootstrap still stores provider-derived `display_name` / `avatar_url` when available
  - but `onboarding_completed` now remains false until `/app/onboarding` is submitted successfully
- community-session eligibility hardening so admin/password or other non-community sessions cannot silently enter the community profile bootstrap path:
  - `ensureCommunityProfile()` now rejects unsupported/non-provider-backed sessions before any `profiles` / `user_identities` writes
  - `/app/login` now gives already-signed-in non-community users a sign-out-and-retry recovery path instead of auto-navigating them into `/app`
- live provider verification and Google auth hardening:
  - `scripts/check-community-oauth.mjs` now verifies live provider readiness against the configured Supabase project
  - `package.json` now exposes `npm run check:community-oauth`
  - Google now passes that live provider readiness check; Discord and Apple still fail as disabled
- callback / bootstrap fixes discovered during a real local Google sign-in pass:
  - enabled providers now fall back to the real OAuth redirect when browser-side preflight fetch fails
  - `/auth/callback` now prefers the fresh post-Google session returned by Supabase after code exchange
  - provider-backed sessions can now be accepted even when the client payload lacks a visible `identities` array
  - profile and identity bootstrap now recover from duplicate-row races instead of failing on unique constraints
- real browser verification progress:
  - first-time Google sign-in now reaches `/app/onboarding` locally for a clean community account
  - onboarding submission into `/app` has now been completed and verified
  - returning-user Google re-entry now skips onboarding and lands directly in `/app`
  - app home/profile shell state has now been manually verified after onboarding completion

Future Codex instances working on this rollout should prefer continuing from that branch instead of rebuilding this work from the `main` branch state.

---

## 3. Current Strategic Priority

The next implementation priority is not visual social features.

The next priority is:

`Phase 2 orientation: attendance proof on top of the verified identity layer`

That means:

1. preserve the verified Google-backed community auth path
2. keep admin/community authorization boundaries explicit
3. design the attendance proof layer from the ground up now that LMNL identity exists
4. implement attendance-backed identity history before collectibles, links, or unlocks

The admin console currently uses Supabase Auth already.

Because future community users will also use Supabase Auth, admin authorization must be explicitly separated from community authentication.

That separation is now enforced at the database-policy level for current admin-managed surfaces, and the next step is completing community-facing identity bootstrap on top of that boundary.

That identity bootstrap now exists, and the Google-backed Phase 1 community path has been browser-verified end to end without weakening the admin/community boundary.

At this point, Phase 1 can be treated as operationally complete on the verified Google path, and the project can move into Phase 2 planning.

The most important remaining work is now:

- deciding the right conceptual shape for attendance proof now that auth and profiles are real
- deciding how checked-in tickets or invite artifacts should resolve to a signed-in LMNL community user
- deciding the first Phase 2 schema and service boundaries for attendance records and verification provenance
- refining and browser-verifying the first user-facing attendance history surface inside `/dashboard/:userSlug`
- deciding when to enable and verify Discord without regressing Google
- deciding when to enable and verify Apple without regressing Google
- deciding when to retire the temporary env-based admin allowlist fallback

Phase 2 orientation has now been translated into a concrete MVP direction in:

- [.agent/phase2_attendance_dashboard_mvp.md](./phase2_attendance_dashboard_mvp.md)

The first implementation slice of that MVP now exists in code:

- [sql/phase2_attendance_dashboard.sql](../sql/phase2_attendance_dashboard.sql)
- [api/_lib/auth-community.js](../api/_lib/auth-community.js)
- [api/_lib/repositories/attendance.js](../api/_lib/repositories/attendance.js)
- [api/_lib/services/attendance.js](../api/_lib/services/attendance.js)
- [api/_lib/services/community-dashboard.js](../api/_lib/services/community-dashboard.js)
- [src/pages/AppHome.jsx](../src/pages/AppHome.jsx)
- [src/pages/UserDashboard.jsx](../src/pages/UserDashboard.jsx)
- [src/pages/UserDashboard.css](../src/pages/UserDashboard.css)
- [src/lib/communityProfile.js](../src/lib/communityProfile.js)
- [src/lib/communityAuth.js](../src/lib/communityAuth.js)
- [src/pages/AppOnboarding.jsx](../src/pages/AppOnboarding.jsx)

That implementation currently provides:

- a separate community bearer-token auth helper so community API reads do not piggyback on admin authorization
- a first Phase 2 SQL shape for:
  - attendance verification provenance
  - canonical attendance records
  - attendance artifacts
  - point ledger entries
- a community dashboard endpoint at `/api/app-dashboard`
- a community claim endpoint at `/api/attendance-claim`
- an admin attach endpoint at `/api/admin-attendance-attach`
- an admin attendance resolution queue so staff can resolve unresolved attendance proof to exact-match LMNL members from the admin console
- attendance-aware ticket check-in capture:
  - admin ticket check-in still marks the operational ticket as used
  - and now also attempts to record Phase 2 attendance provenance without breaking the check-in flow if the new tables are not present yet
- a member dashboard route at `/dashboard/:userSlug` that surfaces:
  - latest proof
  - event/point status
  - recent attendance history
  - shared attendance preview
  - pending claimable proof
- `/app` now acts as a protected handoff into the signed-in member's canonical slugged dashboard route instead of remaining the long-term dashboard URL
- onboarding now requires a LMNL-owned `profile_slug`, and profile completion now treats that slug as part of a finished community identity
- community auth redirect preservation now supports `/dashboard/...` destinations across login, callback, and onboarding
- unresolved attendance proof now appears in both:
  - the member dashboard claim surface when a matching signed-in community user can claim it
  - the admin attendance resolution queue when staff need to retroactively attach it
- the logged-in member dashboard/frontend route flow has passed `npm test` and `npm run build`
- a real browser pass has now been completed against the full-stack local server at `http://127.0.0.1:3000`, confirming:
  - `/app/login?next=/dashboard/cory` -> Google -> `/auth/callback` -> `/dashboard/cory` now works on the verified Google path
  - signed-in access to `/dashboard/not-cory` canonically corrects back to `/dashboard/cory`
  - the member dashboard renders the empty-state Phase 2 modules correctly when a member has no attendance yet
  - the member dashboard empty claim state was verified for a live community user with no unresolved proof
- local runtime caveat discovered during verification:
  - bare Vite dev at `http://127.0.0.1:4174` does not serve the Vercel `/api/*` routes, so dashboard fetches there fall through to HTML and produce JSON parse errors
  - meaningful end-to-end Phase 2 browser verification should therefore use the full-stack local server on port `3000`, not the Vite-only server on `4174`
- Safari-specific login hardening was required during this pass:
  - community OAuth preflight fallback now also treats Safari's `Load failed` fetch error as a browser-side preflight failure and falls back to the direct provider redirect instead of surfacing a dead-end login error
- browser verification is still incomplete for one Phase 2 admin edge:
  - the admin attendance resolution queue currently has `0` unresolved items in local data, so the staff-side attach interaction still needs a later live browser pass with seeded or naturally pending attendance proof

That working direction currently assumes:

- `/app` should resolve immediately into the member's own slugged dashboard route
- the first canonical Phase 2 object is a verified attendance record connected to:
  - proof provenance
  - a user-facing attendance artifact
  - point ledger entries
  - derived shared-attendance connections
- performer participation should be modeled as a stronger attendance tier, not as a duplicate event-history row
- unresolved ticket or invite proof may exist before user resolution and can later be attached by exact identity match or explicit staff action
- retroactive staff attachment is an intentional MVP capability and must preserve provenance instead of looking identical to a real-time self-claim
- the first implementation pass should stay lightweight:
  - no heavy public social graph
  - no full collectible economy
  - no loosened admin/community authorization boundary

---

## 4. Non-Negotiable Guardrails

### Protect the current website

Do not break or casually reshape the current public website while building the social system.

New social functionality should be:

- isolated
- feature-flagged where appropriate
- introduced incrementally

### Protect the admin console

Do not assume `authenticated` means `admin`.

This is one of the most important rules in the project.

Community users may eventually authenticate through the same Supabase project.

Admin access must remain explicitly authorized.

### Preserve legitimacy

Do not add mechanics that weaken trust.

Examples of unsafe shortcuts:

- treating RSVP as attendance
- exposing named social overlap too early
- using shallow gamification language
- letting users self-award contribution status

### Keep implementation abstract where possible

Prefer stable system primitives over hard-coded visual metaphors.

Examples:

- `profile`
- `attendance`
- `collectible`
- `link`
- `access_rule`
- `access_grant`

Do not encode the product too tightly around one visual idea like:

- graph
- map
- wallet
- constellation

---

## 5. Relevant Documents To Read

These files are the main planning corpus for the social system.

### Primary planning docs

- [community_social_system_roadmap.md](./community_social_system_roadmap.md)
  Roadmap, phases, outcomes, and implementation priorities.

- [community_social_system_spec.md](./community_social_system_spec.md)
  Product thesis, legitimacy model, collectible logic, link model, and emotional direction.

- [community_social_data_model.md](./community_social_data_model.md)
  Core entities, relationships, and system modeling boundaries.

### Phase 0 closeout docs

- [community_social_vocabulary.md](./community_social_vocabulary.md)
  Canonical terms and distinctions for system language.

- [community_social_trust_and_consent.md](./community_social_trust_and_consent.md)
  Initial visibility, consent, and relationship guardrails.

- [community_social_attendance_verification.md](./community_social_attendance_verification.md)
  The selected MVP attendance verification strategy.

### Auth and implementation planning

- [community_social_oauth_implementation.md](./community_social_oauth_implementation.md)
  Google, Discord, and Apple auth architecture and admin safety requirements.

- [phase1_closeout_checklist.md](./phase1_closeout_checklist.md)
  Operational finish-line checklist for completing Phase 1 rollout safely.

### Flow and surface context

- [mobile_mvp_user_flow.md](./mobile_mvp_user_flow.md)
  The clearest first-pass user journey for the social system.

- [mobile_desktop_product_architecture.md](./mobile_desktop_product_architecture.md)
  Product surface split between mobile, desktop, and web.

### Codebase map

- [STRUCTURE.md](./STRUCTURE.md)
  High-level codebase orientation.

---

## 6. Current Technical Context

### Existing auth/admin setup

Important files:

- [src/App.jsx](../src/App.jsx)
- [src/pages/Login.jsx](../src/pages/Login.jsx)
- [src/lib/supabase.js](../src/lib/supabase.js)
- [src/lib/api.js](../src/lib/api.js)
- [api/_lib/auth.js](../api/_lib/auth.js)

What matters:

- admin routes already exist
- admin login already exists
- admin APIs already verify bearer tokens
- this is not yet sufficient for a world with community users

### Existing community/public surface

Important files:

- [src/pages/Community.jsx](../src/pages/Community.jsx)
- [src/lib/siteData.js](../src/lib/siteData.js)
- [src/components/admin/CommunityTab.jsx](../src/components/admin/CommunityTab.jsx)

What matters:

- `/community` is currently a public-facing community directory/marketing surface
- it is not the future authenticated social product
- do not confuse the existing page with the future app layer

### Existing tests

Important files:

- [tests/auth.test.js](../tests/auth.test.js)
- [tests/social-system.test.js](../tests/social-system.test.js)

These matter when changing auth boundaries or social primitives.

### Existing attendance / ticket operations

Important files:

- [api/_lib/services/tickets.js](../api/_lib/services/tickets.js)
- [api/_lib/repositories/tickets.js](../api/_lib/repositories/tickets.js)
- [src/pages/CheckIn.jsx](../src/pages/CheckIn.jsx)
- [src/pages/Ticket.jsx](../src/pages/Ticket.jsx)
- [api/_lib/services/webhook-fulfillment.js](../api/_lib/services/webhook-fulfillment.js)

What matters:

- LMNL already has admin-authenticated ticket validation and check-in flows
- ticket issuance and Square fulfillment already connect ticket records to events and guest contact data
- current check-in marks ticket usage operationally, but does not yet create a LMNL-owned attendance record
- there is not yet an `attendances` table or attendance-verification provenance layer in the community system
- there is not yet a clean bridge from checked-in participation artifacts back to a signed-in community profile

---

## 7. Chosen Product Decisions So Far

These are active working decisions unless explicitly changed.

### Auth

Community auth direction:

- Google
- Discord
- Apple

via Supabase Auth as the session/auth broker.

### Attendance verification

Chosen MVP strategy:

- event-linked QR or token-based check-in
- tied to ticket or invite eligibility when available
- staff/admin fallback allowed

Phase 2 direction now established:

- the first meaningful authenticated community surface should feel like a dashboard on the user's own page
- Phase 2 should emphasize collection, access, and status
- the canonical Phase 2 object should combine:
  - an artifact proving the user attended
  - points gained for showing up
  - a connection to others who attended
- performer participation should count as more valuable than standard attendance
- staff-verified attendance must be allowed to attach later so past events can be connected retroactively
- the MVP should stay lightweight and direct rather than trying to expose every possible social or rarity system immediately
- the desired emotional outcome is that once someone is inside LMNL, showing up, contributing, or performing makes them part of the network

### Social reveal posture

Early social surfaces should be conservative.

Start with:

- overlap counts
- limited reveal
- consent-aware logic

Do not start with:

- full public graph
- broad attendee identity exposure
- aggressive discoverability

### Data model posture

Use stable system primitives.

Do not overfit to one final UI metaphor.

### Phase 2 product posture

Phase 2 should not begin as a generic event log.

It should begin as the first real LMNL dashboard:

- a personal status surface
- a collection-oriented attendance history
- an access/progression signal
- the earliest proof that the user is now part of the LMNL network

The implementation should still stay modular underneath that surface:

- attendance record
- artifact / collectible layer
- points / status layer
- relationship / connection layer

---

## 8. Expected Next Steps

Unless the user explicitly redirects, the next likely work should follow this order:

1. Phase 2 attendance model design
2. attendance schema and verification provenance implementation
3. attendance-to-profile identity linking
4. first authenticated attendance history surface in `/app`
5. first collectible history
6. first overlap signal
7. first unlock/access rule

The most urgent technical safety task is:

`turn operational check-in into LMNL-owned attendance without weakening legitimacy or auth boundaries`

This now means:

- introducing a first-class attendance record and verification provenance model
- deciding how ticket-linked or invite-linked event participation resolves to a signed-in LMNL user
- keeping RSVP, purchase, and verified attendance distinct in both schema and product language
- exposing the first attendance history state inside the community app as a dashboard rather than a bare admin-style log
- deciding how to represent performer/contributor attendance as a higher-value participation type
- supporting staff-attached and retroactively attached attendance without weakening legitimacy
- preserving the now-verified Google path while later providers are added
- completing the shift from transitional env fallback to table-backed authorization as the only long-term source of truth
- enabling and verifying the remaining provider configuration for Discord / Apple
- extending profile bootstrap after additional real provider rollout if more metadata mapping is needed

Application-side admin dashboard reads and community-management writes now route through protected server APIs rather than browser-side Supabase table access in the main admin flow.
Public event attendance counts now also route through a server API bridge so the `requests` table can be tightened without exposing customer request data to browser-side reads.
Community sign-in now has its own `/app/login` and `/auth/callback` flow so it does not collide with `/login`.

---

## 9. How To Use This Meta File

Whenever you begin work in this area:

1. read this file
2. read the relevant linked docs
3. confirm the current phase and priorities before making architectural decisions
4. avoid assuming that older docs are fully implemented in code

Whenever you finish meaningful work in this area:

1. update this file if the project state changed
2. add any newly important planning docs or implementation files
3. revise the “Current Project State” and “Expected Next Steps” sections if needed

This file should remain a reliable starting point for the next Codex instance.

---

## 10. Update Rule

Keep `meta.md` up to date.

Update it when any of the following change:

- project phase
- chosen auth strategy
- attendance verification strategy
- trust/consent posture
- major implementation progress
- important new planning docs
- important new source files related to the social system

If you make a meaningful change and do not update this file, you are leaving behind stale coordination context.

---

## 11. Working Summary For New Codex Instances

LMNL has completed planning Phase 0 for the social system.

The social product is not built yet.

The current mission is to move into Phase 1 carefully, without endangering:

- admin security
- public-site stability
- product legitimacy

Work from the planning docs first.

Prefer security-first, modular, low-risk implementation steps.
