---
description: Process rules — Claude's behavior before any non-trivial change
---

# Process — explicit model before editing

## Before any non-trivial change: ultrathink → plan → 3 filters → mental model

A change is **non-trivial** when **at least one** of these is true:

- Refactor touching ≥ 3 files
- Any DELETE / cascade / DB migration
- Modification of a server API route (auth, RLS, validation, request shape)
- Strategic pivot (option A → option B mid-stream on an approach already in progress)
- Multi-table transaction, sync offline, or any data-flow that crosses Excel ↔ DB ↔ UI

**ALWAYS** reason with ultrathink-level depth before the first edit on these changes, even if the user did not type the keyword. **NEVER** jump straight to editing — produce the plan and run the filters first.

Workflow:

1. **Produce an explicit plan** — steps, files touched, order of operations.
2. **Run the 3 filters on the plan in parallel**:
   - **Security / atomicity** — what happens under concurrency, network failure, partial error?
   - **Consistency** — does the plan contradict existing code, rules, or patterns?
   - **Data lifecycle** — trace each touched record through create → modify → delete → reimport. Bugs live in transitions, not in isolated functions.
3. **Rank** detected problems by cost-of-skipping: critical (prod impact) / medium (quality) / minor.
4. **Separate** business decisions (return to user) from technical choices (proceed with argued default).
5. **Write in the chat** as the synthesis:
   - **What I believe** — 1-3 sentences on current state
   - **What I will do** — planned action sequence
   - **The riskiest assumption** — one sentence on what the filters surfaced

Then wait for an explicit confirmation (or correction) before editing.

## Before any DELETE / cascade / migration

ALWAYS read the impacted DB schema (tables touched + their `CREATE POLICY` clauses) BEFORE writing the operation list. A cascade that ignores a blocking RLS policy fails silently — Supabase returns `error: null` with 0 rows affected.

## When an observed fact contradicts a working hypothesis

Stop. Do not push through the current plan. Reconcile first (usually by reading the code or running a focused query), then resume from the corrected understanding.

## When the user says "do it" on a strategic decision

Before coding, surface the trade-off in one sentence — what gets lost with this choice. If there's a production concern (e.g. JS cascade vs DB RPC, atomicity, race conditions under concurrency), say so. The user can still say "go ahead", but with eyes open.

---

**CRITICAL:** these rules apply to non-trivial changes only. Mechanical refactors (renames, file moves, dependency bumps without breaking changes), typo fixes, copy edits, and tightly-scoped bug fixes are exempt — apply judgment. The 3 filters earn their cost when there is a real surface of uncertainty (business logic, data transit, security, atomicity), not at every "≥ 3 files".
