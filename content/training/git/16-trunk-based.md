---
slug: git-trunk-based
track: git
title: "Strategy: trunk-based development + feature flags"
description: "Everyone integrates into main at least daily; unfinished features hide behind flags."
level: advanced
order: 16
durationMinutes: 20
topics: [git]
lab: trunk
objectives:
  - "Explain trunk-based development and why it reduces merge pain"
  - "Use feature flags to merge unfinished work safely"
  - "Know the prerequisites (tests, CI, small changes)"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Daily loop"
    code: "git switch main && git pull --rebase\ngit switch -c small-change\n# < 1 day of work\ngit fetch && git rebase origin/main\ngit switch main && git merge small-change && git push"
  - label: "Feature flag (pseudo-code)"
    code: "if flags.is_enabled(\"checkout_v2\", user):\n    return new_checkout()\nreturn old_checkout()"
quiz:
  - question: "How does trunk-based development ship features that take two weeks?"
    options:
      - "A two-week feature branch"
      - "Small daily merges to main, hidden behind a feature flag until ready"
      - "It can't"
      - "By forking the repo"
    answer: 1
  - question: "A key prerequisite of trunk-based development is…"
    options:
      - "A develop branch"
      - "Fast, reliable automated tests and CI"
      - "Monthly releases"
      - "No code review"
    answer: 1
  - question: "What should happen to a feature flag after the feature is fully launched?"
    options:
      - "Keep it forever"
      - "Remove the flag and the old code path (flag debt)"
      - "Rename it"
      - "Turn it off again"
    answer: 1
---

# Trunk-based development

{{diagram:trunk}}

Everyone integrates small changes into **one branch (the trunk, `main`) at least once a day**. Branches, if used at all, live for hours. Releases are cut from trunk (often continuously). Work that isn't finished is merged anyway, but **switched off with a feature flag**.

## Feature flags in one minute

```python
if flags.enabled("checkout_v2", user):
    return checkout_v2(cart)
return checkout_v1(cart)
```

- Merge code **dark** (flag off) → test in production with staff → roll out 5% → 100%.
- Instant "rollback" = flip the flag, no redeploy.
- Afterwards **delete the flag** and the old path (otherwise flags pile up).
- Tools: LaunchDarkly, Unleash, Flagsmith, GrowthBook, or a config table.

## When to use it

- Teams practising CI/CD with strong automated tests.
- Many deploys per day; large orgs (Google, Meta) run monorepos this way.
- You want to eliminate long-lived branches and "merge hell".

## Pros and cons

| 👍 Pros | 👎 Cons |
| --- | --- |
| Tiny merges, almost no conflicts | Needs excellent test coverage + fast CI |
| Continuous integration in the true sense | Flags add complexity and must be cleaned up |
| Fast feedback, easy to release anytime | Harder for beginners; mistakes hit main quickly |
| Pairs well with release-from-trunk + tags | Requires discipline: small, safe commits |

## Team scenario (lab below)

1. You open a tiny branch for "checkout v2, step 1" and add code behind `checkout_v2 = false`.
2. **Raj** pushes to main meanwhile. You `fetch` + `rebase origin/main`, fast-forward main, push the same day.
3. Production now contains your code, safely switched off.
4. When ready, a one-line commit flips the flag on. Tag `v2.0.0`.
