"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/components/ui";

export function Tabs({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div role="tablist" className="flex border-b border-navy-900">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cx(
              "h-11 min-w-[120px] border-r border-navy-900 px-5 text-[14px] font-semibold text-navy-800",
              i === active ? "bg-surface shadow-[inset_0_-3px_0_var(--navy-800)]" : "bg-blue-50 hover:bg-blue-100",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tabs[active].content}</div>
    </div>
  );
}
