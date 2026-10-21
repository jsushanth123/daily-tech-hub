---
slug: git-staging-commits
track: git
title: "Staging and commits"
description: "git add, git commit, and how to write commits your teammates will thank you for."
level: beginner
order: 2
durationMinutes: 20
topics: [git]
lab: staging
objectives:
  - "Move changes between working tree, staging area, and history"
  - "Stage some files but not others"
  - "Write clear, small, focused commit messages"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Stage a file / everything"
    code: "git add app.py\ngit add ."
  - label: "Stage parts of a file (interactive)"
    code: "git add -p"
  - label: "Commit"
    code: "git commit -m \"Add login form validation\""
  - label: "Stage tracked changes + commit"
    code: "git commit -am \"Fix typo in footer\""
quiz:
  - question: "You changed app.py and notes.txt but only want app.py in the next commit. What do you run?"
    options:
      - "git commit -a"
      - "git add app.py, then git commit -m \"...\""
      - "git add ., then git commit"
      - "git push app.py"
    answer: 1
  - question: "Which is the best commit message?"
    options:
      - "stuff"
      - "Fix rounding error in invoice totals"
      - "changes 2"
      - "asdf"
    answer: 1
    explanation: "Imperative mood, says what and (in the body) why. Future you will search for it."
  - question: "Does git commit -a include brand-new (untracked) files?"
    options:
      - "Yes, all files"
      - "No, only files Git already tracks"
      - "Only .txt files"
      - "Only if they are staged"
    answer: 1
---

# Staging and commits

A commit is a **snapshot plus a note**. Staging lets you decide exactly what goes into that snapshot.

```bash
echo "print('hello')" > app.py
git status            # app.py is "untracked"
git add app.py        # now "staged" (ready to commit)
git commit -m "Add hello script"
git status            # "nothing to commit, working tree clean"
```

## Why stage at all?

Imagine you fixed a bug **and** reformatted another file. Two separate ideas deserve two commits so reviewers (and `git revert` later) can deal with them separately:

```bash
git add bugfix.py
git commit -m "Fix crash when cart is empty"
git add styles.css
git commit -m "Reformat styles (no behaviour change)"
```

Stage only part of a file with `git add -p`. Git shows each chunk and asks `y/n`.

## Writing good messages

```text
Fix rounding error in invoice totals          <- short summary, imperative, ~50 chars

Totals were rounded per line instead of per    <- body: WHY, not just what
invoice, producing 1-cent mismatches.
Closes #142
```

Rules of thumb:

- **One idea per commit.** If your message needs "and", consider two commits.
- **Imperative mood:** "Add", "Fix", "Remove" (like finishing the sentence "This commit will…").
- Many teams use **Conventional Commits**: `feat: …`, `fix: …`, `docs: …`, `refactor: …`.
- Never commit secrets (passwords, API keys). See the .gitignore lesson.

## Handy shortcuts

```bash
git commit -am "Fix typo"     # stage all TRACKED changes + commit (skips new files)
git commit                    # opens your editor for a longer message
git commit --allow-empty -m "Trigger CI"
```

## Exercises

1. Make three changes in two files and turn them into two focused commits.
2. Rewrite these messages well: "fix", "updates", "WIP final final".
