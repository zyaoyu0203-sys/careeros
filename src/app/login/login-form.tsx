"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label, cx } from "@/components/ui";
import { signIn, signUp } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signingIn] = useActionState(signIn, undefined);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, undefined);
  const state = mode === "signin" ? signInState : signUpState;
  const pending = signingIn || signingUp;

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 border-b border-line" role="tablist">
        {(["signin", "signup"] as const).map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cx("h-11 text-[15px] font-semibold", mode === m ? "text-navy-900 shadow-[inset_0_-3px_0_var(--navy-800)]" : "text-muted hover:text-navy-800")}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form action={mode === "signin" ? signInAction : signUpAction} className="grid gap-4">
        <Label label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Label>
        <Label label="Password" hint={mode === "signup" ? "At least 8 characters" : undefined}>
          <Input name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : undefined} />
        </Label>
        {state?.error && (
          <p role="alert" className="rounded-[3px] bg-rose-100 px-3 py-2 text-[14px] text-rose-600">
            {state.error}
          </p>
        )}
        {state?.message && <p className="rounded-[3px] bg-green-100 px-3 py-2 text-[14px] text-green-600">{state.message}</p>}
        <Button disabled={pending} className="mt-1">
          {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
