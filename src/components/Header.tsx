"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, Search, X, Hexagon, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/components/auth/AuthProvider";
import { PlainEnglishToggle } from "@/components/PlainEnglishToggle";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/training", label: "Training" },
  { href: "/git/sandbox", label: "Git Lab" },
  { href: "/shortcuts", label: "Shortcuts" },
  { href: "/news", label: "News" },
  { href: "/releases", label: "Releases" },
  { href: "/dashboard", label: "Progress" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const onAuthPage = pathname === "/login" || pathname === "/signup";
  const account = user;
  const showAccount = Boolean(account) && !onAuthPage;

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--ink-border)] bg-[color-mix(in_oklab,var(--canvas)_88%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-display font-bold text-[var(--ink-fg)]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--coral)] text-[#1a1430] shadow-[0_0_24px_var(--glow)]">
            <Hexagon className="h-4 w-4" aria-hidden />
          </span>
          <span className="truncate text-sm sm:text-base">Aurora</span>
          <span className="hidden truncate text-xs font-semibold text-[var(--muted)] lg:inline">
            Daily Tech Hub
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-sm font-semibold transition",
                  active
                    ? "bg-[var(--panel-2)] text-[var(--ink-fg)]"
                    : "text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--ink-fg)]",
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="hidden md:inline">
            <PlainEnglishToggle compact />
          </span>
          <ThemeToggle />
          <Link
            href="/search"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-[12px] border border-[var(--ink-border)] bg-[var(--panel)] px-2.5 text-sm text-[var(--muted)] transition hover:text-[var(--ink-fg)] sm:px-3"
            aria-label="Search"
          >
            <Search className="h-4 w-4" aria-hidden />
          </Link>
          {showAccount ? (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link
                href="/dashboard"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[14px] border border-[var(--mint)]/40 bg-[var(--mint)]/15 px-3 py-2 text-sm font-bold text-[var(--mint)]"
              >
                <UserRound className="h-4 w-4" aria-hidden />
                <span className="max-w-[5.5rem] truncate">{account && account.name && !/^demo\s*oauth$/i.test(account.name) ? account.name : account?.email && !account.email.endsWith("@oauth.local") ? account.email.split("@")[0] : "You"}</span>
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink-fg)]"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <div className="hidden items-center gap-1.5 sm:flex">
                <Link
                  href="/login"
                  className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink-fg)]"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-[14px] bg-[var(--coral)] px-3.5 py-2 text-sm font-bold text-[#1a1430] shadow-[0_3px_0_color-mix(in_oklab,var(--coral)_55%,#000)] sm:px-4"
                >
                  <UserRound className="h-4 w-4" aria-hidden />
                  Sign up
                </Link>
              </div>
              <Link
                href="/signup"
                className="inline-flex min-h-[44px] items-center rounded-[14px] bg-[var(--coral)] px-3 py-2 text-sm font-bold text-[#1a1430] sm:hidden"
              >
                Sign up
              </Link>
            </>
          )}
          <button
            type="button"
            className="rounded-lg p-2.5 text-[var(--muted)] hover:bg-[var(--panel-2)] lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-[var(--ink-border)] px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-[var(--ink-fg)] hover:bg-[var(--panel-2)]"
              >
                {item.label}
              </Link>
            ))}
            <div className="px-1 py-2">
              <PlainEnglishToggle />
            </div>
            {showAccount ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--coral)]"
                >
                  My progress
                </Link>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--ink-fg)]"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--coral)]"
              >
                Sign up free
              </Link>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
