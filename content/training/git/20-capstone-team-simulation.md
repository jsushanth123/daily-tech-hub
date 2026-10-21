---
slug: git-capstone-team-simulation
track: git
title: "Capstone: team simulation"
description: "Put it all together: a live team scenario with conflicts, rebasing, a production hotfix, tags, and cleanup."
level: advanced
order: 20
durationMinutes: 40
topics: [git]
lab: capstone
objectives:
  - "Run a realistic day on a team using GitHub Flow + tagged releases"
  - "Resolve a rebase conflict caused by a teammate"
  - "Squash, push, hotfix, tag, and clean up without help"
updatedAt: "2026-10-21"
quiz:
  - question: "Your PR branch is behind main and conflicts. Most common team-friendly fix?"
    options:
      - "Force-push main"
      - "Rebase (or merge) the latest main into your branch, resolve, push (with --force-with-lease if rebased)"
      - "Close the PR"
      - "Ask the teammate to revert"
    answer: 1
  - question: "After merging a hotfix to main you should…"
    options:
      - "Tag the release and make sure other in-flight branches pick it up"
      - "Delete main"
      - "Revert it"
      - "Nothing"
    answer: 0
  - question: "Which command is the safety net if anything goes really wrong locally?"
    options:
      - "git reflog"
      - "git blame"
      - "git tag"
      - "git remote -v"
    answer: 0
---

# Capstone: team simulation

You're on a three-person team (**you, Sam, Mia**) using **GitHub Flow with tagged releases**. Your ticket: *add discounts*. During your day, teammates push to `main`, production breaks, and you have to ship both a hotfix and your feature.

## What you'll do

1. Branch `feature/discounts` from an up-to-date `main`.
2. Make two small commits.
3. 🔔 Sam changes the same line on `main` → rebase, **resolve a conflict**, continue.
4. Squash your commits with an interactive rebase.
5. Push the branch for review.
6. 🔥 Mia reports a production crash → `hotfix/crash` from `origin/main`, fix, push.
7. Merge the hotfix, tag `v1.0.1`, push the tag.
8. Rebase your feature on the new `main`, merge with `--no-ff`, push.
9. Clean up all branches and admire the graph.

No hand-holding beyond goals and hints. Use **Show command** only if stuck. Your progress is saved to your account, so you can come back later.

## Self-check after finishing

- Can you explain why your feature commits got new hashes after rebasing?
- Why did we branch the hotfix from `origin/main` instead of your feature branch?
- What would `git push --force` (instead of `--force-with-lease`) risk on a shared branch?

## Exercises

1. Replay the capstone using merge instead of rebase for step 3 and compare the graphs.
2. Run this scenario for real with two teammates on a scratch GitHub repo.
