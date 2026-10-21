import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLessonsByTrack } from "@/lib/content";
import { getTrackMeta, TRACK_IDS } from "@/lib/tracks";
import { LessonCard } from "@/components/LessonCard";
import { TrackProgressBar } from "@/components/training/ProgressBar";
import { ArrowLeft } from "lucide-react";

import { TrackSceneClient } from "@/components/three/TrackSceneClient";

export function generateStaticParams() {
  return TRACK_IDS.map((track) => ({ track }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ track: string }>;
}): Promise<Metadata> {
  const { track } = await params;
  const meta = getTrackMeta(track);
  return { title: meta?.title ?? "Track" };
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ track: string }>;
}) {
  const { track } = await params;
  const meta = getTrackMeta(track);
  const lessons = getLessonsByTrack(track);
  if (!meta || !lessons.length) notFound();
  const slugs = lessons.map((l) => l.slug);

  return (
    <div className="space-y-8">
      <Link
        href="/training"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-cyan-300"
      >
        <ArrowLeft className="h-4 w-4" /> All tracks
      </Link>

      <div className="glass grid gap-6 overflow-hidden rounded-3xl p-6 sm:grid-cols-[1.2fr_0.8fr] sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400/90">
            Course track
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{meta.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">{meta.blurb}</p>
          <p className="mt-4 text-xs text-zinc-500">
            {lessons.length} lessons · ~{meta.estimatedHours}h · {meta.difficulty}
          </p>
          <div className="mt-6 max-w-md">
            <TrackProgressBar track={track} slugs={slugs} />
          </div>
          <Link
            href={`/training/${track}/${lessons[0].slug}`}
            className="mt-6 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-cyan-100"
          >
            Start / continue →
          </Link>
        </div>
        <TrackSceneClient track={track} />
      </div>

      {track === "git" ? (
        <div className="grid gap-3 sm:grid-cols-3" data-testid="git-hub-links">
          {[
            { href: "/git/sandbox", emoji: "🧪", title: "Free sandbox", body: "Type real Git commands, see the graph live." },
            { href: "/git/cheat-sheet", emoji: "📋", title: "Cheat sheet", body: "Every command, one page, copy buttons." },
            { href: "/git/glossary", emoji: "📖", title: "Glossary", body: "Git words in plain English." },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="panel rounded-2xl p-4 transition hover:-translate-y-0.5">
              <p className="text-2xl">{c.emoji}</p>
              <p className="mt-1 font-display font-bold text-[var(--ink-fg)]">{c.title}</p>
              <p className="text-sm text-[var(--muted)]">{c.body}</p>
            </Link>
          ))}
          <p className="text-sm text-[var(--muted)] sm:col-span-3">
            Modules 1–12 teach the commands, 13–19 cover branching strategies (GitHub Flow, Git Flow, trunk-based, GitLab Flow, release branches, forking) with diagrams and team simulations, and 20 is the capstone team simulation. Every lesson has a hands-on lab with auto-checks.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lessons.map((lesson) => (
          <LessonCard key={lesson.slug} lesson={lesson} />
        ))}
      </div>
    </div>
  );
}
