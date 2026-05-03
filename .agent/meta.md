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

- production-ready provider configuration
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

- provider configuration for Google / Discord / Apple still needs final Supabase dashboard verification, and the current project ref returns `Unsupported provider: provider is not enabled` for all three provider authorize endpoints
- the community login surface now preflights provider authorize URLs so disabled providers fail in-app with a readable message instead of bouncing users to a raw Supabase JSON error page
- the Phase 1 `profiles` / `user_identities` SQL has been applied in Supabase
- community auth now bootstraps a LMNL-owned `profiles` row plus `user_identities` record after sign-in
- onboarding routing now exists at `/app/onboarding` for incomplete profiles, and preserved `/app` destinations now survive callback -> onboarding -> app redirects
- `/auth/callback` now always completes profile bootstrap before routing, even if a session is already present locally
- onboarding save errors now provide a clearer message when a requested `profile_slug` is already taken
- the env-based admin allowlist fallback should still be treated as temporary until the project fully relies on `admin_users`
- provider metadata coverage now has direct tests for Google / Discord / Apple-shaped identity payloads in:
  - [tests/community-auth.test.js](../tests/community-auth.test.js)
- `createUserIdentityPayload()` now prefers provider-owned identity fields like `provider_id` / `sub` over Supabase's internal identity row id when persisting `user_identities.provider_user_id`
- `/auth/callback` now has a basic recovery path instead of acting like a dead-end error wall:
  - if the OAuth code exchange errors but a usable community session already exists locally, callback now continues through profile bootstrap instead of failing immediately
  - callback error states now give the user an in-app route back to `/app/login`, plus a clean sign-out-and-retry option when a session exists but bootstrap needs to be restarted
- `/app` and `/app/onboarding` now also avoid a bootstrap-failure dead end:
  - if `ensureCommunityProfile()` fails inside the protected community route gate after sign-in, the user now gets a community-scoped recovery screen with sign-out-and-retry and back-home actions instead of a bare static fallback message
- local dev runtime now proactively clears stale service workers and caches in `import.meta.env.DEV` on `localhost` / `127.0.0.1`:
  - this is meant to prevent old PWA workers from pinning the in-app browser to stale community-auth UI while the source tree and served module code have already moved on
  - after restarting the local Vite server on `http://127.0.0.1:4174`, `/auth/callback?next=%2Fapp` now renders the recovery buttons in-browser again and `RETURN TO COMMUNITY SIGN-IN` successfully routes to `/app/login`

### Current GitHub checkpoint

The current Phase 1 security-first implementation work has been saved off `main` on:

- branch: `codex-phase1-admin-hardening`
- latest committed checkpoint: `1c36035`
- PR entry point:
  - https://github.com/fvckzest/LMNL/pull/new/codex-phase1-admin-hardening

There is also newer uncommitted working-tree hardening on top of `1c36035` covering:

- callback recovery when `/auth/callback` is revisited or otherwise lands in an exchange-error state even though a usable community session already exists locally
- callback error-state recovery CTAs so users can return to community sign-in or sign out and retry instead of being stranded on a static error panel
- route-gate recovery CTAs so `/app` bootstrap failures do not trap signed-in community users on an inert "community access is unavailable" message
- local-only service-worker cleanup in `src/main.jsx` to reduce stale-cache false negatives during community-auth browser verification

Future Codex instances working on this rollout should prefer continuing from that branch instead of rebuilding this work from the `main` branch state.

---

## 3. Current Strategic Priority

The next implementation priority is not visual social features.

The next priority is:

`Phase 1 with security-first sequencing`

That means:

1. harden admin authorization before community auth launches
2. implement community OAuth shell
3. add profile bootstrap
4. later add attendance-backed identity history

The admin console currently uses Supabase Auth already.

Because future community users will also use Supabase Auth, admin authorization must be explicitly separated from community authentication.

That separation is now enforced at the database-policy level for current admin-managed surfaces, and the next step is completing community-facing identity bootstrap on top of that boundary.

That identity bootstrap now exists, so the remaining near-term Phase 1 work is making the community auth surface feel operationally safe and launch-ready without weakening the admin/community boundary.

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

---

## 8. Expected Next Steps

Unless the user explicitly redirects, the next likely work should follow this order:

1. admin authorization hardening
2. community auth shell
3. profile bootstrap
4. attendance model implementation
5. first collectible history
6. first overlap signal
7. first unlock/access rule

The most urgent technical safety task is:

`make admin authorization explicit before community auth goes live`

This now means finishing the remaining pieces around the code hardening that has already started:

- completing the shift from transitional env fallback to table-backed authorization as the only long-term source of truth
- adding provider configuration for Google / Discord / Apple
- applying `profiles` and `user_identities` in Supabase from `sql/phase1_community_profiles.sql`
- extending profile bootstrap after real provider rollout if additional metadata mapping is needed

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
