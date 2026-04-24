# Mission: Make CI green on branch `fix/ci-green`

Repo: `E-Code-AI/e-code` (remote `origin` is already configured, gh auth ready).
Branch base: `fix/ci-green` off `origin/main` (commit `e846dee9`).

## Failing checks on main (confirmed red before you started)

Priority order — fix these one by one, commit each fix, push, watch CI:

1. **Tenant Isolation Security Suite** — `No test files found` because `tests/tenant-isolation.test.ts` was deleted. Either restore it from git history (last present in commit `286e8b46`, meaningful version in `48ce9268`) OR update `.github/workflows/tenant-isolation.yml` (or whatever workflow file owns this) to point at existing tests. Prefer restoring the test file, fix any drift, and make it pass against current schema.

2. **Quality & Security (CI/CD Production Pipeline)** — ESLint fails with hundreds of `@ts-nocheck` errors (`@typescript-eslint/ban-ts-comment`). There are ~306 files using `@ts-nocheck`. Strategy:
   - Add a focused ESLint override to allow `@ts-nocheck` with description requirement OR change the rule to `warn`.
   - Simplest minimal-risk fix: in `eslint.config.mjs`, relax `@typescript-eslint/ban-ts-comment` for existing files (either allow `ts-nocheck` with description, or set rule to 'warn'). Discuss briefly in the commit message.
   - Do NOT mass-remove `@ts-nocheck` from 306 files — that would break TS compilation. Only remove from files where TS actually passes.

3. **Unit Tests (CI/CD Production Pipeline)** — check the workflow logs to see which tests fail. Fix or skip broken tests with explicit `.skip` annotations and TODO comments.

4. **Verify Codex PRs** — check what this workflow does (likely a commit-message or diff linter). Adjust as needed so it passes on a normal merge.

## Operating rules

- Work **only** on branch `fix/ci-green`. Never touch `main`.
- Commit in small logical chunks with clear messages: `ci(eslint): relax ts-nocheck for legacy files`, `test(tenant-isolation): restore deleted test suite`, etc.
- Push after each logical commit: `git push -u origin fix/ci-green` (first time), then `git push`.
- After pushing, trigger CI by opening a PR: `gh pr create --base main --head fix/ci-green --title "ci: make main green" --body "Fixes failing workflows..."`. If PR already exists, skip creation.
- After each push, wait ~2min, then `gh pr checks <pr-number> --watch --fail-fast=false` or use `gh run list --branch fix/ci-green --limit 5`.
- Iterate until ALL of the 4 failing workflows above go green. Other checks that were passing must remain green.
- If a workflow is irreparable without domain knowledge (e.g. needs a real database that GitHub Actions doesn't have), document the reason and skip that specific job via workflow condition rather than leaving CI red — note it clearly in the PR body.
- Do NOT merge the PR. When you are done, leave it open and ready for review.

## Done criteria

- All of: Quality & Security, Tenant Isolation Security Suite, Unit Tests, Verify Codex PRs → GREEN on the PR branch.
- Existing-green checks (Build & Type-check, CodeQL) still green.
- PR is open, branch pushed, description explains every change.
- Run this to notify when completely finished:
  ```
  openclaw system event --text "Done: CI green on fix/ci-green, PR #<N> ready" --mode now
  ```
- If you hit a wall, also notify:
  ```
  openclaw system event --text "Blocked on CI fix: <reason>" --mode now
  ```
