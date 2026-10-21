/**
 * A small, dependency-free Git simulator used by the in-browser sandbox and labs.
 * It models commits, branches, tags, HEAD, index, working tree, stash, reflog,
 * merges (fast-forward + 3-way with conflicts), rebase (incl. interactive),
 * cherry-pick, revert, reset, and a simulated remote called "origin".
 * Simplified on purpose: files are whole-string blobs; conflicts are per file.
 */

export type Tree = Record<string, string>;

export interface Commit {
  id: string;
  message: string;
  parents: string[];
  tree: Tree;
  author: string;
  time: number;
}

export type Head = { kind: "branch"; name: string } | { kind: "detached"; id: string };

export interface MergeState {
  theirs: string;
  theirsLabel: string;
  message: string;
  conflicts: string[];
  op: "merge" | "cherry-pick" | "revert" | "rebase";
}

export type TodoAction = "pick" | "squash" | "fixup" | "reword";

export interface RebaseState {
  branch: string | null;
  origHead: string;
  onto: string;
  todo: { action: TodoAction; id: string; message?: string }[];
  current?: { action: TodoAction; id: string; message?: string };
}

export interface BisectState {
  good: string[];
  bad?: string;
  origHead: Head;
}

export interface RemoteRepo {
  name: string;
  url: string;
  commits: Record<string, Commit>;
  branches: Record<string, string>;
  tags: Record<string, string>;
}

export interface Repo {
  initialized: boolean;
  commits: Record<string, Commit>;
  branches: Record<string, string>;
  tags: Record<string, { id: string; message?: string }>;
  head: Head;
  index: Tree;
  work: Tree;
  stash: { message: string; index: Tree; work: Tree; base: string | null }[];
  reflog: { id: string; msg: string }[];
  config: Record<string, string>;
  remotes: Record<string, RemoteRepo>;
  tracking: Record<string, string>;
  upstream: Record<string, string>;
  merge?: MergeState;
  rebase?: RebaseState;
  interactive?: RebaseState & { lines: string[] };
  bisect?: BisectState;
  worktrees: { path: string; branch: string }[];
  clock: number;
  user: string;
}

export interface CmdResult {
  output: string;
  ok: boolean;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function emptyRepo(): Repo {
  return {
    initialized: false,
    commits: {},
    branches: {},
    tags: {},
    head: { kind: "branch", name: "main" },
    index: {},
    work: {},
    stash: [],
    reflog: [],
    config: {},
    remotes: {},
    tracking: {},
    upstream: {},
    worktrees: [],
    clock: 0,
    user: "you",
  };
}

function hash(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x1234567;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2246822519) >>> 0;
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).slice(0, 7);
}

function makeCommit(repo: Repo, message: string, parents: string[], tree: Tree, author?: string): Commit {
  repo.clock += 1;
  let id = hash(`${message}|${parents.join(",")}|${JSON.stringify(tree)}|${repo.clock}|${author ?? repo.user}`);
  while (repo.commits[id]) id = hash(id + "x");
  const c: Commit = { id, message, parents, tree: clone(tree), author: author ?? repo.user, time: repo.clock };
  repo.commits[id] = c;
  return c;
}

export function headId(repo: Repo): string | null {
  if (repo.head.kind === "detached") return repo.head.id;
  return repo.branches[repo.head.name] ?? null;
}

export function currentBranch(repo: Repo): string | null {
  return repo.head.kind === "branch" ? repo.head.name : null;
}

export function headTree(repo: Repo): Tree {
  const id = headId(repo);
  return id ? repo.commits[id].tree : {};
}

function setHead(repo: Repo, id: string, reflogMsg: string) {
  if (repo.head.kind === "branch") repo.branches[repo.head.name] = id;
  else repo.head = { kind: "detached", id };
  repo.reflog.unshift({ id, msg: reflogMsg });
}

function moveHeadTo(repo: Repo, head: Head, reflogMsg: string) {
  repo.head = head;
  const id = headId(repo);
  if (id) repo.reflog.unshift({ id, msg: reflogMsg });
}

export function ancestors(repo: Repo, id: string): Set<string> {
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const c = stack.pop()!;
    if (seen.has(c) || !repo.commits[c]) continue;
    seen.add(c);
    stack.push(...repo.commits[c].parents);
  }
  return seen;
}

export function isAncestor(repo: Repo, a: string, b: string): boolean {
  return ancestors(repo, b).has(a);
}

export function mergeBase(repo: Repo, a: string, b: string): string | null {
  const aa = ancestors(repo, a);
  const common = [...ancestors(repo, b)].filter((x) => aa.has(x));
  const best = common.filter((c) => !common.some((o) => o !== c && ancestors(repo, o).has(c)));
  best.sort((x, y) => repo.commits[y].time - repo.commits[x].time);
  return best[0] ?? null;
}

/** Resolve a revision: HEAD, HEAD~2, main^, tag, short hash, origin/main, HEAD@{1}. */
export function resolve(repo: Repo, rev: string): string | null {
  const m = rev.match(/^(.*?)((?:[~^]\d*)*)$/);
  if (!m) return null;
  const baseName = m[1] || "HEAD";
  let id: string | null = null;
  if (baseName === "HEAD" || baseName === "@") id = headId(repo);
  else if (baseName === "ORIG_HEAD") id = repo.config["__orig_head"] || null;
  else if (repo.branches[baseName]) id = repo.branches[baseName];
  else if (repo.tags[baseName]) id = repo.tags[baseName].id;
  else if (repo.tracking[baseName]) id = repo.tracking[baseName];
  else if (/^HEAD@\{\d+\}$/.test(baseName)) id = repo.reflog[Number(baseName.slice(6, -1))]?.id ?? null;
  else if (/^[0-9a-f]{4,40}$/.test(baseName)) {
    const hits = Object.keys(repo.commits).filter((k) => k.startsWith(baseName.slice(0, 7)));
    id = hits.length === 1 ? hits[0] : null;
  }
  if (!id) return null;
  for (const op of m[2].match(/[~^]\d*/g) ?? []) {
    const n = op.length > 1 ? Number(op.slice(1)) : 1;
    if (op[0] === "~") {
      for (let i = 0; i < n; i++) {
        id = repo.commits[id!]?.parents[0] ?? null;
        if (!id) return null;
      }
    } else {
      id = repo.commits[id!]?.parents[n - 1] ?? null;
      if (!id) return null;
    }
  }
  return id;
}

function ignorePatterns(repo: Repo): RegExp[] {
  const src = repo.work[".gitignore"];
  if (!src) return [];
  return src
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((p) => {
      const dir = p.endsWith("/");
      const body = (dir ? p.slice(0, -1) : p)
        .replace(/^\//, "")
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, "[^/]*")
        .replace(/\?/g, ".");
      return new RegExp(dir ? `^(.*/)?${body}/` : `^(.*/)?${body}$`);
    });
}

export function isIgnored(repo: Repo, path: string): boolean {
  return ignorePatterns(repo).some((r) => r.test(path));
}

export interface StatusInfo {
  staged: { path: string; kind: "new" | "modified" | "deleted" }[];
  unstaged: { path: string; kind: "modified" | "deleted" }[];
  untracked: string[];
  conflicted: string[];
}

export function status(repo: Repo): StatusInfo {
  const ht = headTree(repo);
  const staged: StatusInfo["staged"] = [];
  const unstaged: StatusInfo["unstaged"] = [];
  const untracked: string[] = [];
  const conflicted = repo.merge?.conflicts ?? [];
  const all = new Set([...Object.keys(ht), ...Object.keys(repo.index), ...Object.keys(repo.work)]);
  for (const p of [...all].sort()) {
    if (conflicted.includes(p)) continue;
    const h = ht[p];
    const i = repo.index[p];
    const w = repo.work[p];
    if (i !== undefined && h === undefined) staged.push({ path: p, kind: "new" });
    else if (i === undefined && h !== undefined) staged.push({ path: p, kind: "deleted" });
    else if (i !== undefined && h !== undefined && i !== h) staged.push({ path: p, kind: "modified" });
    if (i !== undefined && w === undefined) unstaged.push({ path: p, kind: "deleted" });
    else if (i !== undefined && w !== undefined && w !== i) unstaged.push({ path: p, kind: "modified" });
    if (i === undefined && w !== undefined && !isIgnored(repo, p)) untracked.push(p);
  }
  return { staged, unstaged, untracked, conflicted };
}

export function isClean(repo: Repo): boolean {
  const s = status(repo);
  return !s.staged.length && !s.unstaged.length && !s.conflicted.length;
}

function mergeFile(
  base: string | undefined,
  ours: string | undefined,
  theirs: string | undefined,
  oursLabel: string,
  theirsLabel: string,
): { content: string | undefined; conflict: boolean } {
  if (ours === theirs) return { content: ours, conflict: false };
  if (base === ours) return { content: theirs, conflict: false };
  if (base === theirs) return { content: ours, conflict: false };
  const nl = (s: string | undefined) => (s ? (s.endsWith("\n") ? s : s + "\n") : "");
  const content = `<<<<<<< ${oursLabel}\n${nl(ours)}=======\n${nl(theirs)}>>>>>>> ${theirsLabel}\n`;
  return { content, conflict: true };
}

function mergeTrees(base: Tree, ours: Tree, theirs: Tree, oursLabel: string, theirsLabel: string) {
  const tree: Tree = {};
  const conflicts: string[] = [];
  for (const p of new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])) {
    const r = mergeFile(base[p], ours[p], theirs[p], oursLabel, theirsLabel);
    if (r.conflict) conflicts.push(p);
    if (r.content !== undefined) tree[p] = r.content;
  }
  return { tree, conflicts: conflicts.sort() };
}

/** Apply a 3-way change onto HEAD (used by merge, cherry-pick, revert, rebase). */
function applyThreeWay(repo: Repo, base: Tree, theirs: Tree, theirsLabel: string) {
  const ours = headTree(repo);
  const untracked = pickUntracked(repo);
  const r = mergeTrees(base, ours, theirs, "HEAD", theirsLabel);
  repo.work = { ...untracked, ...clone(r.tree) };
  repo.index = {};
  for (const [p, c] of Object.entries(r.tree)) if (!r.conflicts.includes(p)) repo.index[p] = c;
  for (const p of r.conflicts) if (ours[p] !== undefined) repo.index[p] = ours[p];
  return r;
}

