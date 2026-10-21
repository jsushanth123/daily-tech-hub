"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Circle, Lightbulb, Eye, RotateCcw, SkipForward, PartyPopper, FlaskConical } from "lucide-react";
import { type Repo, run, tokenize } from "@/lib/gitsim/engine";
import { getLab, type Lab } from "@/lib/gitsim/labs";
import { getLessonProgress, upsertLessonProgress } from "@/lib/progress";
import { CopyButton } from "@/components/CopyButton";
import { GitGraph } from "./GitGraph";
import { FilesPanel, GitTerminal, type TermLine } from "./GitTerminal";
import { useGitSession } from "./useGitSession";
import { cn } from "@/lib/utils";

function applySolution(r: Repo, lab: Lab, i: number): Repo {
  const step = lab.steps[i];
  const cmds = step.solution ? step.solution(r) : [step.expected];
  for (const raw of cmds) r = run(r, raw.startsWith("!") ? raw.slice(1) : raw).repo;
  return r;
}

/** Rebuild the repo for a saved step index by replaying earlier solutions. */
function rebuild(lab: Lab, upTo: number): { repo: Repo; events: TermLine[] } {
  let r = lab.setup();
  const events: TermLine[] = [];
  for (let i = 0; i < Math.min(upTo, lab.steps.length); i++) {
    if (lab.steps[i].onEnter) r = lab.steps[i].onEnter!(r);
    r = applySolution(r, lab, i);
  }
  if (upTo < lab.steps.length && lab.steps[upTo].onEnter) {
    r = lab.steps[upTo].onEnter!(r);
    if (lab.steps[upTo].event) events.push({ kind: "event", text: lab.steps[upTo].event! });
  }
  return { repo: r, events };
}

const cmdPrefix = (s: string) => tokenize(s.split("&&")[0]).slice(0, 2).join(" ");

