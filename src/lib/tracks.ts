import type { TrackId, TrackMeta } from "./types";

export const TRACKS: TrackMeta[] = [
  {
    id: "prompt-engineering",
    title: "Prompt Engineering",
    blurb:
      "Ask better questions, structure prompts, iterate, verify, and stay safe — beginner-friendly AI skills.",
    accent: "from-[#9B5CFF] to-[#FF6B4A]",
    difficulty: "Beginner",
    estimatedHours: 2.5,
    badge: "New · Free",
  },
  {
    id: "ai-data-eng",
    title: "AI for Data Engineers",
    blurb:
      "Use AI as a DE copilot: debug, generate SQL/Python safely, docs/tests, and review AI-assisted changes.",
    accent: "from-[#FF6B4A] to-[#FFD166]",
    difficulty: "Beginner → Intermediate",
    estimatedHours: 2.5,
    badge: "New · Free",
  },
  {
    id: "python",
    title: "Python for Data Engineers",
    blurb:
      "ETL utilities, typing, testing, orchestration patterns, and PySpark-ready transforms.",
    accent: "from-[#FFD166] to-[#FF6B4A]",
    difficulty: "Beginner → Advanced",
    estimatedHours: 6,
  },
  {
    id: "sql",
    title: "SQL for Analytics Engineering",
    blurb:
      "Windows, incrementals, performance, modeling, and warehouse-ready patterns.",
    accent: "from-[#2EE59D] to-[#4CC9F0]",
    difficulty: "Beginner → Advanced",
    estimatedHours: 5.5,
  },
  {
    id: "databricks",
    title: "Databricks (DBX)",
    blurb:
      "Lakehouse fundamentals, Delta Lake, Unity Catalog, jobs, and Spark SQL at scale.",
    accent: "from-[#FF6B4A] to-[#9B5CFF]",
    difficulty: "Intermediate → Advanced",
    estimatedHours: 6.5,
  },
  {
    id: "snowflake",
    title: "Snowflake",
    blurb:
      "Warehouses, Time Travel, Dynamic Tables, Streams & Tasks, governance, and cost control.",
    accent: "from-[#4CC9F0] to-[#9B5CFF]",
    difficulty: "Beginner → Advanced",
    estimatedHours: 6,
  },
  {
    id: "git",
    title: "Git: Zero to Hero",
    blurb:
      "Hands-on Git from first commit to rebase, conflicts, remotes, and every branching strategy, with a live in-browser sandbox.",
    accent: "from-[#9B5CFF] to-[#4CC9F0]",
    difficulty: "Beginner → Advanced",
    estimatedHours: 8,
    badge: "New · Hands-on",
  },
];

export const PRIMARY_TRACKS = TRACKS;

export function getTrackMeta(id: string): TrackMeta | undefined {
  return TRACKS.find((t) => t.id === id);
}

export const TRACK_IDS: TrackId[] = TRACKS.map((t) => t.id);

export const CERT_PATH: TrackId[] = [
  "prompt-engineering",
  "ai-data-eng",
  "python",
  "sql",
  "snowflake",
  "databricks",
  "git",
];
