---
slug: git-github-flow
track: git
title: "Strategy: GitHub Flow"
description: "One main branch that's always deployable, short feature branches, and pull requests."
level: intermediate
order: 14
durationMinutes: 20
topics: [git]
lab: github-flow
objectives:
  - "Run GitHub Flow end to end"
  - "Keep a PR branch current with rebase + force-with-lease"
  - "Know when GitHub Flow is (and isn't) a good fit"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "The whole flow"
    code: "git switch main && git pull\ngit switch -c feature/dark-mode\ngit commit -am \"Add dark mode\"\ngit push -u origin feature/dark-mode\n# open PR → review → CI green → merge → auto-deploy\ngit switch main && git pull && git branch -d feature/dark-mode"
quiz:
  - question: "In GitHub Flow, what must always be true about main?"
    options:
      - "It's only updated monthly"
      - "It's always deployable"
      - "Nobody may read it"
      - "It contains only merge commits"
    answer: 1
  - question: "A weakness of GitHub Flow is…"
    options:
      - "Too many long-lived branches"
      - "No built-in place to maintain multiple released versions"
      - "It forbids pull requests"
      - "It requires a develop branch"
    answer: 1
---

# GitHub Flow

{{diagram:github-flow}}

**The rules:** `main` is always deployable. To change anything: branch from `main` → commit → open a PR → discuss and review → CI passes → merge → deploy → delete the branch.

## When to use it

- Web apps / services that deploy continuously.
- Small to medium teams, one production version.
- You have decent automated tests and can roll back quickly.

## Pros and cons

| 👍 Pros | 👎 Cons |
| --- | --- |
| Simple: one long-lived branch | No natural place for multiple supported versions |
| Fast feedback, small PRs | Relies on strong CI and quick rollback |
| Works naturally with GitHub/GitLab PR tools | Long-running features need feature flags or get big |

## Team scenario (play it in the lab below)

1. **You** pull `main` and create `feature/dark-mode`.
2. You commit and push, then open PR #42.
3. While you wait for review, **Mia** merges a login fix to `main`.
4. You update your branch: `git fetch && git rebase origin/main && git push --force-with-lease`. The PR now has the latest main and CI re-runs.
5. Approved: **squash and merge**. CI deploys `main`.
6. Delete the branch locally and on the remote.

```bash
git switch main && git pull
git switch -c feature/dark-mode
git commit -am "Add dark mode"
git push -u origin feature/dark-mode
git fetch && git rebase origin/main
git push --force-with-lease
# merge via the PR button (squash)
git switch main && git pull
git branch -D feature/dark-mode    # -D: squash merges aren't ancestors
git push origin --delete feature/dark-mode
```
