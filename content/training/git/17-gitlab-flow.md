---
slug: git-gitlab-flow
track: git
title: "Strategy: GitLab Flow (environment branches)"
description: "Promote code from main to staging to production by merging downstream; fix upstream first."
level: intermediate
order: 17
durationMinutes: 20
topics: [git]
lab: gitlab-flow
objectives:
  - "Model environments as branches and promote by merging"
  - "Apply the 'upstream first' rule for fixes"
  - "Compare GitLab Flow with GitHub Flow"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Promote main → staging → production"
    code: "git switch staging && git merge main && git push\ngit switch production && git merge staging && git push"
  - label: "Fix upstream first"
    code: "git switch main\ngit commit -am \"Fix invoice rounding\"\n# then promote again"
quiz:
  - question: "QA finds a bug on staging. In GitLab Flow, where do you fix it first?"
    options:
      - "Directly on production"
      - "On staging only"
      - "On main (upstream), then promote it down to staging and production"
      - "On a fork"
    answer: 2
  - question: "In GitLab Flow, code moves between environment branches by…"
    options:
      - "Copy-pasting files"
      - "Merging downstream (main → staging → production)"
      - "Rebasing production onto main"
      - "Deleting branches"
    answer: 1
---

# GitLab Flow

{{diagram:gitlab-flow}}

GitHub Flow + **environment branches**. Feature branches merge into `main` (via merge requests). Then `main` is merged into `staging`, and `staging` into `production`. Each environment's branch shows exactly what is deployed there.

There's also a **release-branch variant** (`2-3-stable`, `2-4-stable`) for versioned software, similar to the release-branching lesson.

## Rules

- Code flows **downstream only**: `main → staging → production`.
- **Upstream first:** fix bugs on `main`, then promote, never directly on `production` (or the fix gets lost next promotion).
- Deploys are automated from each branch (CI deploys `staging` branch to the staging environment, and so on).

## When to use it

- You have staging/pre-prod/prod and want an auditable record of what's where.
- Deploys need manual approval or happen at specific times (e.g. app-store review, regulated industries).
- GitLab users (it fits GitLab environments and protected branches nicely), but it works anywhere.

## Pros and cons

| 👍 Pros | 👎 Cons |
| --- | --- |
| Clear "what's deployed where" | More branches than GitHub Flow |
| Natural approval gates per environment | Environments can drift if someone skips promotion |
| Simpler than Git Flow | Hotfix pressure tempts people to patch production directly |

## Team scenario (lab below)

1. Merge `feature/invoice` into `main`.
2. Promote: `staging ← main`. QA tests it.
3. Bug found → fix on `main` first.
4. Promote again `staging ← main`, then `production ← staging`.
