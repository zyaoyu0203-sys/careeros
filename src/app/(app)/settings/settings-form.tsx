"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { savePreferences } from "@/app/actions";
import { PreferencesEditor } from "@/components/fields";
import { Button, Card } from "@/components/ui";
import type { Preferences } from "@/lib/types";

export function SettingsForm({ initial, googleJobsAvailable }: { initial: Preferences; googleJobsAvailable: boolean }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(initial);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card className="max-w-4xl p-6 sm:p-8">
      <PreferencesEditor
        value={prefs}
        onChange={p => {
          setPrefs(p);
          setStatus(null);
        }}
        googleJobsAvailable={googleJobsAvailable}
      />
      <div className="mt-8 flex items-center gap-3 border-t border-line pt-5">
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await savePreferences(prefs);
              setStatus(r.ok ? { ok: true, text: "Saved. The next search uses these settings." } : { ok: false, text: r.error });
              router.refresh();
            })
          }
        >
          {pending ? "Saving…" : "Save settings"}
        </Button>
        {status && <span className={`text-[14px] ${status.ok ? "text-green-600" : "text-rose-600"}`}>{status.text}</span>}
      </div>
    </Card>
  );
}
