---
slug: git-undoing
track: git
title: "Undoing things: restore, reset, revert, amend"
description: "The safe way and the dangerous way to undo every kind of mistake."
level: beginner
order: 4
durationMinutes: 25
topics: [git]
lab: undo
objectives:
  - "Discard or unstage file changes with git restore"
  - "Know exactly what reset --soft, --mixed and --hard do"
  - "Use revert (not reset) for commits already shared"
  - "Fix the last commit with --amend"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Discard edits to a file"
    code: "git restore app.py"
  - label: "Unstage (keep edits)"
    code: "git restore --staged app.py"
  - label: "Undo last commit, keep changes staged"
    code: "git reset --soft HEAD~1"
  - label: "Undo last commit, keep changes unstaged"
    code: "git reset HEAD~1"
  - label: "Throw everything away (careful)"
    code: "git reset --hard HEAD"
  - label: "Safe undo for shared commits"
    code: "git revert <hash>"
  - label: "Fix last commit message / add forgotten file"
    code: "git add forgotten.txt\ngit commit --amend -m \"Better message\""
quiz:
  - question: "A bad commit is already pushed and teammates pulled it. Safest undo?"
    options:
      - "git reset --hard HEAD~1 then git push --force"
      - "git revert <hash>, then push"
      - "Delete the repo"
      - "git commit --amend"
    answer: 1
    explanation: "revert adds a new 'opposite' commit, so nobody's history is rewritten."
  - question: "Which reset keeps your changes STAGED?"
    options:
      - "--hard"
      - "--mixed"
      - "--soft"
      - "None of them"
    answer: 2
  - question: "What does git commit --amend actually do?"
    options:
      - "Edits the old commit in place"
      - "Replaces the last commit with a NEW commit (new hash)"
      - "Adds a second message"
      - "Pushes the commit"
    answer: 1
---

# Undoing things

The golden rule: **if a commit is only on your machine you may rewrite it; if others have it, add a new commit (revert) instead.**

## Pick the right tool

| Situation | Command | Rewrites history? |
| --- | --- | --- |
| I messed up a file and want the last saved version | `git restore file` | No |
| I staged something by mistake | `git restore --staged file` | No |
| Typo in my last commit message / forgot a file | `git commit --amend` | Yes (last commit only) |
| Undo my last local commit(s) | `git reset` (soft/mixed/hard) | Yes |
| Undo a commit that's already pushed/shared | `git revert <hash>` | No (adds a commit) |
| I reset too far and lost commits! | `git reflog`, then `git reset --hard HEAD@{1}` | Recovery |

## git reset: three strengths

`git reset <commit>` moves your current branch label back to `<commit>`. The flag decides what happens to the changes from the commits you "removed":

```text
             branch moves?   staging area reset?   working files reset?
--soft            yes               no                    no        (changes stay staged)
--mixed (default) yes               yes                   no        (changes stay as edits)
--hard            yes               yes                   YES       (changes are gone*)
```

\* still recoverable for a while via `git reflog` if they were committed.

```bash
git reset --soft HEAD~1   # "un-commit", keep everything staged: recommit differently
git reset HEAD~1          # "un-commit" and unstage
git reset --hard HEAD     # discard all uncommitted changes (careful!)
```

## git revert: undo by adding

```bash
git revert a1b2c3d          # creates "Revert '...'" commit
git revert -m 1 <merge>     # revert a merge commit (keep parent #1 = main)
```

## git commit --amend

```bash
git add forgotten-test.py
git commit --amend --no-edit       # add to last commit, keep message
git commit --amend -m "Fix login redirect"
```

Amend creates a **new** commit (new hash). If you already pushed, you'd need `git push --force-with-lease`, so only amend unpushed work or your own branch.

## Exercises

1. In the lab, practise every row of the table above.
2. Explain to a teammate in one sentence why `reset --hard` + force-push on `main` is dangerous.
