---
slug: git-remotes
track: git
title: "Remotes: clone, fetch, pull, push"
description: "Work with GitHub/GitLab: clone, track upstream branches, fetch vs pull, pull --rebase, and fixing rejected pushes."
level: beginner
order: 8
durationMinutes: 25
topics: [git]
lab: remotes
objectives:
  - "Clone a repository and inspect its remotes"
  - "Know the difference between fetch and pull"
  - "Push a new branch with upstream tracking (-u)"
  - "Fix a rejected push with pull --rebase"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Get a copy"
    code: "git clone https://github.com/org/repo.git"
  - label: "Inspect"
    code: "git remote -v\ngit branch -vv"
  - label: "Download without changing my work"
    code: "git fetch"
  - label: "Download + integrate"
    code: "git pull            # fetch + merge\ngit pull --rebase   # fetch + rebase"
  - label: "Publish a new branch"
    code: "git push -u origin feature/search"
  - label: "Prefer rebase on pull (per user)"
    code: "git config --global pull.rebase true"
quiz:
  - question: "What's the difference between git fetch and git pull?"
    options:
      - "No difference"
      - "fetch only downloads and updates origin/*; pull = fetch + merge (or rebase) into your branch"
      - "pull only downloads"
      - "fetch uploads your commits"
    answer: 1
  - question: "Your push is rejected: 'remote contains work that you do not have'. Best fix?"
    options:
      - "git push --force"
      - "git pull --rebase, resolve if needed, then git push"
      - "Delete your commits"
      - "Clone again"
    answer: 1
  - question: "What does -u do in git push -u origin feature?"
    options:
      - "Uploads faster"
      - "Sets origin/feature as the upstream so later push/pull need no arguments"
      - "Undoes the push"
      - "Pushes all branches"
    answer: 1
---

# Remotes

A **remote** is another copy of the repo, usually on GitHub or GitLab. By convention the main one is called **`origin`**.

```bash
git clone https://github.com/team/app.git   # copies everything + sets origin
cd app
git remote -v                               # where is origin?
git branch -a                               # local + remote-tracking branches
```

## origin/main is a bookmark

`origin/main` is your computer's **last known position** of `main` on the server. It only updates when you talk to the server (`fetch`, `pull`, `push`).

```bash
git fetch           # update origin/* bookmarks; your branches untouched
git status          # "Your branch is behind 'origin/main' by 2 commits"
git pull            # fetch + merge origin/main into main
git pull --rebase   # fetch + rebase your local commits on top (linear history)
```

## Publishing work

```bash
git switch -c feature/search
git commit -am "Add search"
git push -u origin feature/search   # -u: remember origin/feature/search as upstream
git push                            # later pushes: no arguments needed
```

## The rejected push

```text
! [rejected]  main -> main (fetch first)
hint: Updates were rejected because the remote contains work that you do not have locally.
```

Someone pushed first. Integrate their work, then push:

```bash
git pull --rebase
# resolve conflicts if any → git add → git rebase --continue
git push
```

Never "fix" this with `git push --force` on a shared branch: you'd delete their commits.

## Other useful bits

```bash
git push origin --delete old-branch   # delete remote branch
git fetch --prune                     # forget remote branches deleted on the server
git remote add upstream <url>         # second remote (see forking workflow)
git switch some-branch                # auto-creates a tracking branch from origin/some-branch
```

**Authentication:** use SSH keys or a credential manager / personal access token. Never paste passwords into URLs.

## Exercises

1. In the lab, handle Sam's pushes with fetch, pull, and pull --rebase.
2. Run `git branch -vv` in a real repo. Which branches have upstreams? Are any ahead/behind?
