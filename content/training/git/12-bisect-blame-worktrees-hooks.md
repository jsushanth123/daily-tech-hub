---
slug: git-bisect-blame-worktrees-hooks
track: git
title: "Bisect, blame, worktrees, and hooks"
description: "Advanced tools: binary-search for bugs, see who changed a line, work on two branches at once, and automate checks."
level: advanced
order: 12
durationMinutes: 30
topics: [git]
lab: detective
objectives:
  - "Find the commit that introduced a bug with git bisect (manual and automated)"
  - "Use git blame (and log -L) for context"
  - "Use worktrees instead of stashing for parallel work"
  - "Add a pre-commit hook and know about shared hook tools"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Bisect"
    code: "git bisect start\ngit bisect bad\ngit bisect good v1.0.0\n# test… git bisect good | bad\ngit bisect reset"
  - label: "Automated bisect"
    code: "git bisect run ./run-tests.sh"
  - label: "Blame lines 10-20, ignore whitespace"
    code: "git blame -w -L 10,20 app.py"
  - label: "History of a function"
    code: "git log -L :calculate_total:billing.py"
  - label: "Second working folder"
    code: "git worktree add -b hotfix ../app-hotfix main\ngit worktree list\ngit worktree remove ../app-hotfix"
  - label: "Simple pre-commit hook"
    code: "#!/bin/sh\n# .git/hooks/pre-commit  (chmod +x)\nnpm test || exit 1"
quiz:
  - question: "There are 1,000 commits between good and bad. Roughly how many tests does bisect need?"
    options:
      - "1000"
      - "500"
      - "About 10"
      - "1"
    answer: 2
    explanation: "Binary search halves each time: log2(1000) ≈ 10."
  - question: "What is a worktree?"
    options:
      - "A diagram of branches"
      - "An extra working folder linked to the same repo, with a different branch checked out"
      - "A GitHub feature"
      - "A type of tag"
    answer: 1
  - question: "Why aren't hooks in .git/hooks shared when teammates clone?"
    options:
      - "They are, automatically"
      - ".git/ is not part of the repo content; use a tool (pre-commit, husky, lefthook) or core.hooksPath"
      - "Hooks are illegal"
      - "Only on Windows"
    answer: 1
---

# Bisect, blame, worktrees, hooks

## git bisect: binary search for the bad commit

"It worked in v1.0, it's broken now, and there are 200 commits in between." Bisect checks out the middle commit, you say good or bad, and it halves the range each time.

```bash
git bisect start
git bisect bad                 # current commit is broken
git bisect good v1.0.0         # this one worked
# Git checks out a middle commit → test it
git bisect good                # or: git bisect bad
# ...repeat ~log2(N) times...
# "a1b2c3d is the first bad commit"
git bisect reset               # go back to where you were
```

Automate it with any script that exits 0 for good and non-zero for bad:

```bash
git bisect run pytest tests/test_totals.py
```

## git blame: context for each line

```bash
git blame app.py
git blame -w -L 40,60 app.py           # ignore whitespace, only lines 40-60
git log -L :calculate_total:billing.py # evolution of one function
```

Use blame to find *the commit and its PR discussion*, then ask the author for context. It's for understanding, not blaming! Add big reformat commits to `.git-blame-ignore-revs` so they don't hide real authors.

## Worktrees: two branches checked out at once

Instead of stashing to fix an urgent bug:

```bash
git worktree add -b hotfix/crash ../app-hotfix main
cd ../app-hotfix      # separate folder, same repo, branch hotfix/crash
# fix, commit, push...
cd ../app
git worktree remove ../app-hotfix
```

A branch can be checked out in only one worktree at a time.

## Hooks: scripts Git runs for you

Hooks live in `.git/hooks/` (e.g. `pre-commit`, `commit-msg`, `pre-push`). Make the file executable:

```bash
#!/bin/sh
# .git/hooks/pre-commit
npm run lint || exit 1      # non-zero exit = commit blocked
```

`.git/` isn't committed, so teams share hooks with tools: **pre-commit** (Python), **husky** or **lefthook** (JS), or `git config core.hooksPath .githooks`. Hooks are a convenience: enforce the important rules in CI too, because `--no-verify` skips local hooks.

> The sandbox simulates bisect, blame, and worktrees. Hooks need a real machine: try the snippet above in a scratch repo.

## Exercises

1. Complete the detective lab.
2. In a real repo, write a `commit-msg` hook that rejects messages shorter than 10 characters.
