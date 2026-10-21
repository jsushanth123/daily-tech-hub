---
slug: git-pull-requests-review
track: git
title: "Pull requests and code review"
description: "The everyday team loop: branch, push, open a PR, review, update, merge, clean up."
level: beginner
order: 11
durationMinutes: 20
topics: [git]
lab: pr-flow
objectives:
  - "Run the full PR loop from branch to merge"
  - "Choose between merge commit, squash, and rebase merges"
  - "Give and receive useful code review"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Start"
    code: "git switch main && git pull\ngit switch -c feature/PAY-12-refunds"
  - label: "Publish & open PR (GitHub CLI)"
    code: "git push -u origin feature/PAY-12-refunds\ngh pr create --fill"
  - label: "Address review"
    code: "git commit -am \"Handle zero-amount refunds\"\ngit push"
  - label: "Check out a teammate's PR"
    code: "gh pr checkout 123"
  - label: "Clean up after merge"
    code: "git switch main && git pull\ngit branch -d feature/PAY-12-refunds\ngit fetch --prune"
quiz:
  - question: "Reviewer requests changes on your open PR. What do you do?"
    options:
      - "Close it and open a new PR"
      - "Commit the fixes on the same branch and push: the PR updates automatically"
      - "Push directly to main"
      - "Email the diff"
    answer: 1
  - question: "'Squash and merge' on GitHub results in…"
    options:
      - "All PR commits kept plus a merge commit"
      - "One single new commit on main containing all PR changes"
      - "No change to main"
      - "The branch being rebased but not merged"
    answer: 1
  - question: "A good PR is usually…"
    options:
      - "As large as possible to save time"
      - "Small, focused, with a clear description and tests"
      - "Without description"
      - "Merged without review"
    answer: 1
---

# Pull requests and code review

A **pull request (PR)** (GitLab calls it a **merge request, MR**) is a proposal: "please merge my branch into main". It's where review, discussion, and automated checks (CI) happen.

## The loop

```bash
git switch main && git pull                 # 1. start fresh
git switch -c feature/PAY-12-refunds        # 2. branch
# ...edit, commit small steps...
git push -u origin feature/PAY-12-refunds   # 3. publish
gh pr create --fill                         # 4. open PR (or click the button on GitHub)
# 5. CI runs, reviewers comment
git commit -am "Handle zero-amount refunds" # 6. address feedback
git push                                    #    PR updates itself
# 7. approved → merge on GitHub
git switch main && git pull                 # 8. clean up
git branch -d feature/PAY-12-refunds
```

## Merge options on GitHub/GitLab

| Button | History result | Good for |
| --- | --- | --- |
| **Create a merge commit** | keeps all commits + merge commit | preserving detail; Git Flow |
| **Squash and merge** | one commit per PR on main | tidy main; many small WIP commits |
| **Rebase and merge** | PR commits replayed linearly, no merge commit | linear history with meaningful commits |

Pick one per repo and stick to it. Protect `main` with **branch protection**: required reviews, required CI checks, no force-push.

## Writing a good PR

- Title says the outcome: "Add refunds for partial orders".
- Description: **what, why, how to test**, screenshots for UI, link the ticket.
- Keep it small (ideally under 400 changed lines). Split big work into stacked PRs.
- Mark as **Draft** while not ready.

## Reviewing well

- Review the *idea* first (does this solve the problem?), then the details.
- Be kind and specific: "Could we extract this into a function? It's duplicated in X" beats "this is messy".
- Prefix nits: `nit:` for optional style points.
- Approve when it's better than before, not perfect.
- `CODEOWNERS` auto-requests the right reviewers.

## Exercises

1. Do the PR lab, including addressing review feedback and deleting the branch.
2. Write a PR description template for your team (What / Why / How to test / Risks).
