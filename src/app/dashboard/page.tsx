"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CERT_PATH, TRACKS } from "@/lib/tracks";
import { loadProgress, trackCompletion } from "@/lib/progress";

const TRACK_SLUGS: Record<string, string[]> = {
  "prompt-engineering": [
    "pe-ask-better-questions",
    "pe-structure-prompts",
    "pe-iterate-and-refine",
    "pe-verify-answers",
    "pe-safety-privacy",
    "pe-prompts-for-learning",
  ],
  "ai-data-eng": [
    "ai-de-copilot-mindset",
    "ai-de-debug-with-ai",
    "ai-de-generate-code-safely",
    "ai-de-docs-and-tests",
    "ai-de-tools-workflow",
    "ai-de-review-changes",
  ],
  python: [
    "python-dataframe-contracts",
    "python-typing-for-pipelines",
    "python-testing-spark-logic",
    "python-idempotent-writers",
    "python-config-and-secrets",
    "python-orchestration-hooks",
    "python-performance-de",
    "python-packaging-de-libs",
  ],
  sql: [
    "sql-window-functions-de",
    "sql-incremental-loads",
    "sql-performance-basics",
    "sql-dimensional-modeling",
    "sql-data-quality",
    "sql-ctes-readability",
    "sql-semi-structured",
  ],
  databricks: [
    "dbx-lakehouse-fundamentals",
    "dbx-delta-lake-basics",
    "dbx-spark-sql-performance",
    "dbx-unity-catalog",
    "dbx-jobs-workflows",
    "dbx-structured-streaming",
    "dbx-sql-warehouses",
  ],
  snowflake: [
    "sf-architecture",
    "sf-time-travel-clones",
    "sf-streams-tasks",
    "sf-dynamic-tables",
    "sf-performance-cost",
    "sf-governance-rbac",
    "sf-snowpark-python",
  ],
  git: ["git-what-is-git-setup", "git-staging-commits", "git-history", "git-undoing", "git-branches-merging", "git-merge-conflicts", "git-rebase", "git-remotes", "git-stash-cherry-pick-tags-reflog", "git-gitignore", "git-pull-requests-review", "git-bisect-blame-worktrees-hooks", "git-branching-strategies", "git-github-flow", "git-git-flow", "git-trunk-based", "git-gitlab-flow", "git-release-branching", "git-forking-workflow", "git-capstone-team-simulation"],
};

const TRACK_HUE: Record<string, string> = {
  "prompt-engineering": "var(--violet)",
  "ai-data-eng": "var(--coral)",
  python: "var(--sun)",
  sql: "var(--mint)",
  databricks: "var(--coral)",
  snowflake: "var(--sky)",
  git: "var(--violet)",
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener("dth-progress", on);
    return () => window.removeEventListener("dth-progress", on);
  }, []);

  const rows = useMemo(() => {
    void tick;
    void loadProgress();
    return CERT_PATH.map((id) => {
      const meta = TRACKS.find((t) => t.id === id)!;
      const slugs = TRACK_SLUGS[id] || [];
      const c = trackCompletion(id, slugs);
      return { meta, ...c };
    });
  }, [tick, user]);

  const overall = useMemo(() => {
    const done = rows.reduce((a, r) => a + r.done, 0);
    const total = rows.reduce((a, r) => a + r.total, 0);
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [rows]);

  const hasLocalProgress = overall.done > 0;

  if (loading) {
    return (
      <div className="space-y-8">
        <p className="text-sm text-[var(--muted)]">Loading session…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-8">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--coral)]">
            Free learning progress · 100% free
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-[var(--ink-fg)]">
            Sign in to sync progress
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Training progress on this device stays local until you sign in. There are no paid plans —
            a free account only syncs your lessons across devices.
          </p>
        </div>

        <div className="panel flex flex-col gap-4 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-bold text-[var(--ink-fg)]">
              You&apos;re browsing as a guest
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Sign in or create a free account to sync progress. No premium tiers — ever.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary">
              Sign in
            </Link>
            <Link href="/signup" className="btn-ghost">
              Create account
            </Link>
          </div>
        </div>

        {hasLocalProgress ? (
          <div className="space-y-4">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-[var(--sun)]">
                On this device (not synced)
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {overall.done}/{overall.total} lessons complete locally · {overall.pct}%
              </p>
            </div>
            <div className="progress-track">
              <div
                className={`progress-fill ${overall.pct === 100 ? "done" : ""}`}
                style={{ width: `${overall.pct}%` }}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {rows.map(({ meta, done, total, pct }) => (
                <Link
                  key={meta.id}
                  href={`/training/${meta.id}`}
                  className="panel glass-hover rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-lg font-bold text-[var(--ink-fg)]">
                      {meta.title}
                    </h2>
                    <span className="text-sm font-bold" style={{ color: TRACK_HUE[meta.id] }}>
                      {pct}%
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{meta.blurb}</p>
                  <div className="progress-track mt-4">
                    <div
                      className={`progress-fill ${pct === 100 ? "done" : ""}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {done}/{total} lessons · free track
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            No local progress yet.{" "}
            <Link href="/training" className="font-semibold text-[var(--coral)] hover:underline">
              Start free training
            </Link>
            .
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--coral)]">
          My progress · 100% free
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[var(--ink-fg)]">My progress</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Free learning progress across your tracks — coral = go, mint = done, sun = reward. No paid
          plans.
        </p>
      </div>

      <p className="text-sm text-[var(--ink-fg)]">
        Signed in as <strong>{user.name}</strong> ({user.email}) — progress syncs to your free
        account.
      </p>

      <div className="panel rounded-3xl p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-[var(--sun)]">
              Overall learning progress
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-[var(--ink-fg)]">{overall.pct}%</p>
            <p className="text-sm text-[var(--muted)]">
              {overall.done}/{overall.total} lessons complete
            </p>
          </div>
          <Link href="/training" className="btn-primary">
            Continue training
          </Link>
        </div>
        <div className="progress-track mt-4">
          <div
            className={`progress-fill ${overall.pct === 100 ? "done" : ""}`}
            style={{ width: `${overall.pct}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map(({ meta, done, total, pct }) => (
          <Link key={meta.id} href={`/training/${meta.id}`} className="panel glass-hover rounded-2xl p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[var(--ink-fg)]">{meta.title}</h2>
              <span className="text-sm font-bold" style={{ color: TRACK_HUE[meta.id] }}>
                {pct}%
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{meta.blurb}</p>
            <div className="progress-track mt-4">
              <div
                className={`progress-fill ${pct === 100 ? "done" : ""}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {done}/{total} lessons · free track
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
