---
description: Process rules — Claude's behavior before any non-trivial change
---

# Process — explicit model before editing

## Before any non-trivial change: state the mental model

A change is **non-trivial** when **at least one** of these is true:

- Refactor touching ≥ 3 files
- Any DELETE / cascade / DB migration
- Modification of a server API route (auth, RLS, validation, request shape)
- Strategic pivot (option A → option B mid-stream on an approach already in progress)

Before the first edit, **write in the chat**:

1. **What I believe** — 1-3 sentences on the current behavior or schema as I understand it
2. **What I will do** — the planned action sequence
3. **The riskiest assumption** — one sentence on what could be wrong

Then wait for an explicit confirmation (or correction) before editing.

## Before any DELETE / cascade / migration

ALWAYS read the impacted DB schema (tables touched + their `CREATE POLICY` clauses) BEFORE writing the operation list. A cascade that ignores a blocking RLS policy fails silently — Supabase returns `error: null` with 0 rows affected.

## When an observed fact contradicts a working hypothesis

Stop. Do not push through the current plan. Reconcile first (usually by reading the code or running a focused query), then resume from the corrected understanding.

## When the user says "do it" on a strategic decision

Before coding, surface the trade-off in one sentence — what gets lost with this choice. If there's a production concern (e.g. JS cascade vs DB RPC, atomicity, race conditions under concurrency), say so. The user can still say "go ahead", but with eyes open.

---

**CRITICAL:** these rules apply to non-trivial changes only. Don't slow down typo fixes, single-file renames, copy edits, or tightly-scoped bug fixes — apply judgment.
