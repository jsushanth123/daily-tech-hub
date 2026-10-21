"use client";

import { useEffect, useRef } from "react";

/** Adds a copy button to every <pre> block rendered from markdown inside its children. */
export function CodeCopyEnhancer({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const pres = Array.from(root.querySelectorAll<HTMLPreElement>(".prose-de pre"));
    const added: HTMLButtonElement[] = [];
    for (const pre of pres) {
      if (pre.dataset.copy === "1") continue;
      pre.dataset.copy = "1";
      pre.style.position = "relative";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code");
      btn.className =
        "code-copy-btn absolute right-2 top-2 rounded-lg border border-[var(--ink-border)] bg-[var(--panel)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-fg)] opacity-80 transition hover:opacity-100 hover:border-[var(--coral)]";
      btn.addEventListener("click", async () => {
        const text = (pre.querySelector("code")?.textContent ?? pre.textContent ?? "").replace(/\n$/, "");
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = "Copied ✓";
        } catch {
          btn.textContent = "Select & copy";
        }
        setTimeout(() => (btn.textContent = "Copy"), 1400);
      });
      pre.appendChild(btn);
      added.push(btn);
    }
    return () => {
      for (const b of added) {
        const pre = b.parentElement as HTMLPreElement | null;
        b.remove();
        if (pre) delete pre.dataset.copy;
      }
    };
  }, []);
  return <div ref={ref}>{children}</div>;
}
