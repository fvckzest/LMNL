# LMNL Phase 2 Orientation Prompt

Start by reading:

1. [meta.md](./meta.md)
2. [community_social_system_roadmap.md](./community_social_system_roadmap.md)
3. [community_social_data_model.md](./community_social_data_model.md)
4. [community_social_attendance_verification.md](./community_social_attendance_verification.md)
5. [mobile_mvp_user_flow.md](./mobile_mvp_user_flow.md)

You are inheriting LMNL at the start of Phase 2 design and implementation planning, immediately after Phase 1 community auth closeout.

## What is already true

- admin/community auth separation has been substantially hardened
- Google OAuth is enabled in Supabase
- Supabase signups are enabled
- `profiles` and `user_identities` SQL is applied
- the full Google community flow has now been verified in a real local browser:
  - `/app/login` -> Google -> `/auth/callback` -> `/app/onboarding`
  - onboarding submit -> `/app`
  - sign out -> Google sign-in again -> returning user lands directly in `/app`
- Discord and Apple are still disabled in Supabase and should not be treated as verified
- mixed admin + community access on the same Supabase user is currently considered acceptable as long as route/API authorization boundaries remain explicit
- LMNL is now ready to design attendance proof on top of the verified identity layer

## Important current code context

- `src/pages/AppLogin.jsx`
  - provider authorize preflight still exists
  - enabled providers now fall back to the real OAuth redirect if the browser-side preflight fetch fails
- `src/pages/AuthCallback.jsx`
  - callback prefers the fresh post-exchange Supabase session instead of a stale local app session
- `src/lib/communityProfile.js`
  - community-session eligibility accepts provider-backed session metadata even when `user.identities` is missing
  - profile bootstrap recovers from duplicate `profiles_pkey` races
  - identity bootstrap tolerates duplicate `user_identities_user_provider_key` races
- `scripts/check-community-oauth.mjs`
  - run `npm run check:community-oauth` to verify live provider readiness
- `api/_lib/services/tickets.js`
  - admin-authenticated ticket validation and check-in already exist
  - ticket check-in currently marks operational usage only; it does not yet create a LMNL attendance record
- `src/pages/CheckIn.jsx`
  - current door/check-in surface already exists for admin/staff use
- `src/pages/Ticket.jsx`
  - ticket artifacts already exist operationally, but they are not yet part of the authenticated community dashboard

## Phase 2 direction chosen by the human

- the page should feel like a dashboard when the user is on their own page
- Phase 2 should feel like collection, access, and status
- the canonical Phase 2 object should combine:
  - an artifact that proves they attended
  - points gained for showing up
  - a connection to the others who attended
- performer participation is worth more than standard attendance
- staff-verified attendance must be allowed to attach later
- retroactive connection of past events is a desired capability
- the MVP should stay lightweight and direct rather than trying to expose every heavy social mechanic immediately
- the intended emotional outcome is:
  - once you are in the world, you become part of the network
  - anyone who has shown up, contributed, or performed is now part of LMNL

## What is not finished yet

- define the first concrete Phase 2 product surface in `/app`
- define the first attendance schema and verification provenance model
- define how tickets / invites / staff verification resolve to a signed-in community user
- define how performer-weighted participation should be modeled
- decide when to enable and verify Discord
- decide when to enable and verify Apple
- decide when to retire the temporary admin env allowlist fallback

## Recommended next move

Treat Google-backed Phase 1 as closed and start designing the attendance/dashboard layer from the ground up.

The next concrete task should be:

1. define the first `/app` dashboard experience after a verified event
2. design the attendance artifact / points / connection model as separate but related primitives
3. decide the identity-linking and retroactive staff-attachment rules
4. translate that into Phase 2 SQL, service boundaries, and MVP UI priorities

## Constraints

- do not loosen the admin/community boundary just to make local testing easier
- do not revert existing in-progress auth hardening
- prefer stable system primitives over hard-coded visual metaphors
- keep the MVP lightweight and direct
- preserve legitimacy: attendance proof must still mean something real
- update `meta.md` again if the Phase 2 state materially changes
