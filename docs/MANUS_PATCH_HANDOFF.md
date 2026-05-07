# Manus Patch Handoff Procedure

When Manus delivers work as `.patch` files instead of pushing a branch directly, follow this procedure. Skipping it causes CC to see an empty branch and rebuild from scratch — duplicate work, orphaned Manus commits, schema-drift risk.

## Why patches happen

Manus's OAuth token sometimes lacks the scopes needed to push to your repo (`workflow` scope for `.github/workflows/*` files, push access to private repos, etc.). When that happens Manus commits locally inside its sandbox, generates `.patch` files via `git format-patch`, and hands those off in a zip.

The commit hashes Manus reports in its summary (e.g., "tooele-land-intel committed at 7f930ad on phase-13b-6b-census-acs-join") **only exist in the Manus sandbox**. They are NOT on your local machine and NOT on origin. Treat those hashes as informational, not as something CC can `git checkout`.

## The first thing to do with a Manus patch handoff

Always tell CC explicitly:

```
Apply the Manus patches BEFORE doing anything else.

1. Locate the patch files: typically /mnt/user-data/uploads/<phase>_handoff.zip OR
  ~/Downloads/<phase>_handoff.zip on the user's machine.
2. Extract if needed.
3. For each repo Manus modified:
  cd <repo>
  git checkout -b <branch-name-from-manus-summary> (e.g., phase-13b-6b-census-acs-join)
  git am /path/to/patches/<repo>_<phase>.patch
  git log --oneline -5 (verify Manus's commits are present)
4. THEN proceed with verification, workflow file commits, and PR creation.

Do NOT rebuild Manus's code from scratch. If git am fails, stop and report the
error — do not silently fall back to reimplementation.
```

## Default ask to Manus going forward

At the top of every Manus phase prompt, include:

```
Push the working branch directly to origin. Do not produce patch files.
If your token lacks scope to push, stop and report — do not fall back to patches.
The user can grant scope if needed; this is preferable to the patch-handoff overhead.
```

This is a hard preference because the patch handoff path has cost ~30 min of CC compute on Phase 13b-6b alone (CC rebuilt the spatial join from scratch instead of using Manus's working code).

## When patches are unavoidable

Some scopes Manus genuinely cannot acquire (the GitHub OAuth App used for MCP doesn't currently support `workflow` scope at all). For those files specifically:

- Manus authors the file content
- Manus includes the full file content inline in the PR description (or in the handoff zip)
- CC writes the file to `.github/workflows/<name>.yml` and commits it on the existing branch

This is the pattern that worked for 13b-2, 13b-6a, and was documented in their runbooks. The trap is when Manus uses `git format-patch` for OTHER files in the same handoff — CC then has both inline-workflow content AND a patch file, and the prompt must call out both.

## Cleanup after a successful patch apply

If CC rebuilt code instead of applying the Manus patch (the failure mode this doc exists to prevent), there will be orphaned Manus commits referenced only in chat logs. Once the rebuilt branch is verified working and merged:

```
# In each affected repo, delete any local branches that match Manus's branch name
# but contain commits no one applied
git branch -D <manus-branch-name> (if it exists locally without your work)
```

Manus's sandbox commits will eventually expire on Manus's side. No further action required.

## Symptom checklist — am I in this situation?

You're in patch-handoff land if any of these are true:

- Manus's final message contains "patch" or "handoff" or "git am"
- Manus's final message lists commit hashes but says PR was not opened
- The handoff zip contains a `patches/` directory
- Manus says "GitHub authentication was not available"
- Manus says "OAuth token does not have workflow scope" (workflow files only — non-workflow files in this case usually got pushed normally; check the PR)

If any of those apply, the explicit `git am` instruction in the CC prompt is mandatory.
