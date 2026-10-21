---
slug: git-gitignore
track: git
title: ".gitignore: keep junk and secrets out"
description: "Ignore logs, build output, dependencies, and secrets, and fix it when you already committed them."
level: beginner
order: 10
durationMinutes: 12
topics: [git]
lab: ignore
objectives:
  - "Write .gitignore patterns (*.log, folders/, !exceptions)"
  - "Stop tracking a file that was committed by mistake"
  - "Know what to do if a secret was committed"
updatedAt: "2026-10-21"
cheatSheet:
  - label: "Typical .gitignore"
    code: "node_modules/\n.venv/\n__pycache__/\n*.log\n.env\ndist/\n.DS_Store"
  - label: "Stop tracking but keep the file"
    code: "git rm --cached .env\necho \".env\" >> .gitignore\ngit commit -m \"Stop tracking .env\""
  - label: "Why is this ignored?"
    code: "git check-ignore -v path/to/file"
quiz:
  - question: "You add .env to .gitignore, but it was committed last week. What happens?"
    options:
      - "Git removes it from history automatically"
      - "Git keeps tracking it; you must git rm --cached .env (and rotate any secret)"
      - "It is deleted from disk"
      - "Nothing can be done"
    answer: 1
  - question: "Which pattern ignores every .log file in any folder?"
    options:
      - "log"
      - "*.log"
      - "/log/"
      - "!*.log"
    answer: 1
---

# .gitignore

A `.gitignore` file lists patterns Git should **not** track. Commit it, so the whole team shares it.

```gitignore
# dependencies
node_modules/
.venv/

# build output
dist/
build/

# logs and OS junk
*.log
.DS_Store

# secrets: never commit these
.env
*.pem

# exception: keep this one
!keep.log
```

| Pattern | Matches |
| --- | --- |
| `*.log` | any file ending .log, anywhere |
| `build/` | the build folder (anywhere) |
| `/secret.txt` | only at repo root |
| `!keep.log` | un-ignore a file |
| `**/temp` | temp at any depth |

## Already committed it?

`.gitignore` only affects **untracked** files. To stop tracking:

```bash
git rm --cached config/local.yml
echo "config/local.yml" >> .gitignore
git commit -m "Stop tracking local config"
```

## Committed a secret?

1. **Rotate it immediately** (new API key/password). Assume it's leaked once pushed.
2. Remove it from the code and ignore it.
3. If needed, purge history with `git filter-repo` and coordinate a force-push with the team.
4. Enable secret scanning (GitHub push protection, gitleaks pre-commit hook).

Templates: [github/gitignore](https://github.com/github/gitignore) has one for every language.

## Exercises

1. In the lab, ignore logs, `.env`, and `build/`, then commit only real code.
2. Run `git check-ignore -v` on a file in a real project to see which rule ignores it.
