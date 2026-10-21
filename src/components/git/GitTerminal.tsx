"use client";

import { useEffect, useRef, useState } from "react";
import { type Repo, currentBranch, headId, short, status } from "@/lib/gitsim/engine";
import { cn } from "@/lib/utils";

export interface TermLine {
  kind: "cmd" | "out" | "err" | "event" | "success";
  text: string;
  prompt?: string;
}

export function promptFor(repo: Repo): string {
  if (repo.interactive) return "rebase-plan>";
  if (!repo.initialized) return "~/project $";
  const b = currentBranch(repo) ?? `(${short(headId(repo))})`;
  const OP: Record<string, string> = { merge: "MERGING", "cherry-pick": "CHERRY-PICKING", revert: "REVERTING", rebase: "REBASING" };
  const state = repo.rebase ? "|REBASING" : repo.merge ? `|${OP[repo.merge.op]}` : repo.bisect ? "|BISECTING" : "";
  return `~/project (${b}${state}) $`;
}

export function GitTerminal({
  repo,
  lines,
  onCommand,
  placeholder,
  autoFocus,
}: {
  repo: Repo;
  lines: TermLine[];
  onCommand: (cmd: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [hist, setHist] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const submit = () => {
    const cmd = value;
    setValue("");
    setHIdx(-1);
    if (cmd.trim()) setHist((h) => [...h, cmd]);
    onCommand(cmd);
  };

  return (
    <div
      className="gitterm flex flex-col overflow-hidden rounded-2xl border border-[var(--ink-border)] bg-[#221d3a] text-[13px] text-[#efeaff] shadow-inner dark:bg-[#141829]"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b4a]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#2ee59d]" />
        <span className="ml-2 truncate font-mono text-[11px] text-white/60">git sandbox · simulated, safe to break</span>
      </div>
      <div ref={scrollRef} className="h-72 overflow-y-auto px-3 py-2 font-mono leading-relaxed sm:h-80" aria-live="polite" role="log">
        {lines.map((l, i) => (
          <pre
            key={i}
            className={cn(
              "whitespace-pre-wrap break-words font-mono",
              l.kind === "err" && "text-[#ff9b85]",
              l.kind === "event" && "my-1 rounded-lg bg-[#ffd166]/15 px-2 py-1 text-[#ffe08a]",
              l.kind === "success" && "my-1 rounded-lg bg-[#2ee59d]/15 px-2 py-1 text-[#8ff5c8]",
              l.kind === "out" && "text-white/85",
            )}
          >
            {l.kind === "cmd" ? (
              <>
                <span className="text-[#b794ff]">{l.prompt}</span> <span className="text-white">{l.text}</span>
              </>
            ) : (
              l.text
            )}
          </pre>
        ))}
        <form
          className="flex flex-wrap items-center gap-x-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="git-term-input" className="shrink-0 text-[#b794ff]">
            {promptFor(repo)}
          </label>
          <input
            id="git-term-input"
            ref={inputRef}
            value={value}
            autoFocus={autoFocus}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={placeholder ?? "type a command, e.g. git status"}
            aria-label="Git command"
            className="min-w-[10rem] flex-1 bg-transparent font-mono text-white caret-[#ff8a6e] outline-none placeholder:text-white/30"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                if (!hist.length) return;
                const n = hIdx < 0 ? hist.length - 1 : Math.max(0, hIdx - 1);
                setHIdx(n);
                setValue(hist[n]);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                if (hIdx < 0) return;
                const n = hIdx + 1;
                if (n >= hist.length) {
                  setHIdx(-1);
                  setValue("");
                } else {
                  setHIdx(n);
                  setValue(hist[n]);
                }
              }
            }}
          />
        </form>
      </div>
    </div>
  );
}

export function FilesPanel({ repo, onCat }: { repo: Repo; onCat?: (f: string) => void }) {
  const s = status(repo);
  const files = [...new Set([...Object.keys(repo.work), ...s.staged.map((x) => x.path)])].sort();
  const badge = (f: string) => {
    if (s.conflicted.includes(f)) return { t: "conflict", c: "bg-rose-500/15 text-rose-500" };
    if (s.untracked.includes(f)) return { t: "untracked", c: "bg-[var(--muted)]/15 text-[var(--muted)]" };
    const st = s.staged.find((x) => x.path === f);
    const un = s.unstaged.find((x) => x.path === f);
    if (st && un) return { t: "staged+edited", c: "bg-[var(--sun)]/20 text-[var(--ink-fg)]" };
    if (st) return { t: st.kind === "deleted" ? "staged delete" : "staged", c: "bg-[var(--mint)]/15 text-[var(--mint)]" };
    if (un) return { t: un.kind === "deleted" ? "deleted" : "modified", c: "bg-[var(--coral)]/15 text-[var(--coral)]" };
    if (repo.work[f] !== undefined && repo.index[f] === undefined) return { t: "ignored", c: "bg-[var(--muted)]/10 text-[var(--muted)]" };
    return { t: "committed", c: "bg-[var(--violet)]/10 text-[var(--violet)]" };
  };
  return (
    <div className="rounded-2xl border border-[var(--ink-border)] bg-[var(--panel)] p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Files (working tree)</p>
      {files.length ? (
        <ul className="space-y-1">
          {files.map((f) => {
            const b = badge(f);
            return (
              <li key={f}>
                <button type="button" className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left font-mono text-xs text-[var(--ink-fg)] hover:bg-[var(--panel-2)]" onClick={() => onCat?.(f)} title={`cat ${f}`}>
                  <span className="truncate">{f}</span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", b.c)}>{b.t}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-[var(--muted)]">No files yet.</p>
      )}
      {repo.stash.length ? <p className="mt-2 text-[11px] text-[var(--muted)]">📦 {repo.stash.length} stash entr{repo.stash.length === 1 ? "y" : "ies"}</p> : null}
      {Object.keys(repo.remotes).length ? <p className="mt-1 text-[11px] text-[var(--muted)]">🌐 remotes: {Object.keys(repo.remotes).join(", ")}</p> : null}
    </div>
  );
}