function pickUntracked(repo: Repo): Tree {
  const s = status(repo);
  return Object.fromEntries(s.untracked.map((p) => [p, repo.work[p]]));
}

export function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q: string | null = null;
  let has = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === q) q = null;
      else if (ch === "\\" && q === '"' && i + 1 < line.length) {
        const n = line[++i];
        cur += n === "n" ? "\n" : n;
      } else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      q = ch;
      has = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur || has) out.push(cur);
      cur = "";
      has = false;
      continue;
    }
    cur += ch;
  }
  if (cur || has) out.push(cur);
  return out;
}

const ok = (output = ""): CmdResult => ({ output, ok: true });
const fail = (output: string): CmdResult => ({ output, ok: false });
export const short = (id: string | null | undefined) => (id ?? "").slice(0, 7);
const firstLine = (m: string) => m.split("\n")[0];

export function refsFor(repo: Repo, id: string): string[] {
  const out: string[] = [];
  const hb = currentBranch(repo);
  if (repo.head.kind === "detached" && repo.head.id === id) out.push("HEAD");
  for (const [b, c] of Object.entries(repo.branches)) if (c === id) out.push(b === hb ? `HEAD -> ${b}` : b);
  for (const [b, c] of Object.entries(repo.tracking)) if (c === id) out.push(b);
  for (const [t, c] of Object.entries(repo.tags)) if (c.id === id) out.push(`tag: ${t}`);
  out.sort((a, b) => (a.startsWith("HEAD") ? -1 : b.startsWith("HEAD") ? 1 : 0));
  return out;
}

/** Commits reachable from tips, newest first. */
export function reachable(repo: Repo, tips: string[]): Commit[] {
  const set = new Set<string>();
  for (const t of tips) for (const a of ancestors(repo, t)) set.add(a);
  return [...set].map((id) => repo.commits[id]).sort((a, b) => b.time - a.time);
}

export function allTips(repo: Repo): string[] {
  const h = headId(repo);
  return [
    ...Object.values(repo.branches),
    ...Object.values(repo.tracking),
    ...Object.values(repo.tags).map((t) => t.id),
    ...(h ? [h] : []),
  ].filter((x) => repo.commits[x]);
}

function lines(s: string | undefined) {
  if (s === undefined) return [];
  const l = s.split("\n");
  if (l[l.length - 1] === "") l.pop();
  return l;
}

function diffTrees(a: Tree, b: Tree): string {
  const out: string[] = [];
  for (const p of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    if (a[p] === b[p]) continue;
    out.push(`diff --git a/${p} b/${p}`);
    if (a[p] === undefined) out.push("new file", "--- /dev/null", `+++ b/${p}`);
    else if (b[p] === undefined) out.push("deleted file", `--- a/${p}`, "+++ /dev/null");
    else out.push(`--- a/${p}`, `+++ b/${p}`);
    const al = lines(a[p]);
    const bl = lines(b[p]);
    const bs = new Set(bl);
    const as = new Set(al);
    for (const l of al) out.push(bs.has(l) ? ` ${l}` : `-${l}`);
    for (const l of bl) if (!as.has(l)) out.push(`+${l}`);
  }
  return out.join("\n");
}

function logGraph(repo: Repo, commits: Commit[], oneline: boolean, graph: boolean): string {
  const out: string[] = [];
  let lanes: (string | null)[] = [];
  for (const c of commits) {
    let col = lanes.indexOf(c.id);
    if (col < 0) {
      col = lanes.indexOf(null);
      if (col < 0) {
        col = lanes.length;
        lanes.push(c.id);
      } else lanes[col] = c.id;
    }
    lanes = lanes.map((l, i) => (l === c.id && i !== col ? null : l));
    const prefix = graph ? lanes.map((l, i) => (i === col ? "*" : l ? "|" : " ")).join(" ") + " " : "";
    const pad = graph ? lanes.map((l) => (l ? "|" : " ")).join(" ") + " " : "";
    const refs = refsFor(repo, c.id);
    const refStr = refs.length ? ` (${refs.join(", ")})` : "";
    if (oneline) out.push(`${prefix}${short(c.id)}${refStr} ${firstLine(c.message)}`);
    else {
      out.push(`${prefix}commit ${c.id}${refStr}`);
      if (c.parents.length > 1) out.push(`${pad}Merge: ${c.parents.map(short).join(" ")}`);
      out.push(`${pad}Author: ${c.author}`, pad, `${pad}    ${c.message.split("\n").join(`\n${pad}    `)}`, pad);
    }
    lanes[col] = c.parents[0] ?? null;
    for (const p of c.parents.slice(1)) {
      if (!lanes.includes(p)) {
        const free = lanes.indexOf(null);
        if (free >= 0 && free > col) lanes[free] = p;
        else lanes.push(p);
      }
    }
    if (graph && c.parents.length > 1) out.push(lanes.map((l, i) => (i === col ? "|\\" : l ? "|" : " ")).join(" ").trimEnd());
    while (lanes.length && lanes[lanes.length - 1] === null) lanes.pop();
  }
  return out.map((l) => l.trimEnd()).join("\n");
}

export function makeRemote(name = "origin", url = "https://github.com/team/app.git"): RemoteRepo {
  return { name, url, commits: {}, branches: {}, tags: {} };
}

function copyCommits(from: Record<string, Commit>, to: Record<string, Commit>, tip: string) {
  const stack = [tip];
  while (stack.length) {
    const id = stack.pop()!;
    if (to[id] || !from[id]) continue;
    to[id] = clone(from[id]);
    stack.push(...from[id].parents);
  }
}

function fetchRemote(repo: Repo, name: string): string {
  const r = repo.remotes[name];
  const out: string[] = [];
  for (const [b, id] of Object.entries(r.branches)) {
    copyCommits(r.commits, repo.commits, id);
    const key = `${name}/${b}`;
    const prev = repo.tracking[key];
    if (prev !== id) {
      out.push(prev ? `   ${short(prev)}..${short(id)}  ${b} -> ${key}` : ` * [new branch]      ${b} -> ${key}`);
      repo.tracking[key] = id;
    }
  }
  for (const key of Object.keys(repo.tracking)) {
    if (key.startsWith(name + "/") && !(key.slice(name.length + 1) in r.branches)) delete repo.tracking[key];
  }
  for (const [t, id] of Object.entries(r.tags)) {
    copyCommits(r.commits, repo.commits, id);
    if (!repo.tags[t]) {
      repo.tags[t] = { id };
      out.push(` * [new tag]         ${t} -> ${t}`);
    }
  }
  for (const c of Object.values(repo.commits)) repo.clock = Math.max(repo.clock, c.time);
  return out.length ? `From ${r.url}\n${out.join("\n")}` : "";
}

/** Simulate a teammate pushing a commit straight to the remote (used by labs). "" deletes a file. */
export function teammatePush(repo: Repo, branch: string, message: string, files: Tree, author = "sam", remote = "origin", fromBranch?: string) {
  const r = repo.remotes[remote];
  if (!r) return;
  const parent = r.branches[branch] ?? (fromBranch ? r.branches[fromBranch] : undefined);
  const tree: Tree = { ...(parent ? r.commits[parent].tree : {}), ...files };
  for (const [k, v] of Object.entries(files)) if (v === "") delete tree[k];
  const c = makeCommit(repo, message, parent ? [parent] : [], tree, author);
  delete repo.commits[c.id];
  r.commits[c.id] = c;
  r.branches[branch] = c.id;
}

export const HELP = `Supported commands (simulated Git):
  git init | config | status | add | rm | mv | commit [-m] [-a] [--amend] [--allow-empty]
  git log [--oneline] [--graph] [--all] [-n N] [a..b] | diff [--staged] [rev] | show [rev]
  git branch [-a|-v|-d|-D|-m] [name] | switch [-c] <name> | checkout [-b] <name|rev> | checkout -- <file>
  git merge [--no-ff|--ff-only|--squash|--abort] <branch> | rebase <base> | rebase -i HEAD~N
  git rebase --continue|--abort|--skip | restore [--staged] <file> | reset [--soft|--mixed|--hard] <rev>
  git revert <rev> | cherry-pick <rev> | stash [push -m|-u|list|show|pop|apply|drop]
  git tag [-a] [-m] [name] | reflog | remote [-v|add] | clone <url> | fetch | pull [--rebase]
  git push [-u] [--force-with-lease] [origin <branch>] | bisect start|good|bad|reset | blame <file>
  git worktree add|list|remove
Shell helpers: ls, cat <file>, echo "text" > file, echo "more" >> file, rm <file>, touch <file>, clear, help
Tip: during a conflict, rewrite the file with echo "final text" > file (or git checkout --ours/--theirs file), then git add it.`;

export function run(repoIn: Repo, line: string): { repo: Repo; result: CmdResult } {
  const repo = clone(repoIn);
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return { repo, result: ok() };
  try {
    return { repo, result: exec(repo, trimmed) };
  } catch (e) {
    return { repo: clone(repoIn), result: fail(`error: ${(e as Error).message}`) };
  }
}

function exec(repo: Repo, line: string): CmdResult {
  if (repo.interactive) return interactiveLine(repo, line);
  const redir = line.match(/^echo\s+(?:-e\s+)?([\s\S]*?)\s*(>>?)\s*(\S+)$/);
  if (redir) {
    const text = tokenize(redir[1]).join(" ") + "\n";
    const file = redir[3];
    repo.work[file] = redir[2] === ">>" ? (repo.work[file] ?? "") + text : text;
    return ok();
  }
  const argv = tokenize(line);
  switch (argv[0]) {
    case "help":
      return ok(HELP);
    case "clear":
      return ok("__clear__");
    case "ls":
      return ok(Object.keys(repo.work).sort().join("  "));
    case "cat": {
      const f = argv[1];
      if (!f || repo.work[f] === undefined) return fail(`cat: ${f ?? ""}: No such file or directory`);
      return ok(repo.work[f].replace(/\n$/, ""));
    }
    case "touch":
      for (const f of argv.slice(1)) repo.work[f] = repo.work[f] ?? "";
      return ok();
    case "rm":
      for (const f of argv.slice(1).filter((a) => !a.startsWith("-"))) delete repo.work[f];
      return ok();
    case "echo":
      return ok(argv.slice(1).join(" "));
    case "pwd":
      return ok("/home/learner/project");
    case "git":
      return git(repo, argv.slice(1));
    default:
      return fail(`${argv[0]}: command not found (type \`help\`)`);
  }
}

