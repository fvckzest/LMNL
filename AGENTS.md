# AGENTS.md

this repository has strict behavioral constraints for autonomous coding agents.

rules:

1. visual parity is mandatory
do not alter spacing, typography, layout, animation timing, or interaction behavior unless explicitly required for framework compatibility.

2. preserve existing functionality
all api behavior, form handling, integrations, and client flows must remain intact.

3. no speculative refactors
do not "improve" architecture unless required for migration success.

4. migrate incrementally
prefer preserving file/function logic over rewriting from scratch.

5. use migration_checklist.md as execution plan
update checklist as tasks complete.

6. migration_context.md is source of architectural intent
if unclear, defer to migration_context.md over assumptions.

7. surface blockers explicitly
do not invent replacements for unclear functionality.