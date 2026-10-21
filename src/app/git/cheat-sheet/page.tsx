import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { getLessonsByTrack } from "@/lib/content";

export const metadata: Metadata = { title: "Git cheat sheet", description: "Every Git command from the Zero to Hero course on one page, with copy buttons." };

const DANGER: { cmd: string; why: string; safer: string }[] = [
  { cmd: "git reset --hard", why: "Deletes uncommitted work", safer: "git stash (or commit first)" },
  { cmd: "git push --force", why: "Can wipe teammates' commits", safer: "git push --force-with-lease" },
  { cmd: "git rebase on shared branches", why: "Rewrites history others have", safer: "git merge, or rebase only your own branch" },
  { cmd: "git clean -fd", why: "Deletes untracked files permanently", safer: "git clean -n (dry run) first" },
];

export default function CheatSheetPage() {
  const lessons = getLessonsByTrack("git").filter((l) => l.cheatSheet?.length);
  return (
    <div className="space-y-6">
      <Link href="/training/git" className="inline-flex min-h-[40px] items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--coral)]">
        <ArrowLeft className="h-4 w-4" /> Git: Zero to Hero
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sky)]">Reference</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-[var(--ink-fg)] sm:text-4xl">Git cheat sheet</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Every command from the course, grouped by lesson. Click a heading to open the lesson and practise in its lab.</p>
      </div>
      <div className="panel rounded-2xl border border-rose-500/30 p-5">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-rose-500">⚠️ Handle with care</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {DANGER.map((d) => (
            <li key={d.cmd} className="rounded-xl bg-[var(--canvas)]/50 p-3 text-sm">
              <code className="font-mono text-xs font-bold text-[var(--ink-fg)]">{d.cmd}</code>
              <p className="text-xs text-[var(--muted)]">{d.why}. Safer: <code className="font-mono">{d.safer}</code></p>
            </li>
          ))}
        </ul>
      </div>
      <div className="columns-1 gap-4 lg:columns-2">
        {lessons.map((l) => (
          <section key={l.slug} className="panel mb-4 break-inside-avoid rounded-2xl p-5">
            <h2 className="font-display text-base font-bold text-[var(--ink-fg)]">
              <Link href={`/training/git/${l.slug}`} className="hover:text-[var(--coral)]">
                {l.order}. {l.title}
              </Link>
            </h2>
            <ul className="mt-3 space-y-3">
              {l.cheatSheet!.map((e) => (
                <li key={e.label} className="rounded-xl border border-[var(--ink-border)] bg-[var(--canvas)]/50 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--ink-fg)]">{e.label}</p>
                    <CopyButton text={e.code} className="border-[var(--ink-border)] bg-[var(--panel)] text-[var(--ink-fg)]" />
                  </div>
                  <pre className="overflow-x-auto whitespace-pre font-mono text-xs text-[var(--ink-fg)]">
                    <code>{e.code}</code>
                  </pre>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
