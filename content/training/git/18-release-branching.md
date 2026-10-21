---
slug: git-release-branching
track: git
title: "Strategy: release branches"
description: "Maintain several released versions at once and back-port fixes with cherry-pick."
level: advanced
order: 18
durationMinutes: 20
topics: [git]
lab: release-branching
objectives:
  - "Cut and maintain release/X.Y branches"
  - "Back-port fixes with cherry-pick -x"
  - "Decide which versions to support"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Cut a release"
    code: "git switch -c release/1.x main\ngit tag -a v1.0.0 -m \"v1.0.0\"\ngit push -u origin release/1.x --follow-tags"
  - label: "Back-port a fix"
    code: "git switch release/1.x\ngit cherry-pick -x <fix-hash>\ngit tag -a v1.0.1 -m \"v1.0.1\""
quiz:
  - question: "A security fix lands on main. Users on v1 still need it. You…"
    options:
      - "Merge main into release/1.x (bringing all v2 features)"
      - "Cherry-pick just the fix onto release/1.x and tag a patch release"
      - "Tell users to upgrade"
      - "Rebase release/1.x onto main"
    answer: 1
  - question: "Why fix on main first, then back-port (rather than the other way round)?"
    options:
      - "It's faster to type"
      - "So the fix is never forgotten in future versions"
      - "Release branches are read-only"
      - "Cherry-pick only works from main"
    answer: 1
---

# Release branches

{{diagram:release-branching}}

Development happens on `main`. When a version is ready, you **cut a branch** (`release/1.x`) and tag it. That branch only receives fixes. New features continue on `main`. Fixes go to `main` first and are **cherry-picked** to each release branch that still needs them.

## When to use it

- Mobile apps, desktop apps, libraries, APIs, on-prem products: anything where **customers run older versions**.
- Long-term support (LTS) commitments (e.g. "we patch the last two majors").
- Often combined with GitHub Flow or trunk-based development on `main`.

## Pros and cons

| 👍 Pros | 👎 Cons |
| --- | --- |
| Stable, predictable patch releases | Back-porting effort grows with each supported version |
| `main` keeps moving fast | Cherry-picks can conflict as code diverges |
| Clear support policy per branch | Needs tracking of which fix went where (`-x`, labels) |

## Team scenario (lab below)

1. Cut `release/1.x`, tag `v1.0.0`.
2. Team builds v2 features on `main`.
3. Security fix on `main` (`Patch XSS`).
4. Back-port with `git cherry-pick` to `release/1.x`, tag `v1.0.1`. v2 features stay out.

Tip: `git cherry-pick -x` records the original hash in the message, and many teams automate back-ports with a "backport" label bot.
