## required handoff protocol

this migration must be maintainable across multiple ai/coding agent sessions.

to prevent context loss, drift, redundant work, or accidental redesigns, a living handoff document is required.

before making major migration changes, create:

```txt
migration_checklist.md
```

this file becomes the primary execution document for the migration.

`migration_context.md` defines the strategic rules.

`migration_checklist.md` defines operational reality.

future ai instances should be able to continue the migration successfully by reading `migration_checklist.md` alone.

## migration_checklist.md required structure

the checklist must contain the following sections:

### 1. project summary

brief summary of:
- what the lmnl project is
- what this migration is doing
- current stack
- target stack
- migration philosophy

### 2. migration objective

explicit success criteria:

- preserve visual identity
- preserve layout behavior
- preserve urls
- preserve api functionality
- preserve integrations
- preserve admin functionality
- preserve seo/social metadata parity
- avoid unnecessary redesign or stack changes

### 3. non-negotiable rules

copy the critical preservation rules from this document.

include:
- no redesign
- no typescript conversion unless requested
- no tailwind conversion unless requested
- no business logic rewrites unless required
- no database schema drift unless required
- preserve current user-facing behavior

### 4. route inventory

full route audit:

```txt
old route | next.js file path | status | notes
```

example:

```txt
/                | app/page.js                    | complete | preserved
/events          | app/events/page.js             | complete | preserved
/events/:slug    | app/events/[slug]/page.js      | pending  | dynamic migration needed
/admin           | app/admin/page.js              | pending  | auth validation needed
```

### 5. api inventory

full endpoint audit:

```txt
old endpoint | new endpoint | method | purpose | status | notes
```

example:

```txt
/api/square-webhook | /app/api/square-webhook/route.js | POST | square webhook | pending
```

### 6. environment variable mapping

document all env variables:

```txt
old name | new name | client/server | status
```

example:

```txt
VITE_SUPABASE_URL         → NEXT_PUBLIC_SUPABASE_URL
VITE_SUPABASE_ANON_KEY    → NEXT_PUBLIC_SUPABASE_ANON_KEY
RESEND_API_KEY            → RESEND_API_KEY
SQUARE_ACCESS_TOKEN       → SQUARE_ACCESS_TOKEN
```

### 7. visual parity checklist

must verify:
- homepage parity
- nav parity
- typography parity
- spacing parity
- responsive parity
- animations parity
- image rendering parity
- form styling parity
- admin ui parity

port selection and server readiness must be verified through code or terminal evidence, not visual browser confirmation.

acceptable lightweight checks include:
- package scripts/config that define the port
- dev/preview command output that reports the local url
- `lsof`/process inspection for the expected port
- a simple http status/header/body check against the expected route

do not open a browser, take screenshots, or run visual tooling merely to confirm the correct port.
use visual inspection only for actual ui parity after code-level port verification already identifies the target url.

### 8. functional parity checklist

must verify:
- supabase reads
- supabase writes
- auth/session handling
- form submission
- resend email sending
- square api reads
- square webhook handling
- ticket generation
- qr generation
- apple wallet pass generation
- admin tools
- dynamic route rendering

### 9. completed work log

append chronological entries:

```txt
date
agent/session
completed changes
files touched
verification performed
```

example:

```txt
2026-05-27
session 1
- initialized next.js shell
- migrated homepage
- migrated global css
verified local build
```

### 10. current active task

single section showing current focus.

example:

```txt
currently migrating admin auth flow
```

### 11. remaining work

clear prioritized list.

example:
- migrate event dynamic pages
- migrate api routes
- validate square webhook signatures
- replace seo implementation
- mobile parity audit

### 12. known issues

track breakages, unknowns, blockers.

### 13. commands

include exact project commands:

```bash
npm install
npm run dev
npm run build
```

add any migration-specific commands if introduced.

### 14. files changed

living list of modified files.

### 15. next recommended task

the next safest logical implementation step.

this should allow a new ai instance to immediately continue.

## agent behavior rules

every ai/coding agent must:

1. read `migration_checklist.md` first
2. consult `migration_context.md` if strategic clarification is needed
3. update `migration_checklist.md` before ending its session
4. document any architectural deviation
5. preserve continuity for the next agent

no agent should assume prior conversational context.

the repository documents are the source of truth.

## constitutional precedence

if `migration_checklist.md` conflicts with `migration_context.md`:

`migration_context.md` wins.

the checklist tracks execution.

the context defines doctrine.
