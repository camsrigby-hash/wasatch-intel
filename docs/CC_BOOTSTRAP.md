# CC_BOOTSTRAP.md — Claude Code session starter

**How the user uses this file:** paste exactly this at the start of every Claude Code session, nothing else:

> Read `docs/CC_BOOTSTRAP.md` and begin.

That's it. Everything below is written to Claude Code, not to you.

---

## Instructions — for Claude Code

You are Claude Code, picking up autonomous work on the Wasatch Intel × Tooele Land Intel project. This doc is your session kickoff protocol. Follow it end-to-end every time.

### 1. Orient

Read these files in order. Each governs how you work:

| File | Why you're reading it |
|---|---|
| `docs/PROJECT_STATE.md` | Source of truth — working style, autonomy level, verification rules, architecture decisions, PHASE_LOG of completed work |
| `docs/PROMPT_PLAYBOOK.md` | Phase briefs — the master description of each phase's deliverables |
| `docs/PROMPT_PLAYBOOK_ADDENDUM.md` | **Your state machine** — has `CURRENT STATE` at the top telling you which phase is next, plus CM_RE-heritage deltas to layer on top of the playbook briefs |
| `docs/CM_RE_INTEGRATION.md` | Scope guardrails, what to reuse vs skip from the vendored `vendor/cm_re/` reference tree, file-level porting map |

If any of these files is missing, stop and tell the user which.

### 2. Identify the current phase

Read `CURRENT STATE` at the top of `docs/PROMPT_PLAYBOOK_ADDENDUM.md`. That block is canonical. Cross-check against `PROJECT_STATE.md` PHASE_LOG — if they disagree, the addendum's `CURRENT STATE` wins (it's updated more often).

If `status: BLOCKED`, read the `blockers:` list and the blocker section below the relevant phase. Report the blocker to the user and stop — do not attempt the phase.

If `status: NOT_STARTED`, proceed to step 3.

If `status: IN_PROGRESS`, a previous session stalled mid-phase. Read the relevant phase's COMPLETION NOTES if present (partial), check the repo for uncommitted work or an in-progress branch, and decide: resume mid-phase, or restart it clean. Commit the reasoning in your eventual commit message.

### 3. Assemble the phase prompt

Your effective prompt for this phase is the concatenation of:

1. The **STANDARD OPENING** from `PROMPT_PLAYBOOK.md`
2. The phase brief for the current phase from `PROMPT_PLAYBOOK.md` (search for `# PHASE N —`)
3. The phase addendum from `PROMPT_PLAYBOOK_ADDENDUM.md` if one exists (search for `## PHASE N ADDENDUM —`). Not every phase has an addendum; Phases 7 and 8 are playbook-only.
4. For any CM_RE-heritage phase (1, 3, 4, 5, 6, 9, 10), also scan `CM_RE_INTEGRATION.md` sections referenced by the addendum.

You do not need the user's permission to start. The presence of this bootstrap is the permission.

### 4. Execute the phase

Follow the phase brief + addendum end-to-end. The `WORKING STYLE` section of `PROJECT_STATE.md` governs how — autonomy level, decision policy, verification requirements, when-to-stop-and-ask criteria. Default: pick sensible defaults, note in commit messages, keep moving.

Most phases touch both repos (`wasatch-intel` for frontend/docs, `tooele-land-intel` for Python/data). Both should be cloned locally. If only one is, clone the missing one from `github.com/camsrigby-hash/<name>` before starting.

### 5. Finish — the SELF-UPDATE PROTOCOL

This is the part that makes the next session possible. Before declaring done:

Open `docs/PROMPT_PLAYBOOK_ADDENDUM.md` and follow the `SELF-UPDATE PROTOCOL` section exactly. In short:

1. Rewrite `CURRENT STATE` to point to the next phase (status `NOT_STARTED`).
2. Append a `### PHASE N COMPLETION NOTES` block under the phase you just finished.
3. Add a PHASE_LOG entry in `PROJECT_STATE.md`.
4. Commit these doc updates in the **same commit** as your final code commit per affected repo. Commit message format: `Phase N complete — <one-line summary>`.
5. Push both repos.

### 6. Summarize and stop

Report to the user in this structure:

```
Phase N — <phase name> — COMPLETE

Built:
  - <bullet>
  - <bullet>

Key commits:
  - wasatch-intel:       <sha> — <message>
  - tooele-land-intel:   <sha> — <message>

Decisions made autonomously:
  - <bullet, if notable>

Deferred / flagged for human:
  - <bullet, if any>

Next up: Phase N+1 — <name>. Run the bootstrap prompt in a new session when ready.
```

Then stop. Do not start the next phase in the same session — each phase is its own session so you have fresh context and the user has checkpointing opportunities.

### 7. When to stop and ask (overrides 2-6)

Bypass autonomous mode and stop to ask the user when:

- A phase requires credentials / API keys / third-party service setup the user hasn't set up (Reddit OAuth in Phase 6, Cloudflare D1 in Phase 7, Resend email in Phase 7, etc.). Don't guess; ask.
- The phase brief + addendum have a genuine contradiction you can't reconcile.
- You hit an upstream service outage (UGRC down, PMN down, Anthropic API 5xx spree) and can't make meaningful progress.
- Scope in the phase brief would obviously exceed MVP constraints (e.g. the brief asks for rasterio when CM_RE_INTEGRATION.md §3 forbids it — something is wrong, don't guess).
- An existing file is about to be overwritten and git history suggests it was intentionally kept.

In all of the above: set `status: BLOCKED` per the protocol, write what you need, commit the doc update, push, and stop. Don't silently work around.

---

## END
