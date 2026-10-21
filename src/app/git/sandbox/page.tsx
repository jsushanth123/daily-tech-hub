import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GitSandboxClient as GitSandbox } from "@/components/git/GitSandboxClient";

export const metadata: Metadata = {
  title: "Git sandbox",
  description: "Practise real Git commands in a safe in-browser simulator with a live commit graph.",
};

const TRY = [
  ["Basics", "git init → echo \"hi\" > a.txt → git add . → git commit -m \"First\""],
  ["Branch + merge", "git switch -c feature → commit → git switch main → git merge feature"],
  ["Conflict", "Load “Conflict ready” → git merge copy-edit → cat page.txt → fix → git add → git commit"],
  ["Rebase", "Load “Repo with history” → commit on main → git switch feature/checkout → git rebase main"],
  ["Undo", "git reset --soft HEAD~1 · git revert HEAD · git reflog"],
  ["Remote", "Empty folder → git clone https://github.com/team/app.git → git push -u origin <branch>"],
];

export default function SandboxPage() {
  return (
    <div className="space-y-6">
      <Link href="/training/git" className="inline-flex min-h-[40px] items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--coral)]">
        <ArrowLeft className="h-4 w-4" /> Git: Zero to Hero
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--violet)]">Hands-on</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-[var(--ink-fg)] sm:text-4xl">Git sandbox</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          A safe, simulated Git repository that runs entirely in your browser. Type real commands and watch the commit graph update live.
          Your session is saved on this device. For guided steps with auto-checks, open any lesson&apos;s lab.
        </p>
      </div>
      <GitSandbox />
      <div className="panel rounded-2xl p-5">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--sky)]">Things to try</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {TRY.map(([t, d]) => (
            <li key={t} className="rounded-xl border border-[var(--ink-border)] bg-[var(--canvas)]/50 p-3 text-sm">
              <p className="font-semibold text-[var(--ink-fg)]">{t}</p>
              <p className="mt-1 font-mono text-xs text-[var(--muted)]">{d}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-[var(--muted)]">
          Simulator limits: files are whole-text blobs (conflicts are per file, not per line), there&apos;s no text editor (use echo &gt; file and plan lines for rebase -i), and the remote is simulated. Hooks need a real machine.
        </p>
      </div>
    </div>
  );
}
