export type Topic =
  | "snowflake"
  | "databricks"
  | "python"
  | "pyspark"
  | "sql"
  | "git"
  | "general";

export type TrackId =
  | "python"
  | "sql"
  | "databricks"
  | "snowflake"
  | "git"
  | "prompt-engineering"
  | "ai-data-eng";

export type ContentKind = "news" | "training" | "release" | "shortcut";

export type ShortcutGroup = "keyboard" | "cli" | "sql" | "ai" | "ui";

export interface NewsItem {
  slug: string;
  title: string;
  source: string;
  sourceUrl?: string;
  summary: string;
  whyItMatters: string;
  topics: Topic[];
  publishedAt: string;
  featured?: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface LessonStep {
  id: string;
  title: string;
}

export interface TrainingLesson {
  slug: string;
  track: TrackId;
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  order: number;
  durationMinutes: number;
  topics: Topic[];
  objectives: string[];
  content: string;
  exercises: Exercise[];
  cheatSheet?: CheatSheetEntry[];
  quiz?: QuizQuestion[];
  steps?: LessonStep[];
  /** Interactive Git sandbox lab id (git track). */
  lab?: string;
  updatedAt: string;
}

export interface Exercise {
  title: string;
  prompt: string;
  hint?: string;
  solution?: string;
}

export interface CheatSheetEntry {
  label: string;
  code: string;
  note?: string;
}

export interface ReleaseBrief {
  slug: string;
  product: string;
  version: string;
  title: string;
  summary: string;
  whatChanged: string[];
  whyReadNow: string;
  topics: Topic[];
  releasedAt: string;
  sourceUrl?: string;
}

export interface ShortcutSource {
  label: string;
  url: string;
}

export interface ShortcutTip {
  title: string;
  body: string;
  code?: string;
  group?: ShortcutGroup;
  source?: string;
  sourceUrl?: string;
}

export interface ShortcutItem {
  slug: string;
  title: string;
  category: string;
  summary: string;
  topics: Topic[];
  tips: ShortcutTip[];
  updatedAt: string;
  tool?: string;
  sources?: ShortcutSource[];
}

export interface DigestMeta {
  date: string;
  lastUpdated: string;
  headline: string;
  blurb: string;
  featuredNewsSlugs: string[];
  featuredLessonSlugs: string[];
  featuredReleaseSlugs: string[];
  featuredShortcutSlugs: string[];
}

export interface SearchResult {
  kind: ContentKind;
  slug: string;
  title: string;
  summary: string;
  href: string;
  topics: Topic[];
}

export interface TrackMeta {
  id: TrackId;
  title: string;
  blurb: string;
  accent: string;
  difficulty: string;
  estimatedHours: number;
  badge?: string;
}
