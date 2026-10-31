"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/app/actions";
import { Button } from "@/components/ui";

/**
 * Runs a server action that returns an ActionResult and shows its outcome inline.
 * `onSuccessHref` receives the action's message (e.g. a new record id) to build a redirect.
 */
export function ActionButton({
  action,
  children,
  pendingLabel,
  variant,
  size,
  onSuccessHref,
}: {
  action: () => Promise<ActionResult>;
  children: ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  onSuccessHref?: (message: string) => string;
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
            if (r.ok && onSuccessHref) router.push(onSuccessHref(r.message ?? ""));
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
