"use client";

import { useMemo } from "react";
import { type Repo, type Commit, allTips, reachable, currentBranch, headId, short } from "@/lib/gitsim/engine";

const LANE_COLORS = ["var(--violet)", "var(--coral)", "var(--mint)", "var(--sky)", "var(--sun)", "#e879f9", "#94a3b8"];

const PRIORITY = ["main", "master", "trunk", "production", "staging", "develop"];

interface Laid {
  c: Commit;
  x: number;
  lane: number;
}

export function layoutGraph(repo: Repo) {
  const commits = reachable(repo, allTips(repo)).sort((a, b) => a.time - b.time);
  const laneOf = new Map<string, number>();
  const laneNames: string[] = [];
  const order = [
    ...PRIORITY.filter((b) => repo.branches[b]),
    ...Object.keys(repo.branches).filter((b) => !PRIORITY.includes(b)).sort(),
    ...Object.keys(repo.tracking).sort(),
  ];
  const tips: [string, string][] = order.map((n) => [n, repo.branches[n] ?? repo.tracking[n]]);
  const h = headId(repo);
  if (h && repo.head.kind === "detached") tips.push(["HEAD", h]);
  for (const t of Object.entries(repo.tags)) tips.push([`tag ${t[0]}`, t[1].id]);
  for (const [name, tip] of tips) {
    let cur: string | undefined = tip;
    let lane = -1;
    while (cur && repo.commits[cur] && !laneOf.has(cur)) {
      if (lane < 0) {
        lane = laneNames.length;
        laneNames.push(name);
      }
      laneOf.set(cur, lane);
      cur = repo.commits[cur].parents[0];
    }
  }
  const laid: Laid[] = commits.map((c, i) => ({ c, x: i, lane: laneOf.get(c.id) ?? 0 }));
  // compact lanes that ended up unused
  const used = [...new Set(laid.map((l) => l.lane))].sort((a, b) => a - b);
  const remap = new Map(used.map((l, i) => [l, i]));
  for (const l of laid) l.lane = remap.get(l.lane) ?? 0;
  return { laid, lanes: used.length, laneNames: used.map((l) => laneNames[l]) };
}

export function GitGraph({ repo, height }: { repo: Repo; height?: number }) {
  const { laid, lanes } = useMemo(() => layoutGraph(repo), [repo]);
  const pos = new Map(laid.map((l) => [l.c.id, l]));
  const DX = 64;
  const DY = 46;
  const PADX = 36;
  const PADY = 40;
  const width = Math.max(280, PADX * 2 + Math.max(0, laid.length - 1) * DX + 80);
  const h = height ?? Math.max(150, PADY + lanes * DY + 34);
  const head = headId(repo);
  const cb = currentBranch(repo);

  const labels = new Map<string, { text: string; kind: "head" | "branch" | "remote" | "tag" }[]>();
  const add = (id: string, l: { text: string; kind: "head" | "branch" | "remote" | "tag" }) => {
    if (!labels.has(id)) labels.set(id, []);
    labels.get(id)!.push(l);
  };
  for (const [b, id] of Object.entries(repo.branches)) add(id, { text: b === cb ? `HEAD → ${b}` : b, kind: b === cb ? "head" : "branch" });
  if (repo.head.kind === "detached" && head) add(head, { text: "HEAD (detached)", kind: "head" });
  for (const [b, id] of Object.entries(repo.tracking)) add(id, { text: b, kind: "remote" });
  for (const [t, v] of Object.entries(repo.tags)) add(v.id, { text: `🏷 ${t}`, kind: "tag" });

  if (!laid.length) {
    return (
      <div className="flex h-[150px] items-center justify-center rounded-2xl border border-dashed border-[var(--ink-border)] text-sm text-[var(--muted)]">
        {repo.initialized ? "No commits yet — make your first commit to see the graph grow ✨" : "No repository yet — type git init (or git clone <url>)"}
      </div>
    );
  }

  const X = (l: Laid) => PADX + l.x * DX;
  const Y = (l: Laid) => PADY + l.lane * DY;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--ink-border)] bg-[var(--canvas)]/60" aria-label="Commit graph">
      <svg width={width} height={h} role="img" aria-label={`Commit graph with ${laid.length} commits`}>
        {laid.map((l) =>
          l.c.parents.map((p) => {
            const pl = pos.get(p);
            if (!pl) return null;
            const x1 = X(pl);
            const y1 = Y(pl);
            const x2 = X(l);
            const y2 = Y(l);
            const color = LANE_COLORS[(y1 === y2 ? l.lane : Math.max(l.lane, pl.lane)) % LANE_COLORS.length];
            const d = y1 === y2 ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} C${x1 + DX * 0.6},${y1} ${x2 - DX * 0.6},${y2} ${x2},${y2}`;
            return <path key={`${l.c.id}-${p}`} d={d} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.85} />;
          }),
        )}
        {laid.map((l) => {
          const isHead = l.c.id === head;
          const color = LANE_COLORS[l.lane % LANE_COLORS.length];
          const lbls = labels.get(l.c.id) ?? [];
          return (
            <g key={l.c.id} className="gitgraph-node">
              <title>{`${short(l.c.id)} — ${l.c.message.split("\n")[0]} (${l.c.author})`}</title>
              {isHead ? <circle cx={X(l)} cy={Y(l)} r={14} fill="none" stroke="var(--coral)" strokeWidth={2} strokeDasharray="3 3" /> : null}
              <circle cx={X(l)} cy={Y(l)} r={l.c.parents.length > 1 ? 9 : 8} fill={l.c.parents.length > 1 ? "var(--panel)" : color} stroke={color} strokeWidth={3} />
              <text x={X(l)} y={Y(l) + 24} textAnchor="middle" fontSize={10} fill="var(--muted)" fontFamily="var(--font-mono), monospace">
                {short(l.c.id)}
              </text>
              {lbls.map((lb, i) => (
                <g key={lb.text} transform={`translate(${X(l) + 4}, ${Y(l) - 16 - i * 15})`}>
                  <text
                    fontSize={10}
                    fontWeight={700}
                    fill={lb.kind === "head" ? "var(--coral)" : lb.kind === "tag" ? "var(--sun)" : lb.kind === "remote" ? "var(--sky)" : "var(--violet)"}
                    fontFamily="var(--font-mono), monospace"
                  >
                    {lb.text}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
