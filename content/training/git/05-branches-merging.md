---
slug: git-branches-merging
track: git
title: "Branches and merging"
description: "Create, switch, and merge branches. Understand fast-forward vs 3-way merges."
level: beginner
order: 5
durationMinutes: 25
topics: [git]
lab: branches
objectives:
  - "Create and switch branches with git switch (and the older git checkout)"
  - "Tell a fast-forward merge from a 3-way merge"
  - "Delete branches after merging"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "List / create / switch"
    code: "git branch\ngit switch -c feature/login\ngit switch main"
  - label: "Old-style equivalent"
    code: "git checkout -b feature/login"
  - label: "Merge into current branch"
    code: "git switch main\ngit merge feature/login"
  - label: "Always create a merge commit"
    code: "git merge --no-ff feature/login"
  - label: "Delete merged branch"
    code: "git branch -d feature/login"
quiz:
  - question: "main has no new commits since you branched. git merge feature on main will…"
    options:
      - "Create a merge commit"
      - "Fast-forward: just move main's label to feature's tip"
      - "Fail with a conflict"
      - "Delete feature"
    answer: 1
  - question: "What is a branch, technically?"
    options:
      - "A full copy of all files"
      - "A lightweight movable label pointing at a commit"
      - "A separate repository"
      - "A folder on GitHub"
    answer: 1
  - question: "When does Git create a 3-way merge commit?"
    options:
      - "When both branches have new commits since they split"
      - "Every time you merge"
      - "Only on Fridays"
      - "When you use git switch"
    answer: 0
---

# Branches and merging

A **branch is just a label that points to a commit.** Making one is instant and free. When you commit, the label of the branch you're on moves forward. `HEAD` tells Git which branch you're on.

```bash
git branch                  # list (the * marks where you are)
git switch -c feature/login # create + switch
git switch main             # switch back
git switch -                # back to the previous branch
```

`git checkout -b name` / `git checkout name` are the older commands that do the same thing; you'll see them in many tutorials.

## Merging

You merge **into** the branch you're on:

```bash
git switch main
git merge feature/login
```

{{diagram:ff-vs-3way}}

- **Fast-forward:** main didn't move since you branched, so Git simply slides `main` forward. No new commit.
- **3-way merge:** both branches moved. Git looks at three snapshots (the common ancestor, your tip, their tip) and creates a **merge commit** with two parents.
- `--no-ff` forces a merge commit even when a fast-forward is possible. Some teams like this because the feature stays visible as a group.
- `--squash` squeezes the whole branch into one set of staged changes for a single commit.

## Clean up

```bash
git branch -d feature/login   # safe: refuses if not merged
git branch -D experiment      # force delete
```

## Naming branches

Teams usually use prefixes: `feature/…`, `fix/…`, `chore/…`, `release/1.4`, `hotfix/…`, often with a ticket number: `feature/PAY-123-refunds`.

## Exercises

1. In the lab, produce one fast-forward and one 3-way merge and compare them in the graph.
2. Why can't you `git branch -d` a branch that isn't merged? What would you lose?
