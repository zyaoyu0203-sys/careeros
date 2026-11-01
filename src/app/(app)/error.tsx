"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, Card, buttonClass } from "@/components/ui";

/** Keeps the header and navigation usable when one page fails, and offers a retry. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-xl px-8 py-10 text-center">
      <h1 className="font-serif text-[26px] font-semibold text-navy-900">This page didn&apos;t load</h1>
      <p className="mt-2 text-[15px] text-muted">Something went wrong on our side. Your data is safe — try again, or go back to the home page.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={reset}>
          <RotateCcw size={16} /> Try again
        </Button>
        <Link href="/" className={buttonClass("secondary")}>
          Home
        </Link>
      </div>
      {error.digest && <p className="mt-5 text-[12px] text-muted">Reference: {error.digest}</p>}
    </Card>
  );
}
