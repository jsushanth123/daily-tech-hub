---
slug: git-stash-cherry-pick-tags-reflog
track: git
title: "Stash, cherry-pick, tags, and reflog"
description: "Park unfinished work, copy one commit, mark releases, and recover 'lost' commits."
level: intermediate
order: 9
durationMinutes: 25
topics: [git]
lab: toolbox
objectives:
  - "Park and restore work-in-progress with stash"
  - "Copy a specific commit to another branch with cherry-pick"
  - "Create lightweight and annotated tags and push them"
  - "Recover from mistakes with reflog"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Park / restore WIP"
    code: "git stash push -m \"half-done search\"\ngit stash list\ngit stash pop"
  - label: "Include untracked files"
    code: "git stash -u"
  - label: "Copy one commit here"
    code: "git cherry-pick <hash>"
  - label: "Release tag"
    code: "git tag -a v1.2.0 -m \"Release 1.2.0\"\ngit push origin v1.2.0"
  - label: "Undo a bad reset"
    code: "git reflog\ngit reset --hard HEAD@{1}"
quiz:
  - question: "You're mid-change and must urgently switch branches. Quickest safe option?"
    options:
      - "git reset --hard"
      - "git stash, switch, later git stash pop"
      - "Delete the files"
      - "git push --force"
    answer: 1
  - question: "You did git reset --hard and 'lost' a commit. Where can you find it?"
    options:
      - "Nowhere; it's gone"
      - "git reflog"
      - "git stash list"
      - "git tag"
    answer: 1
  - question: "Annotated tags (-a) differ from lightweight tags because they…"
    options:
      - "Are bigger files"
      - "Store author, date, and a message: recommended for releases"
      - "Can't be pushed"
      - "Move with each commit"
    answer: 1
---

# Stash, cherry-pick, tags, reflog

## Stash: a pocket for half-finished work

```bash
git stash                     # save tracked changes, clean the working tree
git stash push -m "search WIP"
git stash -u                  # include untracked files
git stash list                # stash@{0}: On main: search WIP
git stash show -p stash@{0}   # what's inside
git stash pop                 # re-apply and remove from the list
git stash apply stash@{1}     # re-apply but keep it
git stash drop stash@{0}
```

Stashes are local only and easy to forget. For anything longer than an hour, prefer a WIP commit on a branch.

## Cherry-pick: copy one commit

```bash
git switch release/1.x
git cherry-pick a1b2c3d       # apply that commit's change here as a new commit
git cherry-pick -x a1b2c3d    # adds "(cherry picked from …)" to the message
```

Typical uses: back-porting a fix to a release branch, rescuing a commit made on the wrong branch.

## Tags: names for important commits

```bash
git tag v1.0.0                          # lightweight
git tag -a v1.0.0 -m "First release"    # annotated (preferred)
git tag                                 # list
git push origin v1.0.0                  # tags are NOT pushed by default
git push --tags
```

Use **semantic versioning**: `MAJOR.MINOR.PATCH` (breaking change, new feature, bug fix).

## Reflog: Git's undo history

Every time `HEAD` moves (commit, reset, checkout, rebase), Git writes it in the **reflog** (kept ~90 days, local only).

```bash
git reflog
# 3f2a1b0 HEAD@{0}: reset: moving to HEAD~2
# 9c8d7e6 HEAD@{1}: commit: Docs wip      <- the "lost" commit
git reset --hard HEAD@{1}                 # or: git switch -c rescue 9c8d7e6
```

If you committed it, you can almost always get it back.

## Exercises

1. Complete the lab, including the reflog rescue.
2. Commit something on `main` by accident, then move it to a new branch with `git switch -c` + `git reset` (or cherry-pick).
