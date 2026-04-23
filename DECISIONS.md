# google-workspace-mcp — Decisions Log

This file captures *why*, not *what*. Read before opening a PR.
Append new entries at the TOP. Keep entries ≤15 lines.

## 2026-04-23 — docs: README polish — badges, install snippet, example output
**Context**: README lacked install instructions, examples, or badges; repo looked abandoned from the outside. (commit 8106bcf)
**Decision**: Polished README with badges, install snippet, example output.
**Why this over alternatives**: Public repos are judged by their cover; professional docs are a cheap signal.
**Consequences**: Future README edits should match the tone + structure. Don't degrade it.
---

## 2026-04-23 — security: restrict attachment savePath and sanitize auth errors
**Context**: Unspecified external risk or critic finding (see PR and git log for details). (commit b2d18ee)
**Decision**: Applied the security fix described in the PR title.
**Why this over alternatives**: Defense in depth — the alternative (doing nothing / accepting risk) was not viable once the finding surfaced.
**Consequences**: Any caller passing previously-accepted unsafe input will now get an error. Callers must update to valid inputs.
---

## 2026-04-23 — ci: add smoke CI workflow
**Context**: Repo had no CI before this commit. Every push was merged without automated verification. (commit 1c65afa)
**Decision**: Added GitHub Actions workflow + unit tests extracted into lib/. Enforced via npm test.
**Why this over alternatives**: Manual review alone didn't catch regressions; Tier-1 repos get full CI, Tier-2 smoke-only.
**Consequences**: All future PRs run on Node 20+22 matrix. Breaking changes to shared test harness block merges.
---

## 2026-04-23 — Fix send_email/draft_email to actually attach files
**Context**: See commit b87591e. (commit b87591e)
**Decision**: Fix send_email/draft_email to actually attach files
**Why this over alternatives**: Addressed at the time; see commit body for detail.
**Consequences**: Verify in DECISIONS before modifying this area.
---

## 2026-04-23 — Remove 5 tools requiring unavailable OAuth scopes and improve descriptio
**Context**: See commit 3534fa1. (commit 3534fa1)
**Decision**: Remove 5 tools requiring unavailable OAuth scopes and improve descriptio
**Why this over alternatives**: Addressed at the time; see commit body for detail.
**Consequences**: Verify in DECISIONS before modifying this area.
---

