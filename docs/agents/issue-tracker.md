# Issue tracker: GitHub

Issues and planning artifacts for this repository live in GitHub Issues at `fvckzest/LMNL`. Use the `gh` CLI for tracker operations.

## Issue operations

- Create, read, comment on, label, assign, and close issues with the corresponding `gh issue` commands.
- When a skill says to publish to the issue tracker, create a GitHub issue.
- When a skill says to fetch a ticket, read the issue body, labels, assignees, and comments.
- GitHub Issues and pull requests share one number space. Resolve an ambiguous number before acting on it.
- Pull requests are not an external feature-request or triage surface.

## Wayfinding operations

- A map is one issue labelled `wayfinder:map`.
- A ticket is a GitHub sub-issue of its map and carries exactly one of `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.
- If GitHub sub-issues are unavailable, put `Part of #<map>` at the top of the ticket and maintain a task-list link in the map.
- Use GitHub's native issue dependencies for blocking. If dependencies are unavailable, put `Blocked by: #<number>` at the top of the blocked ticket.
- The frontier is the map's open, unassigned children with no open blockers, in map order.
- Claim a ticket before working by assigning it to the driving developer.
- Resolve a ticket by posting its answer as a resolution comment, closing it, and appending a one-line linked gist to the map's Decisions-so-far section.

## Pull-request delivery

- Implementation starts from a current fixed point on `main` and uses a scoped `codex/` branch.
- Each implementation pull request addresses one properly scoped implementation issue and links it.
- Do not deliver implementation directly to `main`.
- A pull request describes its scope, important decisions, and local verification evidence.
- Review, acceptance, and merge are distinct states. Do not claim one from evidence of another.
- Preserve unrelated worktree changes and stage only the intended files or hunks.
- GitHub Actions are not required or assumed. Required checks are run locally and reported truthfully in the pull request.
- Merge only after the scoped change has passed its required local checks and received the required review and acceptance.
