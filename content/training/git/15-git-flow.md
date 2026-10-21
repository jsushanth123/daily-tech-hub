---
slug: git-git-flow
track: git
title: "Strategy: Git Flow (feature / develop / release / hotfix)"
description: "The classic model for scheduled, versioned releases with develop, release, and hotfix branches."
level: intermediate
order: 15
durationMinutes: 25
topics: [git]
lab: git-flow
objectives:
  - "Know the five branch types of Git Flow and where each merges"
  - "Run a feature → release → hotfix cycle with tags"
  - "Judge when Git Flow is overkill"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Feature"
    code: "git switch -c feature/reports develop\n# ...\ngit switch develop && git merge --no-ff feature/reports"
  - label: "Release"
    code: "git switch -c release/1.1 develop\n# bump version, fix bugs\ngit switch main && git merge --no-ff release/1.1 && git tag -a v1.1.0 -m v1.1.0\ngit switch develop && git merge --no-ff release/1.1"
  - label: "Hotfix"
    code: "git switch -c hotfix/1.1.1 main\n# fix\ngit switch main && git merge --no-ff hotfix/1.1.1 && git tag -a v1.1.1 -m v1.1.1\ngit switch develop && git merge --no-ff hotfix/1.1.1"
quiz:
  - question: "In Git Flow, where do feature branches start and end?"
    options:
      - "From main, back into main"
      - "From develop, back into develop"
      - "From release, into main"
      - "From hotfix, into develop"
    answer: 1
  - question: "A hotfix must be merged into…"
    options:
      - "main only"
      - "develop only"
      - "both main (and tagged) and develop"
      - "Nowhere; it's deployed directly"
    answer: 2
  - question: "Git Flow is often overkill for…"
    options:
      - "Teams that deploy a web app continuously"
      - "Products with versioned quarterly releases"
      - "Installed desktop software"
      - "Firmware"
    answer: 0
---

# Git Flow

{{diagram:git-flow}}

| Branch | Lives | Branches from | Merges into |
| --- | --- | --- | --- |
| `main` | forever | n/a | n/a (each merge = a release, tagged) |
| `develop` | forever | `main` | n/a (integration of next release) |
| `feature/*` | days–weeks | `develop` | `develop` |
| `release/*` | until shipped | `develop` | `main` **and** `develop` |
| `hotfix/*` | hours | `main` | `main` **and** `develop` |

## When to use it

- Software with **explicit version releases** (desktop apps, SDKs, on-prem products, firmware).
- A release needs a stabilisation period (QA, translations, docs) while new features continue.
- Teams that need clear "what's in production" vs "what's next".

## Pros and cons

| 👍 Pros | 👎 Cons |
| --- | --- |
| Clear structure, release prep isolated | Many branches & merges: overhead |
| `main` = exactly what shipped (tags) | Long-lived `develop` drifts; big merges |
| Hotfix path without shipping unfinished work | Slow for continuous delivery; its own author suggests simpler flows for web apps |

## Team scenario (lab below)

1. Create `develop` from `main` (once per repo).
2. **You** build `feature/reports` off `develop`, merge back with `--no-ff`.
3. Release manager cuts `release/1.1`, bumps `VERSION`, QA fixes go here.
4. Ship: merge `release/1.1` → `main`, tag `v1.1.0`; merge back into `develop`; delete the release branch.
5. 🔥 Production bug: `hotfix/1.1.1` from `main`, fix, merge into `main` (tag `v1.1.1`) **and** `develop`.

The `git-flow` CLI extension (`git flow feature start reports`) automates these steps, but the plain commands above are what it runs.
