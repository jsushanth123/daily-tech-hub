/** Static SVG diagrams for branching strategies (server-renderable). */

type Pt = [lane: number, x: number];
interface Diagram {
  title: string;
  lanes: { name: string; color: string }[];
  dots: (Pt & { 2?: string })[] | [number, number, string?][];
  edges: [Pt, Pt, ("dash" | undefined)?][];
  width?: number;
  caption: string;
}

const C = { main: "var(--violet)", dev: "var(--sky)", feat: "var(--coral)", rel: "var(--mint)", hot: "#f43f5e", env: "var(--sun)", fork: "#e879f9" };

// helpers: chain of commits on one lane
const chain = (lane: number, xs: number[]): [Pt, Pt][] => xs.slice(1).map((x, i) => [[lane, xs[i]], [lane, x]]);

const DIAGRAMS: Record<string, Diagram> = {
  "ff-vs-3way": {
    title: "Fast-forward vs 3-way merge",
    lanes: [
      { name: "main (fast-forward)", color: C.main },
      { name: "feature", color: C.feat },
      { name: "main (3-way)", color: C.main },
      { name: "feature", color: C.feat },
    ],
    dots: [[0, 0], [0, 1], [1, 2], [1, 3, "main moves here"], [2, 0], [2, 1], [2, 3], [2, 5, "merge commit"], [3, 2], [3, 4]],
    edges: [...chain(0, [0, 1]), [[0, 1], [1, 2]], ...chain(1, [2, 3]), ...chain(2, [0, 1, 3, 5]), [[2, 1], [3, 2]], ...chain(3, [2, 4]), [[3, 4], [2, 5]]],
    caption: "Top: main never moved, so merging just slides the label forward. Bottom: both sides moved, so Git creates a merge commit with two parents.",
  },
  "github-flow": {
    title: "GitHub Flow",
    lanes: [
      { name: "main", color: C.main },
      { name: "feature/a", color: C.feat },
      { name: "feature/b", color: C.rel },
    ],
    dots: [[0, 0], [0, 3, "PR #1 merged → deploy"], [0, 6, "PR #2 merged → deploy"], [1, 1], [1, 2], [2, 4], [2, 5]],
    edges: [...chain(0, [0, 3, 6]), [[0, 0], [1, 1]], ...chain(1, [1, 2]), [[1, 2], [0, 3]], [[0, 3], [2, 4]], ...chain(2, [4, 5]), [[2, 5], [0, 6]]],
    caption: "One long-lived branch (main, always deployable). Short feature branches → pull request → review → merge → deploy.",
  },
  "git-flow": {
    title: "Git Flow",
    lanes: [
      { name: "main", color: C.main },
      { name: "hotfix/*", color: C.hot },
      { name: "release/*", color: C.rel },
      { name: "develop", color: C.dev },
      { name: "feature/*", color: C.feat },
    ],
    dots: [[0, 0, "v1.0"], [3, 1], [4, 2], [4, 3], [3, 4], [2, 5], [2, 6], [0, 7, "v1.1"], [3, 7], [1, 8], [0, 9, "v1.1.1"], [3, 9]],
    edges: [[[0, 0], [3, 1]], ...chain(3, [1, 4, 7, 9]), [[3, 1], [4, 2]], ...chain(4, [2, 3]), [[4, 3], [3, 4]], [[3, 4], [2, 5]], ...chain(2, [5, 6]), [[2, 6], [0, 7]], [[2, 6], [3, 7]], ...chain(0, [0, 7, 9]), [[0, 7], [1, 8]], [[1, 8], [0, 9]], [[1, 8], [3, 9]]],
    caption: "main = released versions (tagged). develop = next release. Features branch off develop; release branches stabilise; hotfixes branch from main and merge into main AND develop.",
  },
  trunk: {
    title: "Trunk-based development",
    lanes: [
      { name: "main (trunk)", color: C.main },
      { name: "tiny branches", color: C.feat },
    ],
    dots: [[0, 0], [1, 1], [0, 2], [0, 3], [1, 4], [0, 5, "flag ON"], [0, 6], [0, 7, "v2.0"]],
    edges: [...chain(0, [0, 2, 3, 5, 6, 7]), [[0, 0], [1, 1]], [[1, 1], [0, 2]], [[0, 3], [1, 4]], [[1, 4], [0, 5]]],
    caption: "Everyone integrates into main at least daily via very short branches (hours, not weeks). Unfinished features ship dark behind feature flags; release from trunk.",
  },
  "gitlab-flow": {
    title: "GitLab Flow (environment branches)",
    lanes: [
      { name: "main", color: C.main },
      { name: "staging", color: C.env },
      { name: "production", color: C.rel },
    ],
    dots: [[0, 0], [0, 1], [1, 2, "promote"], [0, 3, "fix upstream"], [1, 4], [2, 5, "release"]],
    edges: [...chain(0, [0, 1, 3]), [[0, 1], [1, 2]], [[1, 2], [1, 4]], [[0, 3], [1, 4]], [[1, 4], [2, 5]], [[0, 0], [2, 5], "dash"]],
    caption: "Changes land on main, then are promoted downstream by merging main → staging → production. Fixes always go to main first, then flow down.",
  },
  "release-branching": {
    title: "Release branches",
    lanes: [
      { name: "main", color: C.main },
      { name: "release/1.x", color: C.rel },
      { name: "release/2.x", color: C.dev },
    ],
    dots: [[0, 0], [1, 1, "v1.0.0"], [0, 2], [0, 3, "fix"], [1, 4, "v1.0.1 (cherry-pick)"], [2, 5, "v2.0.0"], [0, 6]],
    edges: [...chain(0, [0, 2, 3, 6]), [[0, 0], [1, 1]], [[1, 1], [1, 4]], [[0, 3], [1, 4], "dash"], [[0, 3], [2, 5]]],
    caption: "Each supported version gets a branch. New work continues on main; fixes land on main and are cherry-picked (dashed) to the release branches that still need them.",
  },
  forking: {
    title: "Forking workflow",
    lanes: [
      { name: "upstream/main", color: C.main },
      { name: "your fork: main", color: C.fork },
      { name: "your fork: fix/typo", color: C.feat },
    ],
    dots: [[0, 0], [1, 1, "fork"], [0, 2], [1, 3, "sync"], [2, 4], [0, 5, "PR merged by maintainer"]],
    edges: [[[0, 0], [1, 1], "dash"], ...chain(0, [0, 2, 5]), [[0, 2], [1, 3], "dash"], [[1, 1], [1, 3]], [[1, 3], [2, 4]], [[2, 4], [0, 5], "dash"]],
    caption: "You can't push to the original (upstream). Fork it, clone your fork (origin), keep it synced from upstream, push branches to your fork, and open a cross-repo pull request.",
  },
};

