"use client";

import dynamic from "next/dynamic";

export const GitSandboxClient = dynamic(() => import("./GitSandbox").then((m) => m.GitSandbox), {
  ssr: false,
  loading: () => <div className="h-[520px] animate-pulse rounded-2xl bg-[var(--panel-2)]" aria-label="Loading sandbox" />,
});
