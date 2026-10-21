"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { type Repo, emptyRepo, runScript, makeRemote } from "@/lib/gitsim/engine";
import { GitGraph } from "./GitGraph";
import { FilesPanel, GitTerminal, type TermLine } from "./GitTerminal";
import { useGitSession } from "./useGitSession";

const STORAGE = "dth-git-sandbox-v1";

const PRESETS: { id: string; label: string; make: () => Repo; note: string }[] = [
  { id: "empty", label: "Empty folder", make: () => emptyRepo(), note: "Start from zero: git init." },
  {
    id: "starter",
    label: "Repo with history",
    make: () =>
      runScript(emptyRepo(), [
        "git init",
        'echo "# Shop" > README.md',
        "git add .",
        'git commit -m "Initial commit"',
        'echo "cart" > cart.txt',
        "git add .",
        'git commit -m "Add cart"',
        "git switch -c feature/checkout",
        'echo "pay" > pay.txt',
        "git add .",
        'git commit -m "Add payment"',
        "git switch main",
      ]),
    note: "main + a feature branch. Try merge vs rebase.",
  },
  {
    id: "conflict",
    label: "Conflict ready",
    make: () =>
      runScript(emptyRepo(), [
        "git init",
        'echo "title = Hello" > page.txt',
        "git add .",
        'git commit -m "Add page"',
        "git switch -c copy-edit",
        'echo "title = Hi there" > page.txt',
        'git commit -am "Friendlier title"',
        "git switch main",
        'echo "title = Welcome" > page.txt',
        'git commit -am "Welcome title"',
      ]),
    note: "Run git merge copy-edit to get a conflict.",
  },
  {
    id: "remote",
    label: "Team repo (remote)",
    make: () => {
      const r = runScript(emptyRepo(), ["git init", 'echo "# Team" > README.md', "git add .", 'git commit -m "Initial commit"']);
      r.remotes.origin = makeRemote("origin", "https://github.com/team/app.git");
      return runScript(r, ["git push -u origin main"]);
    },
    note: "Has origin. Try branches + git push -u origin <branch>.",
  },
];

const WELCOME: TermLine[] = [
  { kind: "out", text: "Welcome to the Git sandbox 👋  Everything here is simulated in your browser — nothing can break.\nType `help` for the command list. Use ↑/↓ for history. Chain commands with &&." },
];

function loadSaved(): { repo: Repo; preset: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE);
    return raw ? (JSON.parse(raw) as { repo: Repo; preset: string }) : null;
  } catch {
    return null;
  }
}

/** Client-only (rendered via GitSandboxClient with ssr: false) so it can restore from localStorage. */
export function GitSandbox() {
  const [saved] = useState(loadSaved);
  const { repo, setRepo, lines, setLines, exec } = useGitSession(
    () => saved?.repo ?? emptyRepo(),
    saved ? [...WELCOME, { kind: "event", text: "Restored your last sandbox session (Reset to start over)." }] : WELCOME,
  );
  const [preset, setPreset] = useState(saved?.preset ?? "empty");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ repo, preset }));
    } catch {
      /* quota */
    }
  }, [repo, preset]);

  const load = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    setPreset(id);
    setRepo(p.make());
    setLines([...WELCOME, { kind: "event", text: `Loaded “${p.label}”. ${p.note}` }]);
  };

  return (
    <div className="space-y-4" data-testid="git-sandbox">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Start from:</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => load(p.id)}
            className={`min-h-[36px] rounded-full border px-3 py-1 text-xs font-semibold transition ${
              preset === p.id ? "border-[var(--violet)] bg-[var(--violet)]/15 text-[var(--ink-fg)]" : "border-[var(--ink-border)] text-[var(--muted)] hover:text-[var(--ink-fg)]"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button type="button" onClick={() => load(preset)} className="ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[var(--ink-border)] px-3 py-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--coral)]">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>
      <GitGraph repo={repo} />
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <GitTerminal repo={repo} lines={lines} onCommand={(c) => exec(c, repo)} autoFocus />
        <FilesPanel repo={repo} onCat={(f) => exec(`cat ${f}`, repo)} />
      </div>
    </div>
  );
}
