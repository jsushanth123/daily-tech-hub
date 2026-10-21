---
slug: git-what-is-git-setup
track: git
title: "What Git is, and setting it up"
description: "Git in plain English, installing it, telling it who you are, and creating your first repository."
level: beginner
order: 1
durationMinutes: 15
topics: [git]
lab: setup
objectives:
  - "Explain what Git, a repository, and a commit are in plain words"
  - "Configure your name, email, and default branch"
  - "Create a repository with git init"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Who am I?"
    code: "git config --global user.name \"Your Name\"\ngit config --global user.email \"you@example.com\""
  - label: "Default branch = main"
    code: "git config --global init.defaultBranch main"
  - label: "New repo"
    code: "git init"
quiz:
  - question: "What is a Git repository?"
    options:
      - "A website where code is stored"
      - "A folder whose full history of changes is tracked by Git (in a hidden .git folder)"
      - "A single saved file"
      - "A backup on a USB stick"
    answer: 1
    explanation: "GitHub/GitLab host repositories, but a repository is just a folder + its .git history."
  - question: "Why set user.name and user.email?"
    options:
      - "To log in to GitHub"
      - "Every commit records an author; Git uses these values"
      - "To encrypt your files"
      - "They are optional decorations"
    answer: 1
  - question: "Is Git the same as GitHub?"
    options:
      - "Yes, two names for one thing"
      - "No: Git is the tool on your computer; GitHub is a website that hosts Git repositories"
      - "GitHub is the command line version of Git"
      - "Git only works with GitHub"
    answer: 1
---

# What Git is, and setting it up

**Git is a time machine for a folder.** Every time you say "save this moment" (a **commit**), Git keeps a snapshot. You can see who changed what, go back to an old version, and work on several ideas at once without them getting mixed up.

| Word | Plain meaning |
| --- | --- |
| **Repository (repo)** | A project folder that Git is watching. The history lives in a hidden `.git` folder inside it. |
| **Commit** | A saved snapshot of your files, with a message saying what changed. |
| **Branch** | A named line of work, like a parallel universe for your changes. |
| **Remote** | A copy of the repo somewhere else, usually GitHub or GitLab. |

> **Git ≠ GitHub.** Git is the tool on your computer. GitHub (and GitLab, Bitbucket, Azure DevOps) are websites that host Git repos and add pull requests, reviews, and CI.

## Install

- **macOS:** `xcode-select --install` or `brew install git`
- **Windows:** install "Git for Windows" (includes Git Bash)
- **Linux:** `sudo apt install git` (Debian/Ubuntu) or `sudo dnf install git`

Check it worked:

```bash
git --version
```

## Tell Git who you are (one time per computer)

```bash
git config --global user.name "Ada Lovelace"
git config --global user.email "ada@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase false   # pick a pull style; we cover this later
git config --list                       # see all settings
```

`--global` means "for every repo on this computer". Leave it out to set something just for the current repo (handy for a work email).

## Create a repository

```bash
mkdir my-project
cd my-project
git init
git status
```

`git init` creates the hidden `.git` folder. `git status` is the command you'll run constantly. It tells you what's going on.

## The three areas (the most important picture in Git)

```text
 working tree  --git add-->  staging area (index)  --git commit-->  repository (history)
 (your files)                (what goes in next)                   (saved snapshots)
```

You edit files in the **working tree**, choose what to include with `git add` (the **staging area**), and save a snapshot with `git commit`.

## Exercises

1. Run the lab below. Then on your own machine run `git config --list` and find your name.
2. Create a folder, `git init` it, and look for the hidden `.git` folder (`ls -a`).
