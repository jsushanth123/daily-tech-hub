import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GIT_GLOSSARY } from "@/lib/gitsim/glossary";

export const metadata: Metadata = { title: "Git glossary", description: "Every Git word explained in plain English." };

export default function GlossaryPage() {
  const terms = [...GIT_GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
  const letters = [...new Set(terms.map((t) => t.term.replace(/^[^A-Za-z]+/, "")[0].toUpperCase()))];
  return (
    <div className="space-y-6">
      <Link href="/training/git" className="inline-flex min-h-[40px] items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--coral)]">
        <ArrowLeft className="h-4 w-4" /> Git: Zero to Hero
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--mint)]">Plain English</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-[var(--ink-fg)] sm:text-4xl">Git glossary</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{terms.length} terms, no jargon required. Search with Ctrl/⌘ + F.</p>
        <nav className="mt-3 flex flex-wrap gap-1" aria-label="Jump to letter">
          {letters.map((l) => (
            <a key={l} href={`#letter-${l}`} className="rounded-md px-2 py-1 text-xs font-bold text-[var(--violet)] hover:bg-[var(--violet)]/10">{l}</a>
          ))}
        </nav>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {terms.map((t, i) => {
          const letter = t.term.replace(/^[^A-Za-z]+/, "")[0].toUpperCase();
          const first = i === terms.findIndex((x) => x.term.replace(/^[^A-Za-z]+/, "")[0].toUpperCase() === letter);
          return (
            <div key={t.term} id={first ? `letter-${letter}` : undefined} className="panel scroll-mt-24 rounded-2xl p-4">
              <dt className="font-display font-bold text-[var(--ink-fg)]">{t.term}</dt>
              <dd className="mt-1 text-sm text-[var(--muted)]">{t.plain}</dd>
              {t.example ? <dd className="mt-2 rounded-lg bg-[var(--canvas)]/60 px-2 py-1 font-mono text-xs text-[var(--ink-fg)]">{t.example}</dd> : null}
            </div>
          );
        })}
      </dl>
    </div>
  );
}
