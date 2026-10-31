import { FileText, Radar, Send } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { supabaseConfigured } from "@/lib/store";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  if (!supabaseConfigured) redirect("/");
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="navy-panel hidden flex-col justify-between p-12 lg:flex">
        <Brand light />
        <div className="max-w-md">
          <h1 className="font-serif text-[40px] leading-tight font-semibold">Your job search, run like an operating system.</h1>
          <ul className="mt-8 grid gap-5 text-[15px] text-white/85">
            <li className="flex gap-3">
              <Radar className="mt-0.5 shrink-0 text-amber-500" size={20} /> Roles from the boards and companies you choose, scored against your real experience.
            </li>
            <li className="flex gap-3">
              <FileText className="mt-0.5 shrink-0 text-amber-500" size={20} /> The right resume picked for every job — or tailored to it, using only facts you&apos;ve verified.
            </li>
            <li className="flex gap-3">
              <Send className="mt-0.5 shrink-0 text-amber-500" size={20} /> Application packs with every answer ready, and a tracker from applied to offer.
            </li>
          </ul>
        </div>
        <p className="text-[13px] text-white/50">You stay in control — CareerOS never submits an application for you.</p>
      </section>
      <section className="flex items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <h2 className="font-serif text-[28px] font-semibold text-navy-900">Welcome</h2>
          <p className="mt-1 mb-6 text-[15px] text-muted">Sign in, or create an account to set up your profile.</p>
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
