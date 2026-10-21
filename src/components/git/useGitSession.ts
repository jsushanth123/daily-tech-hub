"use client";

import { useCallback, useState } from "react";
import { type Repo, run, statusText } from "@/lib/gitsim/engine";
import { promptFor, type TermLine } from "./GitTerminal";

export function useGitSession(initial: () => Repo, welcome: TermLine[]) {
  const [repo, setRepo] = useState<Repo>(initial);
  const [lines, setLines] = useState<TermLine[]>(welcome);

  const exec = useCallback(
    (cmd: string, current: Repo): { repo: Repo; ok: boolean } => {
      const parts = cmd.split(/\s+&&\s+/);
      let r = current;
      const out: TermLine[] = [];
      let allOk = true;
      for (const part of parts) {
        out.push({ kind: "cmd", text: part, prompt: promptFor(r) });
        if (part.trim() === "clear") {
          setLines([]);
          out.length = 0;
          continue;
        }
        const res = run(r, part);
        r = res.repo;
        if (res.result.output) out.push({ kind: res.result.ok ? "out" : "err", text: res.result.output });
        if (!res.result.ok) {
          allOk = false;
          break;
        }
      }
      setLines((l) => [...l, ...out].slice(-400));
      setRepo(r);
      return { repo: r, ok: allOk };
    },
    [],
  );

  return { repo, setRepo, lines, setLines, exec, statusText };
}
