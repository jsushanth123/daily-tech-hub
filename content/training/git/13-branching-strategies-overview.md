---
slug: git-branching-strategies
track: git
title: "Branching strategies: choosing one for your team"
description: "Overview and comparison of GitHub Flow, Git Flow, trunk-based, GitLab Flow, release branches, and forking."
level: intermediate
order: 13
durationMinutes: 15
topics: [git]
objectives:
  - "Know the six common strategies and what problem each solves"
  - "Pick a strategy from release cadence, team size, and environments"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Rule of thumb"
    code: "Continuous deploy, web app  -> GitHub Flow or trunk-based\nVersioned releases, support old versions -> release branches (or Git Flow)\nStaging/prod environments  -> GitLab Flow\nOpen source / no write access -> forking workflow"
quiz:
  - question: "Your team deploys a web app many times a day. Which strategy fits best?"
    options:
      - "Git Flow"
      - "GitHub Flow or trunk-based development"
      - "Release branches for every version"
      - "No branches at all, ever"
    answer: 1
  - question: "You ship a mobile/desktop product and must patch v1 and v2 simultaneously. Which helps most?"
    options:
      - "Release branches"
      - "Forking workflow"
      - "Committing straight to main"
      - "GitHub Flow only"
    answer: 0
  - question: "Contributors can't push to the main repo. Which workflow?"
    options:
      - "Trunk-based"
      - "Forking workflow"
      - "GitLab Flow"
      - "Git Flow"
    answer: 1
---

# Branching strategies

A **branching strategy** is a team agreement: which branches exist, where new work starts, how it gets reviewed, and how it reaches users. There's no single best one. Pick based on how you **release**.

| Strategy | Long-lived branches | Release style | Best for | Watch out for |
| --- | --- | --- | --- | --- |
| **GitHub Flow** | `main` | deploy on every merge | web apps, SaaS, small-mid teams | needs good CI + easy rollback |
| **Git Flow** | `main`, `develop` | scheduled versioned releases | packaged software, strict release cycles | complex; slow; merge overhead |
| **Trunk-based** | `main` (trunk) | continuous, feature flags | high-performing teams, many deploys/day | needs strong tests, flag discipline |
| **GitLab Flow** | `main`, `staging`, `production` | promote through environments | apps with staging/prod or approval gates | environment drift if you skip promotion |
| **Release branches** | `main`, `release/X.Y` | long-term supported versions | mobile/desktop/libraries, LTS | back-porting effort |
| **Forking** | upstream `main` | maintainers merge PRs | open source, external contributors | keeping forks in sync |

## Quick chooser

1. **Can contributors push to the repo?** No → **Forking** (combined with any of the others upstream).
2. **Do you deploy continuously?** Yes → **GitHub Flow**; at large scale or many deploys/day → **Trunk-based** with feature flags.
3. **Do you promote builds through environments** (dev → staging → prod)? → **GitLab Flow**.
4. **Do you maintain several released versions at once?** → **Release branches** (Git Flow if you also want a develop branch).

Each of the next lessons has a diagram, when to use it, pros/cons, and a full team simulation you can play in the sandbox.

## Universal good habits

- Protect `main`: required review + CI, no force-push.
- Short-lived branches (days, not weeks).
- Consistent branch names: `feature/`, `fix/`, `release/`, `hotfix/`.
- Tag releases (`v1.4.2`) and automate changelogs.