export function GitLab({ labId }: { labId: string }) {
  const lab = useMemo(() => getLab(labId), [labId]);
  const key = `lab-${labId}`;
  const intro: TermLine[] = lab ? [{ kind: "out", text: `${lab.intro}\nType commands below. Each step checks the repo state automatically. Type \`help\` anytime.` }] : [];
  const { repo, setRepo, lines, setLines, exec } = useGitSession(() => (lab ? rebuild(lab, 0).repo : ({} as Repo)), intro);
  const [idx, setIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flash, setFlash] = useState(false);
  const restored = useRef(false);

  useEffect(() => {
    if (!lab || restored.current) return;
    restored.current = true;
    const saved = getLessonProgress("git", key)?.stepIndex ?? 0;
    const start = Math.min(saved, lab.steps.length);
    const { repo: r, events } = rebuild(lab, start);
    setRepo(r);
    setIdx(start);
    setLines((l) => [...l, ...(start > 0 ? [{ kind: "event" as const, text: start >= lab.steps.length ? "Lab already completed 🎉 — reset to replay it." : `Resumed at step ${start + 1}.` }] : []), ...events]);
  }, [lab, key, setRepo, setLines]);

  if (!lab) return null;
  const done = idx >= lab.steps.length;
  const step = lab.steps[Math.min(idx, lab.steps.length - 1)];

  const advance = (r: Repo, from: number) => {
    const s = lab.steps[from];
    const msgs: TermLine[] = [{ kind: "success", text: `✅ Step ${from + 1} done!${s.explain ? " " + s.explain : ""}` }];
    const next = from + 1;
    let nr = r;
    if (next < lab.steps.length && lab.steps[next].onEnter) {
      nr = lab.steps[next].onEnter!(r);
      if (lab.steps[next].event) msgs.push({ kind: "event", text: lab.steps[next].event! });
    }
    if (next >= lab.steps.length) msgs.push({ kind: "success", text: `🎉 Lab complete: ${lab.title}. Great work!` });
    setLines((l) => [...l, ...msgs]);
    setRepo(nr);
    setIdx(next);
    setShowHint(false);
    setShowAnswer(false);
    setFlash(true);
    setTimeout(() => setFlash(false), 900);
    upsertLessonProgress("git", key, { stepIndex: next, completed: next >= lab.steps.length });
    window.dispatchEvent(new Event("dth-progress"));
  };

  const onCommand = (cmd: string) => {
    if (done) {
      exec(cmd, repo);
      return;
    }
    const before = step.check(repo);
    const { repo: after } = exec(cmd, repo);
    const typedMatches = cmdPrefix(cmd) === cmdPrefix(step.expected);
    if (step.check(after) && (!before || typedMatches)) advance(after, idx);
  };

  const reset = () => {
    const { repo: r, events } = rebuild(lab, 0);
    setRepo(r);
    setIdx(0);
    setLines([...intro, { kind: "event", text: "Lab reset." }, ...events]);
    upsertLessonProgress("git", key, { stepIndex: 0, completed: false });
  };

  const skip = () => {
    const r = applySolution(repo, lab, idx);
    setLines((l) => [...l, { kind: "event", text: `Skipped: auto-ran the solution for step ${idx + 1}.` }]);
    if (lab.steps[idx].check(r)) advance(r, idx);
    else setRepo(r);
  };

  return (
    <section className="panel mt-10 scroll-mt-24 rounded-2xl p-4 sm:p-6" id="lab" data-testid={`git-lab-${lab.id}`} aria-label={lab.title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[var(--ink-fg)]">
          <FlaskConical className="h-5 w-5 text-[var(--violet)]" /> {lab.title}
        </h2>
        <span className="rounded-full bg-[var(--violet)]/15 px-3 py-1 text-xs font-bold text-[var(--violet)]">
          {Math.min(idx, lab.steps.length)}/{lab.steps.length} steps
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--panel-2)]">
        <div className="h-full rounded-full bg-gradient-to-r from-[var(--violet)] to-[var(--coral)] transition-all" style={{ width: `${(Math.min(idx, lab.steps.length) / lab.steps.length) * 100}%` }} />
      </div>

      <details className="mt-3 rounded-xl border border-[var(--ink-border)] bg-[var(--canvas)]/40 px-3 py-2">
        <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-[var(--muted)]">All steps</summary>
        <ol className="mt-2 space-y-1.5 text-sm">
          {lab.steps.map((s, i) => (
            <li key={i} className={cn("flex gap-2 rounded-xl px-2 py-1", i === idx && "bg-[var(--coral)]/10 ring-1 ring-[var(--coral)]/30", i > idx && "opacity-50")}>
              {i < idx ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mint)]" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />}
              <span className={cn("text-[var(--ink-fg)]", i < idx && "line-through decoration-[var(--mint)]/50")}>{i <= idx ? s.goal : `Step ${i + 1} (locked until you finish step ${i})`}</span>
            </li>
          ))}
        </ol>
      </details>

      <div className="mt-4">
        <div className="min-w-0 space-y-3">
          {done ? (
            <div className="celebrate-pop flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--mint)]/40 bg-[var(--mint)]/10 p-4">
              <PartyPopper className="h-5 w-5 text-[var(--mint)]" />
              <p className="text-sm font-semibold text-[var(--ink-fg)]">Lab complete! Keep experimenting below, or reset to replay.</p>
            </div>
          ) : (
            <div className={cn("rounded-2xl border border-[var(--violet)]/30 bg-[var(--violet)]/10 p-4 transition", flash && "celebrate-pop")}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--violet)]">Step {idx + 1} · Goal</p>
              <p className="mt-1 text-sm font-medium text-[var(--ink-fg)]" data-testid="lab-goal">{step.goal}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setShowHint((v) => !v)} className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-[var(--ink-border)] bg-[var(--panel)] px-3 text-xs font-semibold text-[var(--ink-fg)] hover:border-[var(--sun)]">
                  <Lightbulb className="h-3.5 w-3.5 text-[var(--sun)]" /> Hint
                </button>
                <button type="button" onClick={() => setShowAnswer((v) => !v)} className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-[var(--ink-border)] bg-[var(--panel)] px-3 text-xs font-semibold text-[var(--ink-fg)] hover:border-[var(--sky)]">
                  <Eye className="h-3.5 w-3.5 text-[var(--sky)]" /> Show command
                </button>
                <button type="button" onClick={skip} className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-[var(--ink-border)] bg-[var(--panel)] px-3 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink-fg)]">
                  <SkipForward className="h-3.5 w-3.5" /> Do it for me
                </button>
              </div>
              {showHint ? <p className="mt-2 text-sm text-[var(--muted)]">💡 {step.hint}</p> : null}
              {showAnswer ? (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-[var(--canvas)]/70 px-3 py-2">
                  <code className="overflow-x-auto font-mono text-xs text-[var(--ink-fg)]">{step.expected}</code>
                  <CopyButton text={step.expected} className="shrink-0 border-[var(--ink-border)] bg-[var(--panel)] text-[var(--ink-fg)]" />
                </div>
              ) : null}
            </div>
          )}
          <GitGraph repo={repo} />
          <GitTerminal repo={repo} lines={lines} onCommand={onCommand} />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
            <FilesPanel repo={repo} onCat={(f) => exec(`cat ${f}`, repo)} />
            <button type="button" onClick={reset} className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-[var(--ink-border)] px-3 text-xs font-semibold text-[var(--muted)] hover:text-[var(--coral)]">
              <RotateCcw className="h-3.5 w-3.5" /> Reset lab
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
