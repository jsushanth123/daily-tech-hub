---
slug: git-merge-conflicts
track: git
title: "Merge conflicts, and how to resolve them calmly"
description: "Why conflicts happen, how to read conflict markers, and three ways to resolve them."
level: beginner
order: 6
durationMinutes: 25
topics: [git]
lab: conflicts
objectives:
  - "Read <<<<<<< ======= >>>>>>> conflict markers"
  - "Resolve by editing, or by choosing ours/theirs"
  - "Abort a merge you don't want to finish"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "See what's conflicted"
    code: "git status"
  - label: "After editing the file"
    code: "git add price.txt\ngit commit"
  - label: "Take one side for a file"
    code: "git checkout --ours price.txt    # keep my branch's version\ngit checkout --theirs price.txt  # keep the incoming version"
  - label: "Give up on this merge"
    code: "git merge --abort"
  - label: "Use a visual merge tool"
    code: "git mergetool"
quiz:
  - question: "In a conflict, the text between <<<<<<< HEAD and ======= is…"
    options:
      - "The incoming branch's version"
      - "Your current branch's version (HEAD)"
      - "The common ancestor"
      - "A Git error message"
    answer: 1
  - question: "After fixing a conflicted file by hand, what tells Git it's resolved?"
    options:
      - "Saving the file"
      - "git add <file>"
      - "git push"
      - "git status"
    answer: 1
  - question: "During a REBASE, which side is 'ours'?"
    options:
      - "Your feature commits"
      - "The branch you are rebasing onto (e.g. main)"
      - "Neither"
      - "Whichever is newer"
    answer: 1
    explanation: "Rebase replays your commits on top of the other branch, so HEAD (ours) is the base, and your commit is 'theirs'. Confusing but true!"
---

# Merge conflicts

A conflict is **not an error**. It just means two people changed the same lines and Git politely asks a human to decide. Nothing is lost.

```text
$ git merge sale
Auto-merging price.txt
CONFLICT (content): Merge conflict in price.txt
Automatic merge failed; fix conflicts and then commit the result.
```

## Read the markers

```text
<<<<<<< HEAD
price = 12          <- your current branch (ours)
=======
price = 8           <- the branch you're merging in (theirs)
>>>>>>> sale
```

## Resolve in 4 steps

1. `git status`: see which files are "both modified".
2. Open each file and decide the final content. Delete **all** marker lines (`<<<<<<<`, `=======`, `>>>>>>>`).
3. `git add <file>` marks it resolved.
4. `git commit` (merge) or `git rebase --continue` / `git cherry-pick --continue`.

Shortcuts when one side is simply right:

```bash
git checkout --ours price.txt     # keep my version
git checkout --theirs price.txt   # keep their version
git add price.txt
```

Changed your mind? `git merge --abort` puts everything back.

## Prevent painful conflicts

- Keep branches **short-lived**; merge or rebase from `main` often.
- Make **small PRs**.
- Don't mix mass reformatting with real changes.
- Talk to each other: "I'm refactoring `checkout.py` today."
- Editors (VS Code, JetBrains) show "Accept current / incoming / both" buttons. Use them, but **re-read the result** and run tests.

## Exercises

1. Complete all three rounds in the lab (edit, take theirs, abort).
2. Create a conflict on purpose in a real scratch repo and resolve it in your editor's merge UI.
