---
slug: git-history
track: git
title: "Reading history: log, diff, show"
description: "Find out what changed, when, and by whom: git log, git diff, and git show."
level: beginner
order: 3
durationMinutes: 15
topics: [git]
lab: history
objectives:
  - "Browse history compactly with log --oneline --graph"
  - "Compare working tree, staging area, and commits with diff"
  - "Inspect a single commit with show"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Pretty history"
    code: "git log --oneline --graph --all"
  - label: "Unstaged vs staged changes"
    code: "git diff\ngit diff --staged"
  - label: "What did a commit change?"
    code: "git show <hash>"
  - label: "Commits on feature not on main"
    code: "git log --oneline main..feature"
quiz:
  - question: "You staged a file. Which command shows what you are about to commit?"
    options:
      - "git diff"
      - "git diff --staged"
      - "git log"
      - "git show"
    answer: 1
  - question: "What does HEAD~2 mean?"
    options:
      - "Two branches ago"
      - "The commit two steps back from the current one (grandparent)"
      - "The second file"
      - "Two commits ahead"
    answer: 1
---

# Reading history: log, diff, show

## git log: the story so far

```bash
git log                       # full details
git log --oneline             # one line per commit
git log --oneline --graph --all   # draw branches as a graph
git log -n 5                  # last 5
git log --author="Sam"        # by person
git log -- path/to/file.py    # commits touching one file
git log main..feature         # commits on feature that main doesn't have
```

Every commit has a **hash** like `a1b2c3d` (a unique ID). You usually only need the first 7 characters.

## Pointing at commits

| Name | Means |
| --- | --- |
| `HEAD` | "Where I am now": the commit you have checked out |
| `HEAD~1` / `HEAD^` | its parent (one back) |
| `HEAD~3` | three commits back |
| `main`, `v1.0.0` | a branch or tag name |
| `a1b2c3d` | a commit hash |

## git diff: what changed?

```bash
git diff              # working tree vs staging area (unstaged edits)
git diff --staged     # staging area vs last commit (what will be committed)
git diff main feature # between two branches
git diff HEAD~1       # since the previous commit
```

Lines starting with `-` were removed, `+` were added.

## git show: one commit up close

```bash
git show              # latest commit: message + diff
git show a1b2c3d
git show v1.0.0       # works with tags too
```

## Exercises

1. Run `git log --oneline --graph --all` in a real project and find the latest merge.
2. Edit a file, run `git diff`; stage it, run `git diff` again (empty!) and then `git diff --staged`.
