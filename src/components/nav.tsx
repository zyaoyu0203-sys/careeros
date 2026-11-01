"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export type NavItem = { href: string; label: string; count?: number };

export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="bg-navy-900">
      <div className="mx-auto flex max-w-[1240px] overflow-x-auto px-4 [scrollbar-width:none] sm:px-6">
        {items.map(item => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "relative flex h-12 shrink-0 items-center gap-2 border-r border-white/10 px-5 text-[14px] font-semibold transition-colors first:border-l",
                active ? "bg-surface text-navy-900" : "text-white/90 hover:bg-navy-800 hover:text-white",
              )}
            >
              {item.label}
              {item.count ? (
                <span
                  className={cx(
                    "grid h-5 min-w-5 place-items-center rounded-[3px] px-1.5 text-[11.5px] font-bold tabular-nums",
                    active ? "bg-amber-100 text-[#8a5a10]" : "bg-amber-500 text-navy-950",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
              {active && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-amber-500" />}
              <PendingBar />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Immediate feedback while the clicked page loads. */
function PendingBar() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] animate-pulse bg-amber-500" />;
}