function git(repo: Repo, a: string[]): CmdResult {
  const sub = a[0];
  const args = a.slice(1);
  const has = (...f: string[]) => args.some((x) => f.includes(x));
  const optVal = (...flags: string[]) => {
    for (const flag of flags) {
      const i = args.indexOf(flag);
      if (i >= 0) return args[i + 1];
    }
    return undefined;
  };

  switch (sub) {
    case undefined:
    case "help":
    case "--help":
      return ok(HELP);
    case "--version":
    case "version":
      return ok("git version 2.47.0 (Aurora simulator)");
    case "config": {
      if (has("--list", "-l")) return ok(Object.entries(repo.config).filter(([k]) => !k.startsWith("__")).map(([k, v]) => `${k}=${v}`).join("\n"));
      const pos = args.filter((x) => !x.startsWith("--"));
      if (pos.length >= 2) {
        repo.config[pos[0]] = pos.slice(1).join(" ");
        if (pos[0] === "user.name") repo.user = pos.slice(1).join(" ");
        return ok();
      }
      if (pos.length === 1) return ok(repo.config[pos[0]] ?? "");
      return fail("usage: git config [--global] <key> <value>");
    }
    case "init": {
      if (repo.initialized) return ok("Reinitialized existing Git repository in /home/learner/project/.git/");
      repo.initialized = true;
      repo.head = { kind: "branch", name: optVal("-b", "--initial-branch") ?? "main" };
      return ok("Initialized empty Git repository in /home/learner/project/.git/");
    }
    case "clone": {
      const url = args.find((x) => !x.startsWith("-")) ?? "";
      if (!url) return fail("usage: git clone <url>");
      if (repo.initialized) return fail("fatal: this sandbox already holds a repository. Use the Reset button to start fresh, then clone.");
      const remote = repo.remotes["origin"] ?? defaultRemote(url);
      remote.url = url;
      repo.remotes = { origin: remote };
      repo.initialized = true;
      fetchRemote(repo, "origin");
      const main = remote.branches["main"] ? "main" : Object.keys(remote.branches)[0];
      if (main) {
        repo.branches[main] = remote.branches[main];
        repo.upstream[main] = `origin/${main}`;
        repo.head = { kind: "branch", name: main };
        repo.index = clone(repo.commits[remote.branches[main]].tree);
        repo.work = clone(repo.index);
        repo.reflog.unshift({ id: remote.branches[main], msg: `clone: from ${url}` });
      }
      return ok(`Cloning into '${url.split("/").pop()?.replace(/\.git$/, "") || "repo"}'...\nremote: Enumerating objects... done.\n(The sandbox works inside the cloned repo.)`);
    }
  }

  if (!repo.initialized) return fail("fatal: not a git repository (or any of the parent directories): .git\nhint: run `git init` (or `git clone <url>`) first");

  switch (sub) {
    case "status":
      return ok(statusText(repo));
    case "add": {
      const targets = args.filter((x) => !x.startsWith("-"));
      const all = has("-A", "--all") || targets.includes(".");
      if (!all && !targets.length) return fail("Nothing specified, nothing added.\nhint: Maybe you wanted to say 'git add .'?");
      const paths = all
        ? [...new Set([...Object.keys(repo.work), ...Object.keys(repo.index)])]
        : targets.flatMap((t) => {
            if (!t.includes("*")) return [t];
            const re = new RegExp("^" + t.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
            return Object.keys(repo.work).filter((p) => re.test(p));
          });
      const warn: string[] = [];
      for (const p of paths) {
        if (repo.work[p] === undefined && repo.index[p] === undefined) return fail(`fatal: pathspec '${p}' did not match any files`);
        if (repo.work[p] !== undefined && repo.index[p] === undefined && isIgnored(repo, p)) {
          if (!all) return fail(`The following paths are ignored by one of your .gitignore files:\n${p}\nhint: Use -f if you really want to add them.`);
          continue;
        }
        if (repo.work[p] === undefined) delete repo.index[p];
        else repo.index[p] = repo.work[p];
        if (repo.merge) {
          repo.merge.conflicts = repo.merge.conflicts.filter((c) => c !== p);
          if (repo.work[p]?.includes("<<<<<<<")) warn.push(`warning: ${p} still contains conflict markers (<<<<<<<). Edit it before committing.`);
        }
      }
      return ok(warn.join("\n"));
    }
    case "rm": {
      for (const p of args.filter((x) => !x.startsWith("-"))) {
        if (repo.index[p] === undefined) return fail(`fatal: pathspec '${p}' did not match any files`);
        delete repo.index[p];
        if (!has("--cached")) delete repo.work[p];
      }
      return ok();
    }
    case "mv": {
      const [from, to] = args;
      if (!from || !to || repo.work[from] === undefined) return fail("fatal: bad source");
      repo.work[to] = repo.work[from];
      delete repo.work[from];
      if (repo.index[from] !== undefined) {
        repo.index[to] = repo.index[from];
        delete repo.index[from];
      }
      return ok();
    }
    case "commit":
      return commitCmd(repo, args);
    case "log": {
      const oneline = has("--oneline");
      const graph = has("--graph");
      let limit = Infinity;
      const skip = new Set<number>();
      args.forEach((x, i) => {
        if (x === "-n") {
          limit = Number(args[i + 1]);
          skip.add(i + 1);
        } else if (/^-\d+$/.test(x)) limit = Number(x.slice(1));
      });
      const revs = args.filter((x, i) => !x.startsWith("-") && !skip.has(i));
      let list: Commit[];
      if (has("--all")) list = reachable(repo, allTips(repo));
      else if (revs[0]?.includes("..")) {
        const [x, y] = revs[0].split("..");
        const xi = resolve(repo, x || "HEAD");
        const yi = resolve(repo, y || "HEAD");
        if (!xi || !yi) return fail(`fatal: bad revision '${revs[0]}'`);
        const ex = ancestors(repo, xi);
        list = reachable(repo, [yi]).filter((c) => !ex.has(c.id));
      } else {
        const id = revs[0] ? resolve(repo, revs[0]) : headId(repo);
        if (!id) return fail(revs[0] ? `fatal: bad revision '${revs[0]}'` : `fatal: your current branch '${currentBranch(repo)}' does not have any commits yet`);
        list = reachable(repo, [id]);
      }
      return ok(logGraph(repo, list.slice(0, limit), oneline, graph));
    }
    case "diff": {
      const revs = args.filter((x) => !x.startsWith("-"));
      if (revs.length && resolve(repo, revs[0].split("..")[0] || "HEAD")) {
        const [x, y] = revs[0].includes("..") ? revs[0].split("..") : [revs[0], revs[1]];
        const aTree = repo.commits[resolve(repo, x || "HEAD")!].tree;
        const bId = y ? resolve(repo, y) : null;
        if (y && !bId) return fail(`fatal: bad revision '${y}'`);
        return ok(diffTrees(aTree, bId ? repo.commits[bId].tree : repo.work));
      }
      if (has("--staged", "--cached")) return ok(diffTrees(headTree(repo), repo.index));
      const w: Tree = {};
      for (const p of Object.keys(repo.work)) if (repo.index[p] !== undefined || repo.merge?.conflicts.includes(p)) w[p] = repo.work[p];
      for (const p of Object.keys(repo.index)) if (repo.work[p] === undefined) delete w[p];
      return ok(diffTrees(repo.index, w));
    }
    case "show": {
      const rev = args.find((x) => !x.startsWith("-")) ?? "HEAD";
      const id = resolve(repo, rev);
      if (!id) return fail(`fatal: bad revision '${rev}'`);
      const c = repo.commits[id];
      const refs = refsFor(repo, id);
      const tag = repo.tags[rev]?.message ? `tag ${rev}\n\n    ${repo.tags[rev].message}\n\n` : "";
      return ok(`${tag}commit ${c.id}${refs.length ? ` (${refs.join(", ")})` : ""}\nAuthor: ${c.author}\n\n    ${c.message}\n\n${diffTrees(c.parents[0] ? repo.commits[c.parents[0]].tree : {}, c.tree)}`);
    }
    case "branch":
      return branchCmd(repo, args, has, optVal);
    case "switch":
    case "checkout":
      return switchCmd(repo, sub, args);
    case "restore": {
      const staged = has("--staged", "-S");
      const src = optVal("--source", "-s");
      const files = args.filter((x, i) => !x.startsWith("-") && args[i - 1] !== "--source" && args[i - 1] !== "-s");
      if (!files.length) return fail("fatal: you must specify path(s) to restore");
      const srcId = src ? resolve(repo, src) : null;
      if (src && !srcId) return fail(`fatal: could not resolve ${src}`);
      const srcTree = srcId ? repo.commits[srcId].tree : undefined;
      const expand = (f: string) => (f === "." ? [...new Set([...Object.keys(repo.work), ...Object.keys(repo.index)])] : [f]);
      for (const f of files.flatMap(expand)) {
        if (staged) {
          const h = (srcTree ?? headTree(repo))[f];
          if (h === undefined) delete repo.index[f];
          else repo.index[f] = h;
        } else {
          const v = srcTree ? srcTree[f] : repo.index[f];
          if (v === undefined) {
            if (!files.includes(".")) return fail(`error: pathspec '${f}' did not match any file(s) known to git`);
            continue;
          }
          repo.work[f] = v;
        }
      }
      return ok();
    }
    case "reset": {
      const mode = has("--soft") ? "soft" : has("--hard") ? "hard" : "mixed";
      const pos = args.filter((x) => !x.startsWith("-"));
      if (pos.length && !resolve(repo, pos[0]) && (repo.index[pos[0]] !== undefined || repo.work[pos[0]] !== undefined)) {
        for (const f of pos) {
          const h = headTree(repo)[f];
          if (h === undefined) delete repo.index[f];
          else repo.index[f] = h;
        }
        return ok("Unstaged changes after reset.");
      }
      const target = pos[0] ?? "HEAD";
      const id = resolve(repo, target);
      if (!id) return fail(`fatal: ambiguous argument '${target}': unknown revision or path not in the working tree.`);
      const oldHeadTree = headTree(repo);
      const oldIndex = repo.index;
      repo.config["__orig_head"] = headId(repo) ?? "";
      setHead(repo, id, `reset: moving to ${target}`);
      const tree = repo.commits[id].tree;
      if (mode !== "soft") repo.index = clone(tree);
      if (mode === "hard") {
        const untracked = Object.fromEntries(Object.entries(repo.work).filter(([p]) => oldIndex[p] === undefined && oldHeadTree[p] === undefined && tree[p] === undefined));
        repo.work = { ...untracked, ...clone(tree) };
        repo.merge = undefined;
        repo.rebase = undefined;
        return ok(`HEAD is now at ${short(id)} ${firstLine(repo.commits[id].message)}`);
      }
      return ok(mode === "mixed" && status(repo).unstaged.length ? `Unstaged changes after reset:\n${status(repo).unstaged.map((u) => `M\t${u.path}`).join("\n")}` : "");
    }
    case "revert": {
      if (has("--abort")) return abortOp(repo);
      if (has("--continue")) return commitCmd(repo, []);
      const rev = args.find((x) => !x.startsWith("-") && !/^\d+$/.test(x));
      const id = rev ? resolve(repo, rev) : null;
      if (!id) return fail(`fatal: bad revision '${rev ?? ""}'`);
      if (!isClean(repo)) return fail("error: your local changes would be overwritten by revert.\nhint: commit your changes or stash them to proceed.");
      const c = repo.commits[id];
      if (c.parents.length > 1 && !has("-m")) return fail(`error: commit ${short(id)} is a merge but no -m option was given.\nhint: use git revert -m 1 ${short(id)} to undo the merge relative to its first parent`);
      const parentTree = c.parents[0] ? repo.commits[c.parents[0]].tree : {};
      const r = applyThreeWay(repo, c.tree, parentTree, `parent of ${short(id)}`);
      const msg = `Revert "${firstLine(c.message)}"\n\nThis reverts commit ${c.id}.`;
      if (r.conflicts.length) {
        repo.merge = { theirs: c.parents[0] ?? id, theirsLabel: short(id), message: msg, conflicts: r.conflicts, op: "revert" };
        return fail(`error: could not revert ${short(id)}... ${firstLine(c.message)}\nCONFLICT (content): Merge conflict in ${r.conflicts.join(", ")}\nhint: resolve the conflicts, run "git add <file>", then "git revert --continue"`);
      }
      const nc = makeCommit(repo, msg, [headId(repo)!], r.tree);
      setHead(repo, nc.id, `revert: ${firstLine(msg)}`);
      return ok(`[${currentBranch(repo) ?? "detached HEAD"} ${short(nc.id)}] ${firstLine(msg)}`);
    }
    case "merge":
      return mergeCmd(repo, args);
    case "rebase":
      return rebaseCmd(repo, args);
    case "cherry-pick": {
      if (has("--abort")) return abortOp(repo);
      if (has("--continue")) return commitCmd(repo, []);
      const revs = args.filter((x) => !x.startsWith("-"));
      if (!revs.length) return fail("usage: git cherry-pick <commit>");
      const out: string[] = [];
      for (const rev of revs) {
        const id = resolve(repo, rev);
        if (!id) return fail(`fatal: bad revision '${rev}'`);
        if (!isClean(repo)) return fail("error: your local changes would be overwritten by cherry-pick.");
        const c = repo.commits[id];
        const r = applyThreeWay(repo, c.parents[0] ? repo.commits[c.parents[0]].tree : {}, c.tree, `${short(id)} (${firstLine(c.message)})`);
        if (r.conflicts.length) {
          repo.merge = { theirs: id, theirsLabel: short(id), message: c.message, conflicts: r.conflicts, op: "cherry-pick" };
          return fail(`${out.join("\n")}\nerror: could not apply ${short(id)}... ${firstLine(c.message)}\nCONFLICT (content): Merge conflict in ${r.conflicts.join(", ")}\nhint: fix conflicts, "git add <file>", then "git cherry-pick --continue"`.trim());
        }
        const nc = makeCommit(repo, c.message, [headId(repo)!], r.tree, c.author);
        setHead(repo, nc.id, `cherry-pick: ${firstLine(c.message)}`);
        out.push(`[${currentBranch(repo) ?? "detached HEAD"} ${short(nc.id)}] ${firstLine(c.message)}`);
      }
      return ok(out.join("\n"));
    }
    case "stash":
      return stashCmd(repo, args);
    case "tag": {
      if (has("-d")) {
        const n = args.find((x) => !x.startsWith("-"));
        if (!n || !repo.tags[n]) return fail(`error: tag '${n}' not found.`);
        delete repo.tags[n];
        return ok(`Deleted tag '${n}'`);
      }
      const msg = optVal("-m");
      const pos = args.filter((x, i) => !x.startsWith("-") && args[i - 1] !== "-m");
      if (!pos.length) return ok(Object.keys(repo.tags).sort().join("\n"));
      const [name, rev] = pos;
      if (repo.tags[name]) return fail(`fatal: tag '${name}' already exists`);
      const id = resolve(repo, rev ?? "HEAD");
      if (!id) return fail(`fatal: Failed to resolve '${rev ?? "HEAD"}' as a valid ref.`);
      repo.tags[name] = { id, message: msg };
      return ok();
    }
    case "reflog":
      return ok(repo.reflog.map((r, i) => `${short(r.id)} HEAD@{${i}}: ${r.msg}`).join("\n"));
    case "remote": {
      if (args[0] === "add") {
        const [, name, url] = args;
        if (!name || !url) return fail("usage: git remote add <name> <url>");
        if (repo.remotes[name]) return fail(`error: remote ${name} already exists.`);
        repo.remotes[name] = makeRemote(name, url);
        return ok();
      }
      if (args[0] === "remove" || args[0] === "rm") {
        delete repo.remotes[args[1]];
        return ok();
      }
      if (has("-v")) return ok(Object.values(repo.remotes).map((r) => `${r.name}\t${r.url} (fetch)\n${r.name}\t${r.url} (push)`).join("\n"));
      return ok(Object.keys(repo.remotes).join("\n"));
    }
    case "fetch": {
      const names = has("--all") ? Object.keys(repo.remotes) : [args.find((x) => !x.startsWith("-")) ?? "origin"];
      for (const n of names) if (!repo.remotes[n]) return fail(`fatal: '${n}' does not appear to be a git repository`);
      return ok(names.map((n) => fetchRemote(repo, n)).filter(Boolean).join("\n"));
    }
    case "pull":
      return pullCmd(repo, args);
    case "push":
      return pushCmd(repo, args);
    case "bisect":
      return bisectCmd(repo, args);
    case "blame": {
      const f = args.find((x) => !x.startsWith("-"));
      const h = headId(repo);
      if (!f || !h || repo.commits[h].tree[f] === undefined) return fail(`fatal: no such path '${f ?? ""}' in HEAD`);
      return ok(
        lines(repo.commits[h].tree[f])
          .map((l, i) => {
            let cur = h;
            for (;;) {
              const p = repo.commits[cur].parents[0];
              if (!p || !lines(repo.commits[p].tree[f]).includes(l)) break;
              cur = p;
            }
            return `${short(cur)} (${repo.commits[cur].author.padEnd(6)} ${String(i + 1).padStart(2)}) ${l}`;
          })
          .join("\n"),
      );
    }
    case "worktree": {
      if (args[0] === "add") {
        const rest = args.slice(1);
        const bi = rest.indexOf("-b");
        const newB = bi >= 0 ? rest[bi + 1] : undefined;
        const pos = rest.filter((x, i) => !x.startsWith("-") && !(bi >= 0 && i === bi + 1));
        const path = pos[0];
        if (!path) return fail("usage: git worktree add <path> [<branch>]  |  git worktree add -b <new-branch> <path>");
        const branch = newB ?? pos[1] ?? path.split("/").pop()!;
        if (!repo.branches[branch]) {
          const h = headId(repo);
          if (!h) return fail("fatal: make a commit first");
          repo.branches[branch] = h;
        }
        if (branch === currentBranch(repo) || repo.worktrees.some((w) => w.branch === branch)) return fail(`fatal: '${branch}' is already checked out`);
        repo.worktrees.push({ path, branch });
        return ok(`Preparing worktree (checking out '${branch}')\nHEAD is now at ${short(repo.branches[branch])}\n(In real Git this is a second folder at ${path}; the sandbox lists it with git worktree list.)`);
      }
      if (args[0] === "remove") {
        repo.worktrees = repo.worktrees.filter((w) => w.path !== args[1]);
        return ok();
      }
      return ok([`/home/learner/project  ${short(headId(repo))} [${currentBranch(repo) ?? "detached"}]`, ...repo.worktrees.map((w) => `${w.path.padEnd(22)} ${short(repo.branches[w.branch])} [${w.branch}]`)].join("\n"));
    }
    default:
      return fail(`git: '${sub}' is not supported by this simulator. Type \`help\` for the list.`);
  }
}

export function statusText(repo: Repo): string {
  const s = status(repo);
  const b = currentBranch(repo);
  const out: string[] = [b ? `On branch ${b}` : `HEAD detached at ${short(headId(repo))}`];
  if (repo.rebase) out.push(`interactive/plain rebase in progress onto ${short(repo.rebase.onto)}`);
  if (b && repo.upstream[b] && repo.tracking[repo.upstream[b]] && repo.branches[b]) {
    const up = repo.tracking[repo.upstream[b]];
    const me = repo.branches[b];
    const ua = ancestors(repo, up);
    const ma = ancestors(repo, me);
    const ahead = [...ma].filter((x) => !ua.has(x)).length;
    const behind = [...ua].filter((x) => !ma.has(x)).length;
    if (!ahead && !behind) out.push(`Your branch is up to date with '${repo.upstream[b]}'.`);
    else if (ahead && !behind) out.push(`Your branch is ahead of '${repo.upstream[b]}' by ${ahead} commit(s).\n  (use "git push" to publish your local commits)`);
    else if (!ahead && behind) out.push(`Your branch is behind '${repo.upstream[b]}' by ${behind} commit(s), and can be fast-forwarded.\n  (use "git pull" to update your local branch)`);
    else out.push(`Your branch and '${repo.upstream[b]}' have diverged,\nand have ${ahead} and ${behind} different commits each, respectively.`);
  }
  if (repo.merge) {
    const cont = repo.merge.op === "merge" ? "git commit" : `git ${repo.merge.op} --continue`;
    out.push(repo.merge.conflicts.length ? `You have unmerged paths (${repo.merge.op} in progress).\n  (fix conflicts and run "git add <file>", then "${cont}")\n  (use "git ${repo.merge.op} --abort" to give up)` : `All conflicts fixed but you are still in a ${repo.merge.op}.\n  (use "${cont}" to finish)`);
  }
  if (repo.bisect) out.push("You are currently bisecting.");
  if (!headId(repo)) out.push("\nNo commits yet");
  if (s.conflicted.length) out.push("\nUnmerged paths:", ...s.conflicted.map((p) => `\tboth modified:   ${p}`));
  if (s.staged.length) out.push("\nChanges to be committed:", ...s.staged.map((x) => `\t${x.kind === "new" ? "new file" : x.kind}:   ${x.path}`));
  if (s.unstaged.length) out.push("\nChanges not staged for commit:", ...s.unstaged.map((x) => `\t${x.kind}:   ${x.path}`));
  if (s.untracked.length) out.push("\nUntracked files:", '  (use "git add <file>..." to include in what will be committed)', ...s.untracked.map((x) => `\t${x}`));
  if (!s.staged.length && !s.unstaged.length && !s.untracked.length && !s.conflicted.length) out.push("nothing to commit, working tree clean");
  return out.join("\n");
}

function branchCmd(repo: Repo, args: string[], has: (...f: string[]) => boolean, optVal: (...f: string[]) => string | undefined): CmdResult {
  if (has("-d", "-D", "--delete")) {
    const name = args.find((x) => !x.startsWith("-"));
    if (!name || !repo.branches[name]) return fail(`error: branch '${name ?? ""}' not found.`);
    if (name === currentBranch(repo)) return fail(`error: Cannot delete branch '${name}' checked out`);
    const h = headId(repo);
    if (!has("-D") && h && !isAncestor(repo, repo.branches[name], h)) return fail(`error: The branch '${name}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${name}'.`);
    const id = repo.branches[name];
    delete repo.branches[name];
    delete repo.upstream[name];
    return ok(`Deleted branch ${name} (was ${short(id)}).`);
  }
  if (has("-m", "-M")) {
    const pos = args.filter((x) => !x.startsWith("-"));
    const [from, to] = pos.length === 2 ? pos : [currentBranch(repo) ?? "", pos[0]];
    if (!to) return fail("usage: git branch -m [old] <new>");
    if (repo.branches[from]) repo.branches[to] = repo.branches[from];
    delete repo.branches[from];
    if (currentBranch(repo) === from) repo.head = { kind: "branch", name: to };
    return ok();
  }
  if (has("-u", "--set-upstream-to")) {
    const up = optVal("-u", "--set-upstream-to");
    const b = currentBranch(repo);
    if (!b || !up || !repo.tracking[up]) return fail(`error: the requested upstream branch '${up ?? ""}' does not exist (try git fetch)`);
    repo.upstream[b] = up;
    return ok(`branch '${b}' set up to track '${up}'.`);
  }
  const pos = args.filter((x) => !x.startsWith("-"));
  if (!pos.length) {
    const cur = currentBranch(repo);
    if (has("-v", "-vv"))
      return ok(Object.keys(repo.branches).sort().map((b) => `${b === cur ? "*" : " "} ${b} ${short(repo.branches[b])}${repo.upstream[b] ? ` [${repo.upstream[b]}]` : ""} ${firstLine(repo.commits[repo.branches[b]].message)}`).join("\n"));
    const list = Object.keys(repo.branches).sort().map((b) => (b === cur ? `* ${b}` : `  ${b}`));
    if (repo.head.kind === "detached") list.unshift(`* (HEAD detached at ${short(repo.head.id)})`);
    const rem = Object.keys(repo.tracking).sort().map((b) => `  remotes/${b}`);
    if (has("-r")) return ok(rem.join("\n"));
    if (has("-a", "--all")) return ok([...list, ...rem].join("\n"));
    return ok(list.join("\n"));
  }
  const [name, start] = pos;
  if (repo.branches[name]) return fail(`fatal: a branch named '${name}' already exists`);
  if (!/^[\w./-]+$/.test(name) || name.endsWith("/") || name.includes("..")) return fail(`fatal: '${name}' is not a valid branch name`);
  const id = start ? resolve(repo, start) : headId(repo);
  if (!id) return fail(start ? `fatal: not a valid object name: '${start}'` : "fatal: not a valid object name: 'HEAD' (make your first commit before creating branches)");
  repo.branches[name] = id;
  return ok();
}

function commitCmd(repo: Repo, args: string[]): CmdResult {
  const msgs: string[] = [];
  for (let i = 0; i < args.length; i++) if (args[i] === "-m" || args[i] === "-am") msgs.push(args[i + 1] ?? "");
  const amend = args.includes("--amend");
  const all = args.some((x) => x === "-a" || x === "-am" || x === "--all");
  if (all) {
    for (const p of Object.keys(repo.index)) {
      if (repo.work[p] === undefined) delete repo.index[p];
      else repo.index[p] = repo.work[p];
    }
  }
  if (repo.merge?.conflicts.length) return fail(`error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add <file>'\n${repo.merge.conflicts.map((c) => `U\t${c}`).join("\n")}`);
  const parentId = headId(repo);
  if (repo.rebase) {
    repo.merge = undefined;
    return continueRebase(repo, false);
  }
  if (amend) {
    if (!parentId) return fail("fatal: You have nothing to amend.");
    const old = repo.commits[parentId];
    const msg = msgs.length ? msgs.join("\n\n") : old.message;
    const nc = makeCommit(repo, msg, old.parents, repo.index);
    setHead(repo, nc.id, `commit (amend): ${firstLine(msg)}`);
    return ok(`[${currentBranch(repo) ?? "detached HEAD"} ${short(nc.id)}] ${firstLine(msg)}\n(amended: replaced ${short(parentId)} with a new commit)`);
  }
  if (repo.merge) {
    const m = repo.merge;
    const parents = m.op === "merge" ? [parentId!, m.theirs] : [parentId!];
    const msg = msgs.length ? msgs.join("\n\n") : m.message;
    const nc = makeCommit(repo, msg, parents, repo.index);
    setHead(repo, nc.id, `commit (${m.op}): ${firstLine(msg)}`);
    repo.merge = undefined;
    return ok(`[${currentBranch(repo) ?? "detached HEAD"} ${short(nc.id)}] ${firstLine(msg)}`);
  }
  const same = sameTree(headTree(repo), repo.index);
  if (same && !args.includes("--allow-empty")) {
    const s = status(repo);
    return fail(
      s.unstaged.length || s.untracked.length
        ? `On branch ${currentBranch(repo) ?? "HEAD"}\nnothing added to commit but untracked or modified files are present\nhint: stage them first with git add <file> (or git add .)`
        : "nothing to commit, working tree clean",
    );
  }
  if (!msgs.length || !msgs[0].trim()) return fail('error: please write a message: git commit -m "what you changed" (the simulator has no text editor)');
  const msg = msgs.join("\n\n");
  const nc = makeCommit(repo, msg, parentId ? [parentId] : [], repo.index);
  setHead(repo, nc.id, `commit${parentId ? "" : " (initial)"}: ${firstLine(msg)}`);
  const n = [...new Set([...Object.keys(parentId ? repo.commits[parentId].tree : {}), ...Object.keys(nc.tree)])].filter((p) => (parentId ? repo.commits[parentId].tree[p] : undefined) !== nc.tree[p]).length;
  return ok(`[${currentBranch(repo) ?? "detached HEAD"}${parentId ? "" : " (root-commit)"} ${short(nc.id)}] ${firstLine(msg)}\n ${n} file${n === 1 ? "" : "s"} changed`);
}

function sameTree(a: Tree, b: Tree) {
  return JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
}

function switchCmd(repo: Repo, sub: string, args: string[]): CmdResult {
  const dd = args.indexOf("--");
  const oursTheirs = args.includes("--ours") || args.includes("--theirs");
  if (sub === "checkout" && (dd >= 0 || oursTheirs)) {
    const files = dd >= 0 ? args.slice(dd + 1) : args.filter((x) => !x.startsWith("-"));
    const rev = dd > 0 ? args.slice(0, dd).find((x) => !x.startsWith("-")) : undefined;
    for (const f of files) {
      if (oursTheirs) {
        const m = repo.merge;
        if (!m) return fail("error: --ours/--theirs only work while resolving a conflict");
        const v = args.includes("--ours") ? headTree(repo)[f] : repo.commits[m.theirs].tree[f];
        if (v === undefined) delete repo.work[f];
        else repo.work[f] = v;
        continue;
      }
      const srcId = rev ? resolve(repo, rev) : null;
      if (rev && !srcId) return fail(`error: pathspec '${rev}' did not match`);
      const src = srcId ? repo.commits[srcId].tree : repo.index;
      if (src[f] === undefined) return fail(`error: pathspec '${f}' did not match any file(s) known to git`);
      repo.work[f] = src[f];
      if (rev) repo.index[f] = src[f];
    }
    return ok(oursTheirs ? `Took the ${args.includes("--ours") ? "ours (HEAD)" : "theirs"} version. Now run git add ${files.join(" ")}` : "");
  }
  const create = args.some((x) => ["-c", "-b", "-C", "-B", "--create"].includes(x));
  const force = args.includes("-B") || args.includes("-C");
  const detach = args.includes("--detach");
  const pos = args.filter((x) => !x.startsWith("-") || x === "-");
  if (pos[0] === "-") {
    const prev = repo.reflog.find((r) => r.msg.startsWith("checkout: moving from"))?.msg.match(/moving from (\S+) to/)?.[1];
    if (!prev) return fail("error: no previous branch to switch back to");
    pos[0] = prev;
  }
  const name = pos[0];
  if (!name) return fail(`usage: git ${sub} ${sub === "switch" ? "[-c]" : "[-b]"} <branch>`);
  if (repo.merge || repo.rebase) return fail(`error: you are in the middle of a ${repo.merge?.op ?? "rebase"}. Finish it (resolve, git add, continue/commit) or abort it first.`);
  const from = currentBranch(repo) ?? short(headId(repo));
  const dirtyMsg = `error: Your local changes would be overwritten by ${sub}.\nPlease commit your changes or stash them before you switch branches.`;
  if (create) {
    if (repo.branches[name] && !force) return fail(`fatal: a branch named '${name}' already exists`);
    if (!/^[\w./-]+$/.test(name)) return fail(`fatal: '${name}' is not a valid branch name`);
    const start = pos[1] ? resolve(repo, pos[1]) : headId(repo);
    if (pos[1] && !start) return fail(`fatal: '${pos[1]}' is not a commit and a branch '${name}' cannot be created from it`);
    if (start) {
      if (!checkoutTree(repo, repo.commits[start].tree)) return fail(dirtyMsg);
      repo.branches[name] = start;
      if (pos[1] && repo.tracking[pos[1]]) repo.upstream[name] = pos[1];
      moveHeadTo(repo, { kind: "branch", name }, `checkout: moving from ${from} to ${name}`);
    } else repo.head = { kind: "branch", name };
    return ok(`Switched to a new branch '${name}'`);
  }
  if (repo.branches[name] && !detach) {
    if (name === currentBranch(repo)) return ok(`Already on '${name}'`);
    if (!checkoutTree(repo, repo.commits[repo.branches[name]].tree)) return fail(dirtyMsg);
    moveHeadTo(repo, { kind: "branch", name }, `checkout: moving from ${from} to ${name}`);
    return ok(`Switched to branch '${name}'`);
  }
  if (!repo.branches[name] && repo.tracking[`origin/${name}`]) {
    const id = repo.tracking[`origin/${name}`];
    if (!checkoutTree(repo, repo.commits[id].tree)) return fail(dirtyMsg);
    repo.branches[name] = id;
    repo.upstream[name] = `origin/${name}`;
    moveHeadTo(repo, { kind: "branch", name }, `checkout: moving from ${from} to ${name}`);
    return ok(`branch '${name}' set up to track 'origin/${name}'.\nSwitched to a new branch '${name}'`);
  }
  const id = resolve(repo, name);
  if (!id) return fail(sub === "switch" ? `fatal: invalid reference: ${name}\nhint: create it with git switch -c ${name}` : `error: pathspec '${name}' did not match any file(s) known to git\nhint: create a branch with git checkout -b ${name}`);
  if (sub === "switch" && !detach) return fail(`fatal: a branch is expected, got '${name}'\nhint: to look at an old commit use git switch --detach ${name}`);
  if (!checkoutTree(repo, repo.commits[id].tree)) return fail(dirtyMsg);
  moveHeadTo(repo, { kind: "detached", id }, `checkout: moving from ${from} to ${name}`);
  return ok(`Note: switching to '${name}'.\nYou are in 'detached HEAD' state: you can look around and experiment.\nTo keep commits you make here, create a branch: git switch -c <new-branch>\nHEAD is now at ${short(id)} ${firstLine(repo.commits[id].message)}`);
}

/** Move work+index to a target tree, carrying uncommitted changes when they don't collide. */
function checkoutTree(repo: Repo, target: Tree): boolean {
  const ht = headTree(repo);
  const s = status(repo);
  const dirty = [...s.staged.map((x) => x.path), ...s.unstaged.map((x) => x.path)];
  for (const p of dirty) if ((target[p] ?? null) !== (ht[p] ?? null)) return false;
  for (const p of s.untracked) if (target[p] !== undefined && target[p] !== repo.work[p]) return false;
  const newIndex: Tree = clone(target);
  const newWork: Tree = clone(target);
  for (const p of dirty) {
    if (repo.index[p] === undefined) delete newIndex[p];
    else newIndex[p] = repo.index[p];
    if (repo.work[p] === undefined) delete newWork[p];
    else newWork[p] = repo.work[p];
  }
  for (const p of Object.keys(repo.work)) if (repo.index[p] === undefined && ht[p] === undefined) newWork[p] = repo.work[p];
  repo.index = newIndex;
  repo.work = newWork;
  return true;
}

function mergeCmd(repo: Repo, args: string[]): CmdResult {
  if (args.includes("--abort")) return abortOp(repo);
  if (args.includes("--continue")) return commitCmd(repo, []);
  const noff = args.includes("--no-ff");
  const ffOnly = args.includes("--ff-only");
  const squash = args.includes("--squash");
  const mi = args.indexOf("-m");
  const msg = mi >= 0 ? args[mi + 1] : undefined;
  const name = args.filter((x, i) => !x.startsWith("-") && args[i - 1] !== "-m")[0];
  if (!name) return fail("usage: git merge <branch>");
  if (repo.merge || repo.rebase) return fail("error: Merging is not possible because you have unmerged files / an operation in progress.");
  const theirs = resolve(repo, name);
  if (!theirs) return fail(`merge: ${name} - not something we can merge`);
  const ours = headId(repo);
  if (!ours) return fail("fatal: no commits yet on this branch");
  if (!isClean(repo)) return fail("error: Your local changes would be overwritten by merge.\nPlease commit your changes or stash them before you merge.");
  if (isAncestor(repo, theirs, ours)) return ok("Already up to date.");
  repo.config["__orig_head"] = ours;
  if (isAncestor(repo, ours, theirs) && !noff && !squash) {
    checkoutTree(repo, repo.commits[theirs].tree);
    setHead(repo, theirs, `merge ${name}: Fast-forward`);
    return ok(`Updating ${short(ours)}..${short(theirs)}\nFast-forward\n(no merge commit needed: ${currentBranch(repo) ?? "HEAD"} just moved forward to ${short(theirs)})`);
  }
  if (ffOnly) return fail("fatal: Not possible to fast-forward, aborting.");
  const base = mergeBase(repo, ours, theirs);
  const r = applyThreeWay(repo, base ? repo.commits[base].tree : {}, repo.commits[theirs].tree, name);
  const cur = currentBranch(repo);
  const message = msg ?? `Merge branch '${name}'${cur && cur !== "main" && cur !== "master" ? ` into ${cur}` : ""}`;
  if (squash) {
    if (r.conflicts.length) {
      repo.merge = { theirs, theirsLabel: name, message: `Squashed commit of '${name}'`, conflicts: r.conflicts, op: "cherry-pick" };
      return fail(`CONFLICT (content): Merge conflict in ${r.conflicts.join(", ")}\nSquash commit -- not updating HEAD`);
    }
    return ok('Squash commit -- not updating HEAD\n(all changes are staged; finish with git commit -m "...")');
  }
  if (r.conflicts.length) {
    repo.merge = { theirs, theirsLabel: name, message, conflicts: r.conflicts, op: "merge" };
    return fail(`${r.conflicts.map((c) => `Auto-merging ${c}\nCONFLICT (content): Merge conflict in ${c}`).join("\n")}\nAutomatic merge failed; fix conflicts and then commit the result.\nhint: cat the file, rewrite it without the <<<<<<< ======= >>>>>>> markers, then git add + git commit`);
  }
  const nc = makeCommit(repo, message, [ours, theirs], r.tree);
  setHead(repo, nc.id, `merge ${name}: Merge made by the 'ort' strategy.`);
  return ok(`Merge made by the 'ort' strategy (3-way merge, base ${short(base)}).\n[${cur ?? "HEAD"} ${short(nc.id)}] ${message}`);
}

function abortOp(repo: Repo): CmdResult {
  if (repo.rebase) {
    const rb = repo.rebase;
    repo.merge = undefined;
    repo.rebase = undefined;
    if (rb.branch) {
      repo.branches[rb.branch] = rb.origHead;
      repo.head = { kind: "branch", name: rb.branch };
    } else repo.head = { kind: "detached", id: rb.origHead };
    repo.index = clone(repo.commits[rb.origHead].tree);
    repo.work = clone(repo.index);
    repo.reflog.unshift({ id: rb.origHead, msg: "rebase (abort)" });
    repo.config["__last_abort"] = "rebase";
    return ok("Rebase aborted. You are back where you started.");
  }
  if (!repo.merge) return fail("fatal: There is no merge, cherry-pick, revert, or rebase in progress.");
  const op = repo.merge.op;
  repo.config["__last_abort"] = op;
  repo.merge = undefined;
  repo.index = clone(headTree(repo));
  repo.work = clone(repo.index);
  return ok(`${op} aborted. Working tree restored to HEAD.`);
}

function commitsToReplay(repo: Repo, upstream: string, tip: string): string[] {
  const ex = ancestors(repo, upstream);
  const list: string[] = [];
  let cur: string | undefined = tip;
  while (cur && !ex.has(cur)) {
    const c: Commit = repo.commits[cur];
    if (c.parents.length <= 1) list.push(cur);
    cur = c.parents[0];
  }
  return list.reverse();
}

function rebaseCmd(repo: Repo, args: string[]): CmdResult {
  if (args.includes("--abort")) return abortOp(repo);
  if (args.includes("--continue")) {
    if (!repo.rebase) return fail("fatal: No rebase in progress?");
    if (repo.merge?.conflicts.length) return fail(`error: resolve and \`git add\` the conflicted files first: ${repo.merge.conflicts.join(", ")}`);
    repo.merge = undefined;
    return continueRebase(repo, false);
  }
  if (args.includes("--skip")) {
    if (!repo.rebase) return fail("fatal: No rebase in progress?");
    repo.merge = undefined;
    repo.index = clone(headTree(repo));
    repo.work = clone(repo.index);
    repo.rebase.current = undefined;
    return continueRebase(repo, true);
  }
  if (repo.rebase || repo.merge) return fail("fatal: a merge or rebase is already in progress");
  const interactive = args.includes("-i") || args.includes("--interactive");
  const ontoIdx = args.indexOf("--onto");
  const pos = args.filter((x, i) => !x.startsWith("-") && !(ontoIdx >= 0 && i === ontoIdx + 1));
  let upstreamName = pos[0];
  const b = currentBranch(repo);
  if (!upstreamName) {
    if (b && repo.upstream[b]) upstreamName = repo.upstream[b];
    else return fail("usage: git rebase <base-branch>   or   git rebase -i HEAD~N");
  }
  const upstream = resolve(repo, upstreamName);
  if (!upstream) return fail(`fatal: invalid upstream '${upstreamName}'`);
  const tip = headId(repo);
  if (!tip) return fail("fatal: no commits yet");
  if (!isClean(repo)) return fail("error: cannot rebase: You have unstaged changes.\nerror: Please commit or stash them.");
  const onto = ontoIdx >= 0 ? resolve(repo, args[ontoIdx + 1]) : upstream;
  if (!onto) return fail("fatal: invalid --onto target");
  const todoIds = commitsToReplay(repo, upstream, tip);
  if (!interactive && ontoIdx < 0 && isAncestor(repo, upstream, tip)) return ok(`Current branch ${b ?? "HEAD"} is up to date.`);
  repo.config["__orig_head"] = tip;
  const rb: RebaseState = { branch: b, origHead: tip, onto, todo: todoIds.map((id) => ({ action: "pick", id })) };
  if (interactive) {
    if (!todoIds.length) return ok("Nothing to rebase.");
    repo.interactive = { ...rb, lines: [] };
    return ok(
      `Interactive rebase: ${todoIds.length} commit(s) onto ${short(onto)}. Current plan (oldest first):\n` +
        todoIds.map((id) => `  pick ${short(id)} ${firstLine(repo.commits[id].message)}`).join("\n") +
        `\n\nType your NEW plan one line at a time, oldest first:\n  pick <hash> | squash <hash> | fixup <hash> | drop <hash> | reword <hash> "new message"\nThen type \`save\` to run it, \`show\` to review, or \`abort\` to cancel. (\`keep\` = run the plan unchanged)`,
    );
  }
  repo.rebase = rb;
  checkoutTree(repo, repo.commits[onto].tree);
  repo.head = { kind: "detached", id: onto };
  return continueRebase(repo, false);
}

function interactiveLine(repo: Repo, line: string): CmdResult {
  const ir = repo.interactive!;
  const argv = tokenize(line);
  const cmd = argv[0];
  if (cmd === "abort" || line.trim() === "git rebase --abort") {
    repo.interactive = undefined;
    return ok("Interactive rebase cancelled. Nothing changed.");
  }
  if (cmd === "keep") {
    ir.lines = ir.todo.map((t) => `pick ${t.id}`);
    return interactiveLine(repo, "save");
  }
  if (cmd === "show" || cmd === "plan") return ok(ir.lines.length ? ir.lines.join("\n") : "(plan is empty — add lines like `pick abc1234`)");
  if (cmd === "save" || cmd === "done" || cmd === ":wq") {
    if (!ir.lines.length) return fail("Plan is empty. Add pick/squash/fixup lines first (or `abort`).");
    const map: Record<string, TodoAction> = { p: "pick", pick: "pick", s: "squash", squash: "squash", f: "fixup", fixup: "fixup", r: "reword", reword: "reword" };
    const todo: RebaseState["todo"] = [];
    for (const l of ir.lines) {
      const [act, h, ...rest] = tokenize(l);
      if (act === "drop" || act === "d") continue;
      const id = ir.todo.find((t) => t.id.startsWith(h.slice(0, 7)))!.id;
      todo.push({ action: map[act], id, message: rest.join(" ") || undefined });
    }
    if (todo.length && todo[0].action !== "pick" && todo[0].action !== "reword") return fail("error: cannot 'squash'/'fixup' without a previous commit. Type `abort` and start the plan with a pick line.");
    repo.interactive = undefined;
    repo.rebase = { branch: ir.branch, origHead: ir.origHead, onto: ir.onto, todo };
    checkoutTree(repo, repo.commits[ir.onto].tree);
    repo.head = { kind: "detached", id: ir.onto };
    return continueRebase(repo, false);
  }
  if (["pick", "p", "squash", "s", "fixup", "f", "drop", "d", "reword", "r"].includes(cmd)) {
    const h = argv[1];
    if (!h || !ir.todo.some((t) => t.id.startsWith(h.slice(0, 7)) && h.length >= 4)) return fail(`'${h ?? ""}' is not in this rebase. Commits: ${ir.todo.map((t) => short(t.id)).join(", ")}`);
    ir.lines.push(line.trim());
    return ok(`plan has ${ir.lines.length} line(s). Add more, \`show\`, or \`save\`.`);
  }
  return fail("You are editing an interactive-rebase plan: use pick/squash/fixup/drop/reword <hash>, then `save` (or `abort`).");
}

function continueRebase(repo: Repo, skipped: boolean): CmdResult {
  const rb = repo.rebase!;
  const out: string[] = [];
  if (rb.current && !skipped) {
    finishStep(repo, rb.current, repo.commits[rb.current.id], repo.index);
    rb.current = undefined;
  }
  while (rb.todo.length) {
    const step = rb.todo.shift()!;
    const c = repo.commits[step.id];
    const r = applyThreeWay(repo, c.parents[0] ? repo.commits[c.parents[0]].tree : {}, c.tree, `${short(c.id)} (${firstLine(c.message)})`);
    if (r.conflicts.length) {
      rb.current = step;
      repo.merge = { theirs: c.id, theirsLabel: short(c.id), message: c.message, conflicts: r.conflicts, op: "rebase" };
      return fail(`${out.join("\n")}\nerror: could not apply ${short(c.id)}... ${firstLine(c.message)}\nCONFLICT (content): Merge conflict in ${r.conflicts.join(", ")}\nhint: Resolve the conflict, "git add <file>", then "git rebase --continue".\nhint: To give up and go back, run "git rebase --abort".`.trim());
    }
    finishStep(repo, step, c, r.tree);
    out.push(`Applied ${short(c.id)} (${step.action}) ${firstLine(c.message)}`);
  }
  const newTip = headId(repo)!;
  repo.rebase = undefined;
  if (rb.branch) {
    repo.branches[rb.branch] = newTip;
    repo.head = { kind: "branch", name: rb.branch };
  }
  repo.reflog.unshift({ id: newTip, msg: `rebase (finish): returning to ${rb.branch ? `refs/heads/${rb.branch}` : "HEAD"}` });
  out.push(`Successfully rebased and updated ${rb.branch ? `refs/heads/${rb.branch}` : "HEAD"}.`);
  return ok(out.join("\n"));
}

function finishStep(repo: Repo, step: RebaseState["todo"][number], orig: Commit, tree: Tree) {
  const h = headId(repo)!;
  if (step.action === "squash" || step.action === "fixup") {
    const prev = repo.commits[h];
    const msg = step.action === "squash" ? `${prev.message}\n\n${orig.message}` : prev.message;
    const nc = makeCommit(repo, msg, prev.parents, tree, prev.author);
    repo.head = { kind: "detached", id: nc.id };
    repo.reflog.unshift({ id: nc.id, msg: `rebase (${step.action}): ${firstLine(msg)}` });
    return;
  }
  if (sameTree(repo.commits[h].tree, tree) && step.action === "pick") return; // already applied upstream
  const msg = step.action === "reword" && step.message ? step.message : orig.message;
  const nc = makeCommit(repo, msg, [h], tree, orig.author);
  repo.head = { kind: "detached", id: nc.id };
  repo.reflog.unshift({ id: nc.id, msg: `rebase (${step.action}): ${firstLine(msg)}` });
}

function stashCmd(repo: Repo, args: string[]): CmdResult {
  const sub = args[0] && !args[0].startsWith("-") ? args[0] : "push";
  const h = headId(repo);
  if (sub === "push" || sub === "save") {
    const s = status(repo);
    const withUntracked = args.includes("-u") || args.includes("--include-untracked");
    if (!s.staged.length && !s.unstaged.length && !(withUntracked && s.untracked.length)) return ok("No local changes to save");
    if (!h) return fail("You do not have the initial commit yet");
    const mi = args.indexOf("-m");
    const message = mi >= 0 ? `On ${currentBranch(repo) ?? "HEAD"}: ${args[mi + 1]}` : `WIP on ${currentBranch(repo) ?? "HEAD"}: ${short(h)} ${firstLine(repo.commits[h].message)}`;
    const work = clone(repo.work);
    if (!withUntracked) for (const p of s.untracked) delete work[p];
    for (const p of Object.keys(work)) if (isIgnored(repo, p) && repo.index[p] === undefined) delete work[p];
    repo.stash.unshift({ message, index: clone(repo.index), work, base: h });
    const ht = headTree(repo);
    const keep = Object.fromEntries(Object.entries(repo.work).filter(([p]) => repo.index[p] === undefined && ht[p] === undefined && (!withUntracked || isIgnored(repo, p))));
    repo.index = clone(ht);
    repo.work = { ...keep, ...clone(ht) };
    return ok(`Saved working directory and index state ${message}`);
  }
  if (sub === "list") return ok(repo.stash.map((s, i) => `stash@{${i}}: ${s.message}`).join("\n"));
  const ref = args[1]?.match(/stash@\{(\d+)\}/)?.[1] ?? (args[1] && /^\d+$/.test(args[1]) ? args[1] : undefined);
  const n = ref ? Number(ref) : 0;
  const entry = repo.stash[n];
  if (sub === "clear") {
    repo.stash = [];
    return ok();
  }
  if (!entry) return fail("error: No stash entries found.");
  if (sub === "drop") {
    repo.stash.splice(n, 1);
    return ok(`Dropped stash@{${n}}`);
  }
  if (sub === "show") return ok(diffTrees(entry.base ? repo.commits[entry.base].tree : {}, entry.work));
  if (sub === "pop" || sub === "apply") {
    const base = entry.base ? repo.commits[entry.base].tree : {};
    const ht = headTree(repo);
    const current = { ...ht, ...repo.work };
    const r = mergeTrees(base, current, entry.work, "Updated upstream", "Stashed changes");
    repo.work = r.tree;
    for (const [p, v] of Object.entries(entry.index)) if (base[p] !== v && !r.conflicts.includes(p)) repo.index[p] = v;
    if (r.conflicts.length) return fail(`CONFLICT (content): Merge conflict in ${r.conflicts.join(", ")}\nThe stash entry is kept in case you need it again.`);
    if (sub === "pop") repo.stash.splice(n, 1);
    return ok(`${statusText(repo)}${sub === "pop" ? `\nDropped stash@{${n}}` : ""}`);
  }
  return fail(`unknown stash subcommand '${sub}'`);
}

function pullCmd(repo: Repo, args: string[]): CmdResult {
  const b = currentBranch(repo);
  if (!b) return fail("You are not currently on a branch.");
  const pos = args.filter((x) => !x.startsWith("-"));
  const remote = pos[0] ?? (repo.upstream[b]?.split("/")[0] || "origin");
  if (!repo.remotes[remote]) return fail(`fatal: '${remote}' does not appear to be a git repository`);
  const branch = pos[1] ?? (repo.upstream[b] ? repo.upstream[b].split("/").slice(1).join("/") : undefined);
  if (!branch) return fail(`There is no tracking information for the current branch.\nhint: git pull origin ${b}   or   git branch -u origin/${b}`);
  const fetched = fetchRemote(repo, remote);
  const up = `${remote}/${branch}`;
  if (!repo.tracking[up]) return fail(`${fetched}\nfatal: couldn't find remote ref ${branch}`.trim());
  if (!repo.branches[b]) {
    repo.branches[b] = repo.tracking[up];
    repo.index = clone(repo.commits[repo.tracking[up]].tree);
    repo.work = { ...repo.work, ...clone(repo.index) };
    return ok(fetched);
  }
  const rebase = args.includes("--rebase") || args.includes("-r") || repo.config["pull.rebase"] === "true";
  const res = rebase ? rebaseCmd(repo, [up]) : mergeCmd(repo, args.includes("--ff-only") ? ["--ff-only", up] : ["-m", `Merge branch '${branch}' of ${repo.remotes[remote].url}`, up]);
  return { ok: res.ok, output: [fetched, res.output].filter(Boolean).join("\n") };
}

function pushCmd(repo: Repo, args: string[]): CmdResult {
  const setUp = args.includes("-u") || args.includes("--set-upstream");
  const force = args.includes("--force") || args.includes("-f");
  const lease = args.some((x) => x.startsWith("--force-with-lease"));
  const pos = args.filter((x) => !x.startsWith("-"));
  const b = currentBranch(repo);
  const remoteName = pos[0] ?? (b && repo.upstream[b]?.split("/")[0]) ?? "origin";
  const r = repo.remotes[remoteName];
  if (!r) return fail(`fatal: '${remoteName}' does not appear to be a git repository\nhint: add one with git remote add origin <url>`);
  if (args.includes("--tags")) {
    const fresh = Object.keys(repo.tags).filter((t) => !r.tags[t]);
    for (const t of Object.keys(repo.tags)) {
      copyCommits(repo.commits, r.commits, repo.tags[t].id);
      r.tags[t] = repo.tags[t].id;
    }
    return ok(fresh.length ? `To ${r.url}\n${fresh.map((t) => ` * [new tag]         ${t} -> ${t}`).join("\n")}` : "Everything up-to-date");
  }
  if (args.includes("--delete") || args.includes("-d")) {
    const del = pos[1];
    if (!del || !r.branches[del]) return fail(`error: unable to delete '${del ?? ""}': remote ref does not exist`);
    delete r.branches[del];
    delete repo.tracking[`${remoteName}/${del}`];
    return ok(`To ${r.url}\n - [deleted]         ${del}`);
  }
  let refspec = pos[1];
  if (!refspec) {
    if (!b) return fail("fatal: You are not currently on a branch.");
    if (!repo.upstream[b] && !setUp) return fail(`fatal: The current branch ${b} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push -u origin ${b}`);
    refspec = repo.upstream[b] ? repo.upstream[b].split("/").slice(1).join("/") : b;
    if (!repo.upstream[b]) refspec = b;
    if (refspec !== b) refspec = `${b}:${refspec}`;
  }
  if (refspec.startsWith(":")) return pushCmd(repo, ["--delete", remoteName, refspec.slice(1)]);
  if (repo.tags[refspec] && !repo.branches[refspec]) {
    copyCommits(repo.commits, r.commits, repo.tags[refspec].id);
    r.tags[refspec] = repo.tags[refspec].id;
    return ok(`To ${r.url}\n * [new tag]         ${refspec} -> ${refspec}`);
  }
  const [src, dst0] = refspec.split(":");
  const dst = dst0 ?? src;
  const id = resolve(repo, src);
  if (!id) return fail(`error: src refspec ${src} does not match any\nhint: make a commit first`);
  const remoteTip = r.branches[dst];
  if (remoteTip === id) {
    if (setUp && b) repo.upstream[b] = `${remoteName}/${dst}`;
    return ok("Everything up-to-date");
  }
  let forced = false;
  if (remoteTip) {
    const ff = repo.commits[remoteTip] !== undefined && isAncestor(repo, remoteTip, id);
    if (!ff) {
      if (lease) {
        if (repo.tracking[`${remoteName}/${dst}`] !== remoteTip) return fail(`To ${r.url}\n ! [rejected]        ${src} -> ${dst} (stale info)\nerror: --force-with-lease refused: someone pushed since your last fetch. Fetch and review first.`);
        forced = true;
      } else if (force) forced = true;
      else
        return fail(`To ${r.url}\n ! [rejected]        ${src} -> ${dst} (fetch first)\nerror: failed to push some refs to '${r.url}'\nhint: Updates were rejected because the remote contains work that you do not have locally.\nhint: Integrate the remote changes first (e.g. 'git pull --rebase') before pushing again.`);
    }
  }
  copyCommits(repo.commits, r.commits, id);
  r.branches[dst] = id;
  repo.tracking[`${remoteName}/${dst}`] = id;
  if (setUp && b) repo.upstream[b] = `${remoteName}/${dst}`;
  const range = remoteTip ? `${forced ? "+ " : "  "}${short(remoteTip)}${forced ? "..." : ".."}${short(id)}` : " * [new branch]     ";
  return ok(`To ${r.url}\n ${range}  ${src} -> ${dst}${forced ? " (forced update)" : ""}${setUp && b ? `\nbranch '${b}' set up to track '${remoteName}/${dst}'.` : ""}`);
}

function bisectCmd(repo: Repo, args: string[]): CmdResult {
  const sub = args[0];
  if (sub === "start") {
    if (!isClean(repo)) return fail("error: commit or stash your changes before bisecting");
    repo.bisect = { good: [], origHead: clone(repo.head) };
    return ok("status: waiting for both good and bad commits\n(mark them: git bisect bad [rev], git bisect good <rev>)");
  }
  if (!repo.bisect) return fail('You need to start by "git bisect start"');
  if (sub === "reset") {
    repo.head = repo.bisect.origHead;
    repo.bisect = undefined;
    repo.index = clone(headTree(repo));
    repo.work = clone(repo.index);
    return ok(`Previous HEAD position restored (${currentBranch(repo) ?? short(headId(repo))}).`);
  }
  const rev = args[1] ?? "HEAD";
  const id = resolve(repo, rev);
  if (!id) return fail(`bad revision ${rev}`);
  if (sub === "bad" || sub === "new") repo.bisect.bad = id;
  else if (sub === "good" || sub === "old") repo.bisect.good.push(id);
  else return fail("usage: git bisect start | good [rev] | bad [rev] | reset");
  const bs = repo.bisect;
  if (!bs.bad || !bs.good.length) return ok(`status: waiting for ${bs.bad ? "a good" : "a bad"} commit`);
  const goodAnc = new Set<string>();
  for (const g of bs.good) for (const x of ancestors(repo, g)) goodAnc.add(x);
  const cands = reachable(repo, [bs.bad]).filter((c) => !goodAnc.has(c.id)).reverse();
  if (cands.length <= 1) {
    const c = cands[0] ?? repo.commits[bs.bad];
    repo.config["__bisect_result"] = c.id;
    return ok(`${c.id} is the first bad commit\nAuthor: ${c.author}\n\n    ${c.message}\n\n(run git bisect reset to return to your branch)`);
  }
  const mid = cands[Math.floor((cands.length - 1) / 2)];
  repo.head = { kind: "detached", id: mid.id };
  repo.index = clone(mid.tree);
  repo.work = clone(mid.tree);
  return ok(`Bisecting: ${cands.length - 1} revision(s) left to test after this (roughly ${Math.ceil(Math.log2(cands.length))} step(s))\n[${mid.id}] ${firstLine(mid.message)}\n(test it — e.g. cat the file — then type git bisect good or git bisect bad)`);
}

function defaultRemote(url: string): RemoteRepo {
  const tmp = emptyRepo();
  tmp.remotes.origin = makeRemote("origin", url);
  teammatePush(tmp, "main", "Initial commit", { "README.md": "# Team app\n" }, "sam");
  teammatePush(tmp, "main", "Add app skeleton", { "app.txt": "header\nbody\nfooter\n" }, "sam");
  return tmp.remotes.origin;
}

/** Run setup commands; a leading "!" means the command is allowed to fail (e.g. to create a conflict). */
export function runScript(repo: Repo, script: string[]): Repo {
  let r = repo;
  for (const raw of script) {
    const allowFail = raw.startsWith("!");
    const l = allowFail ? raw.slice(1) : raw;
    const res = run(r, l);
    if (!res.result.ok && !allowFail) throw new Error(`setup failed at "${l}": ${res.result.output}`);
    r = res.repo;
  }
  return r;
}

export function firstParentMessages(repo: Repo, rev = "HEAD"): string[] {
  const out: string[] = [];
  let cur: string | null | undefined = resolve(repo, rev);
  while (cur) {
    out.push(repo.commits[cur].message);
    cur = repo.commits[cur].parents[0];
  }
  return out;
}

export function cloneRepo(r: Repo): Repo {
  return clone(r);
}
