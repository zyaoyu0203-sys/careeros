"use client";

import { Check, Copy, KeyRound, Puzzle } from "lucide-react";
import { useState, useTransition } from "react";
import { createExtensionToken } from "@/app/actions";
import { Button, Card } from "@/components/ui";

export function ExtensionCard({ hasToken }: { hasToken: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <Card className="mt-8 max-w-4xl p-6 sm:p-8">
      <h2 className="flex items-center gap-2 text-[17px] font-semibold text-navy-900">
        <Puzzle size={18} /> Browser extension
      </h2>
      <p className="mt-1 max-w-2xl text-[14px] text-muted">
        Fills Greenhouse, Lever and Ashby application forms from your knowledge base and attaches the resume you chose. You always press Submit yourself; CareerOS then records the application.
      </p>
      <ol className="mt-4 grid gap-1.5 text-[14px] text-ink-soft">
        <li>1. In Chrome, open <code className="rounded bg-line-soft px-1">chrome://extensions</code>, turn on Developer mode, and choose “Load unpacked” → the <code className="rounded bg-line-soft px-1">extension</code> folder of the CareerOS repository.</li>
        <li>2. Generate a token below and paste it, with this site&apos;s address, into the extension&apos;s settings.</li>
      </ol>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          variant={hasToken || token ? "secondary" : "primary"}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await createExtensionToken();
              if (r.ok) setToken(r.token);
              else setError(r.error);
            })
          }
        >
          <KeyRound size={16} /> {hasToken || token ? "Generate a new token" : "Generate token"}
        </Button>
        {hasToken && !token && <span className="text-[13.5px] text-muted">A token is active. Generating a new one replaces it.</span>}
        {error && <span className="text-[13.5px] text-rose-600">{error}</span>}
      </div>
      {token && (
        <div className="mt-4 grid gap-2 rounded-[4px] border border-amber-500/40 bg-amber-100/50 p-4">
          <span className="text-[13px] font-semibold text-[#8a5a10]">Copy it now — it won&apos;t be shown again.</span>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-surface px-3 py-2 text-[13px]">{token}</code>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(token);
                setCopied(true);
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <span className="text-[13px] text-muted">
            CareerOS address: <code>{origin}</code>
          </span>
        </div>
      )}
    </Card>
  );
}
