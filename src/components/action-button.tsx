"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/app/actions";
import { Button } from "@/components/ui";

/**
 * Runs a server action that returns an ActionResult and shows its outcome inline.
 * On success, `successHrefPrefix` + the action's message (e.g. a new record id) is opened.
 * (A string, not a callback: props from server components must be serialisable.)
 */
export function ActionButton({
  action,
  children,
  pendingLabel,
  variant,
  size,
  successHrefPrefix,
}: {
  action: () => Promise<ActionResult>;
  children: ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  successHrefPrefix?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await action();
            setResult(r);
            if (r.ok && successHrefPrefix) router.push(successHrefPrefix + (r.message ?? ""));
            else router.refresh();
          })
        }
      >
        {pending ? pendingLabel : children}
      </Button>
      {result && !pending && (
        <span role="status" className={`max-w-md text-[13px] ${result.ok ? "text-green-600" : "text-rose-600"}`}>
          {result.ok ? result.message : result.error}
        </span>
      )}
    </span>
  );
}
