---
slug: git-forking-workflow
track: git
title: "Strategy: forking workflow"
description: "Contribute without write access: fork, clone, sync from upstream, and open cross-repo PRs."
level: intermediate
order: 19
durationMinutes: 15
topics: [git]
lab: forking
objectives:
  - "Set up origin (your fork) and upstream (the original)"
  - "Keep your fork in sync"
  - "Open a pull request from a fork"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Set up"
    code: "git clone https://github.com/you/app.git\ncd app\ngit remote add upstream https://github.com/bigproject/app.git"
  - label: "Sync"
    code: "git fetch upstream\ngit switch main\ngit merge upstream/main   # or rebase\ngit push origin main"
  - label: "Contribute"
    code: "git switch -c fix/typo\ngit commit -am \"Fix README typo\"\ngit push -u origin fix/typo\ngh pr create --repo bigproject/app"
quiz:
  - question: "In the forking workflow, 'origin' usually points to…"
    options:
      - "The original project"
      - "Your fork"
      - "Your teammate's laptop"
      - "Nothing"
    answer: 1
  - question: "How do you get new commits from the original project into your fork?"
    options:
      - "git push upstream"
      - "git fetch upstream, merge/rebase upstream/main, push to origin"
      - "Delete and re-fork every time"
      - "git clone again"
    answer: 1
---

# Forking workflow

{{diagram:forking}}

Used when you **can't push** to the main repository: open source, or internal repos where only maintainers have write access.

- **upstream** = the original project (read-only for you)
- **origin** = your fork (your copy on GitHub, you can push)

## Steps

```bash
# 1. Click "Fork" on GitHub, then:
git clone https://github.com/you/app.git
cd app
git remote add upstream https://github.com/bigproject/app.git
git remote -v

# 2. Sync before starting work
git fetch upstream
git switch main
git merge upstream/main          # or: git pull upstream main
git push origin main

# 3. Branch, commit, push to YOUR fork
git switch -c fix/typo
git commit -am "Fix README typo"
git push -u origin fix/typo

# 4. Open a PR: you/app:fix/typo → bigproject/app:main
gh pr create --repo bigproject/app --fill
```

## When to use it

- Open-source projects with outside contributors.
- Large orgs restricting write access to a core team.
- Anyone experimenting with a project they don't own.

## Pros and cons

| 👍 Pros | 👎 Cons |
| --- | --- |
| Maintainers keep full control | Extra remote to manage; forks go stale |
| Contributors need no permissions | CI secrets aren't available to fork PRs (by design) |
| Safe for untrusted contributions | Slower feedback than pushing to a shared repo |

Upstream projects still use one of the other strategies (often GitHub Flow) internally.
