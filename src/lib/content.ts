import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type {
  DigestMeta,
  NewsItem,
  ReleaseBrief,
  ShortcutItem,
  TrainingLesson,
  Exercise,
  CheatSheetEntry,
  Topic,
  QuizQuestion,
  LessonStep,
  TrackId,
} from "./types";
import { TRACK_IDS } from "./tracks";

const CONTENT_ROOT = path.join(process.cwd(), "content");

function readJson<T>(rel: string): T {
  const full = path.join(CONTENT_ROOT, rel);
  return JSON.parse(fs.readFileSync(full, "utf8")) as T;
}

export function getDigest(): DigestMeta {
  return readJson<DigestMeta>("digest.json");
}

export function getAllNews(): NewsItem[] {
  const items = readJson<NewsItem[]>("news/items.json");
  return [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getNewsBySlug(slug: string): NewsItem | undefined {
  return getAllNews().find((n) => n.slug === slug);
}

export function getAllReleases(): ReleaseBrief[] {
  const items = readJson<ReleaseBrief[]>("releases/items.json");
  return [...items].sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
}

export function getReleaseBySlug(slug: string): ReleaseBrief | undefined {
  return getAllReleases().find((r) => r.slug === slug);
}

export function getAllShortcuts(): ShortcutItem[] {
  const items = readJson<ShortcutItem[]>("shortcuts/items.json");
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getShortcutBySlug(slug: string): ShortcutItem | undefined {
  return getAllShortcuts().find((s) => s.slug === slug);
}

function deriveSteps(content: string, hasQuiz: boolean): LessonStep[] {
  const steps: LessonStep[] = [{ id: "learn", title: "Learn" }];
  if (/## Exercises/i.test(content)) {
    steps.push({ id: "exercises", title: "Exercises" });
  }
  if (/^lab:/m.test(content)) steps.push({ id: "lab", title: "Hands-on lab" });
  if (hasQuiz) steps.push({ id: "quiz", title: "Check understanding" });
  steps.push({ id: "complete", title: "Complete" });
  return steps;
}

export function getAllLessons(): TrainingLesson[] {
  const lessons: TrainingLesson[] = [];

  for (const track of TRACK_IDS) {
    const dir = path.join(CONTENT_ROOT, "training", track);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      const quiz = (data.quiz as QuizQuestion[] | undefined) ?? undefined;
      const body = content.trim();
      lessons.push({
        slug: String(data.slug),
        track: data.track as TrackId,
        title: String(data.title),
        description: String(data.description),
        level: data.level as TrainingLesson["level"],
        order: Number(data.order),
        durationMinutes: Number(data.durationMinutes),
        topics: (data.topics || []) as Topic[],
        objectives: (data.objectives || []) as string[],
        content: body,
        exercises: (data.exercises as Exercise[] | undefined) ?? [],
        cheatSheet: (data.cheatSheet as CheatSheetEntry[] | undefined) ?? undefined,
        quiz,
        steps: (data.steps as LessonStep[] | undefined) ?? deriveSteps((data.lab ? "lab: x\n" : "") + body, Boolean(quiz?.length)),
        lab: data.lab ? String(data.lab) : undefined,
        updatedAt: String(data.updatedAt),
      });
    }
  }

  return lessons.sort((a, b) => {
    if (a.track !== b.track) return a.track.localeCompare(b.track);
    return a.order - b.order;
  });
}

export function getLessonsByTrack(track: string): TrainingLesson[] {
  return getAllLessons().filter((l) => l.track === track);
}

export function getLesson(track: string, slug: string): TrainingLesson | undefined {
  const exact = getAllLessons().find((l) => l.track === track && l.slug === slug);
  if (exact) return exact;
  // Accept legacy filename-stem URLs (e.g. 01-dataframe-contracts) by matching the markdown file.
  const dir = path.join(CONTENT_ROOT, "training", track);
  if (!fs.existsSync(dir)) return undefined;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const stem = file.replace(/\.md$/, "");
    const stemNoPrefix = stem.replace(/^\d+-/, "");
    if (slug !== stem && slug !== stemNoPrefix) continue;
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const { data } = matter(raw);
    const realSlug = String(data.slug);
    return getAllLessons().find((l) => l.track === track && l.slug === realSlug);
  }
  return undefined;
}

export function getFeaturedBundle() {
  const digest = getDigest();
  const news = getAllNews();
  const lessons = getAllLessons();
  const releases = getAllReleases();
  const shortcuts = getAllShortcuts();

  const bySlug = <T extends { slug: string }>(items: T[], slugs: string[]) =>
    slugs.map((s) => items.find((i) => i.slug === s)).filter(Boolean) as T[];

  return {
    digest,
    news: bySlug(news, digest.featuredNewsSlugs),
    lessons: bySlug(lessons, digest.featuredLessonSlugs),
    releases: bySlug(releases, digest.featuredReleaseSlugs),
    shortcuts: bySlug(shortcuts, digest.featuredShortcutSlugs),
  };
}
