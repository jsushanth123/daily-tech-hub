---
slug: git-rebase
track: git
title: "Rebase and interactive rebase"
description: "Replay your work on top of main for a clean history, and tidy commits with squash, fixup, reword, and reorder."
level: intermediate
order: 7
durationMinutes: 30
topics: [git]
lab: rebase
objectives:
  - "Explain merge vs rebase and when to use each"
  - "Rebase a feature branch onto main and resolve rebase conflicts"
  - "Squash, fixup, reword, drop, and reorder commits with rebase -i"
  - "Follow the golden rule: never rebase shared history"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Update my branch with latest main"
    code: "git fetch\ngit rebase origin/main"
  - label: "Tidy my last 3 commits"
    code: "git rebase -i HEAD~3"
  - label: "During a conflict"
    code: "git add <file>\ngit rebase --continue   # or --skip / --abort"
  - label: "Auto-squash fixups"
    code: "git commit --fixup <hash>\ngit rebase -i --autosquash main"
  - label: "Push a rebased branch safely"
    code: "git push --force-with-lease"
quiz:
  - question: "The golden rule of rebasing is…"
    options:
      - "Always rebase main onto your feature"
      - "Don't rebase commits that other people already have (shared branches)"
      - "Rebase only on Mondays"
      - "Never resolve conflicts during rebase"
    answer: 1
  - question: "In an interactive rebase, 'fixup' does what?"
    options:
      - "Deletes the commit"
      - "Melds the commit into the previous one and DISCARDS its message"
      - "Keeps both messages"
      - "Edits the commit message only"
    answer: 1
  - question: "Why use --force-with-lease instead of --force?"
    options:
      - "It's faster"
      - "It refuses to overwrite the remote if someone pushed commits you haven't seen"
      - "It deletes the branch"
      - "It skips CI"
    answer: 1
---

# Rebase and interactive rebase

## Merge vs rebase

Both bring changes from `main` into your branch. They tell the story differently:

- **Merge** keeps history exactly as it happened and adds a merge commit. Safe, but busy graphs.
- **Rebase** *replays* your commits one by one on top of `main`, as if you'd started today. History becomes a straight line. Your commits get **new hashes**.

```bash
git switch feature
git rebase main          # replay feature's commits on top of main
```

> **Golden rule:** rebase only commits that are *yours and unshared* (or your own PR branch). Never rebase `main`, `develop`, or anything teammates build on.

## Conflicts during rebase

Git applies your commits one at a time, so you may resolve a conflict per commit:

```bash
# edit the file, remove markers
git add file.txt
git rebase --continue    # next commit
git rebase --skip        # drop this commit
git rebase --abort       # back to how it was before
```

Note: during a rebase "ours" = the branch you're rebasing **onto**, "theirs" = your commit being replayed.

## Interactive rebase: edit history before you share it

```bash
git rebase -i HEAD~3
```

Your editor opens a plan (oldest first):

```text
pick a1b2c3d Add feature
pick d4e5f6a wip
pick 0718293 fix typo
```

Change the words (and the order of lines) and save:

| Command | Effect |
| --- | --- |
| `pick` | keep commit as is |
| `reword` | keep changes, edit message |
| `squash` | meld into previous commit, combine messages |
| `fixup` | meld into previous commit, drop this message |
| `drop` | delete the commit |
| *(move lines)* | reorder commits |

> **Sandbox note:** the simulator has no text editor. After `git rebase -i HEAD~3` you type the plan lines one by one (`pick <hash>`, `squash <hash>` …) and then `save`.

### Pro tip: fixup commits

```bash
git commit --fixup a1b2c3d        # "fixup! Add feature"
git rebase -i --autosquash main   # automatically placed + marked fixup
```

## After rebasing a pushed branch

Your local branch and the remote now disagree, so a normal push is rejected. Use:

```bash
git push --force-with-lease
```

## Exercises

1. In the lab, squash a messy branch into one clean commit and reorder two commits.
2. Decide for each: merge or rebase? (a) updating your 2-day-old PR branch; (b) integrating `release/2.0` into `main`; (c) a branch two teammates push to.
