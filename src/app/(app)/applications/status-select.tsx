"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateApplication } from "@/app/actions";
import { cx } from "@/components/ui";
import { STATUSES } from "@/lib/status";
import type { ApplicationStatus } from "@/lib/types";

export function StatusSelect({ id, value, label }: { id: string; value: ApplicationStatus; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={label}
      value={value}
      disabled={pending}
      onChange={e =>
        start(async () => {
          await updateApplication(id, { status: e.target.value as ApplicationStatus });
          router.refresh();
        })
      }
      className={cx("h-9 rounded-[3px] border border-line bg-surface px-2 pr-7 text-[13.5px] font-medium focus:border-blue-500 focus:outline-none", pending && "opacity-60")}
    >
      {STATUSES.map(s => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