export const DIAGRAM_IDS = Object.keys(DIAGRAMS);

export function StrategyDiagram({ id }: { id: string }) {
  const d = DIAGRAMS[id];
  if (!d) return null;
  const DX = 64;
  const DY = 52;
  const LEFT = 140;
  const TOP = 34;
  const maxX = Math.max(...d.dots.map((p) => p[1] as number));
  const width = d.width ?? Math.max(560, LEFT + (maxX + 1) * DX + 60);
  const height = TOP + d.lanes.length * DY + 10;
  const X = (x: number) => LEFT + x * DX;
  const Y = (l: number) => TOP + l * DY;
  return (
    <figure className="panel my-6 rounded-2xl p-4" data-testid={`diagram-${id}`}>
      <figcaption className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-[var(--violet)]">{d.title}</figcaption>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ minWidth: 560, height: "auto" }} role="img" aria-label={`${d.title} diagram. ${d.caption}`}>
          {d.lanes.map((l, i) => (
            <g key={i}>
              <line x1={LEFT - 20} x2={width - 20} y1={Y(i)} y2={Y(i)} stroke={l.color} strokeOpacity={0.15} strokeWidth={14} strokeLinecap="round" />
              <text x={8} y={Y(i) + 4} fontSize={12} fontWeight={700} fill={l.color} fontFamily="var(--font-mono), monospace">
                {l.name}
              </text>
            </g>
          ))}
          {d.edges.map(([a, b, style], i) => {
            const x1 = X(a[1]);
            const y1 = Y(a[0]);
            const x2 = X(b[1]);
            const y2 = Y(b[0]);
            const color = d.lanes[y1 === y2 ? a[0] : b[0]].color;
            const path = y1 === y2 ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} C${x1 + DX * 0.55},${y1} ${x2 - DX * 0.55},${y2} ${x2},${y2}`;
            return <path key={i} d={path} stroke={color} strokeWidth={3} fill="none" strokeDasharray={style === "dash" ? "5 5" : undefined} strokeLinecap="round" />;
          })}
          {d.dots.map((p, i) => {
            const [lane, x, label] = p as [number, number, string?];
            return (
              <g key={i}>
                <circle cx={X(x)} cy={Y(lane)} r={8} fill="var(--panel)" stroke={d.lanes[lane].color} strokeWidth={3.5} />
                {label ? (
                  <text x={X(x)} y={Y(lane) - 14} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--ink-fg)">
                    {label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">{d.caption}</p>
    </figure>
  );
}
