import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "light";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-navy-800 text-white border border-navy-800 hover:bg-navy-700 hover:border-navy-700",
  secondary: "bg-surface text-navy-800 border border-navy-800/70 hover:bg-blue-50",
  ghost: "bg-transparent text-navy-800 border border-transparent hover:bg-blue-50",
  danger: "bg-surface text-rose-600 border border-rose-600/40 hover:bg-rose-100",
  light: "bg-transparent text-white border border-white/60 hover:bg-white/10",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cx(
    "inline-flex shrink-0 items-center justify-center rounded-[3px] font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-[4px] border border-line bg-surface", className)} {...props} />;
}

export function CardHeader({ title, action, dark }: { title: ReactNode; action?: ReactNode; dark?: boolean }) {
  return (
    <div
      className={cx(
        "flex min-h-14 items-center justify-between gap-4 px-5 py-3",
        dark ? "rounded-t-[4px] bg-navy-900 text-white" : "border-b border-line",
      )}
    >
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {action}
    </div>
  );
}

type Tone = "neutral" | "blue" | "amber" | "rose" | "green" | "navy";
const tones: Record<Tone, string> = {
  neutral: "bg-line-soft text-ink-soft",
  blue: "bg-blue-100 text-navy-700",
  amber: "bg-amber-100 text-[#8a5a10]",
  rose: "bg-rose-100 text-rose-600",
  green: "bg-green-100 text-green-600",
  navy: "bg-navy-800 text-white",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-[3px] px-2 py-0.5 text-[12px] font-medium whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

export function ScorePill({ score, scoredBy }: { score: number; scoredBy?: "ai" | "keywords" }) {
  const tone: Tone = score >= 80 ? "green" : score >= 60 ? "blue" : "neutral";
  return (
    <Badge tone={tone} className="tabular-nums">
      {score}% match{scoredBy === "keywords" ? " · keywords" : ""}
    </Badge>
  );
}

export function PageHeader({ overline, title, description, actions }: { overline?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {overline && <div className="eyebrow text-navy-700">{overline}</div>}
        <h1 className="mt-1 font-serif text-[34px] leading-tight font-semibold text-navy-900">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <h3 className="font-serif text-xl font-semibold text-navy-900">{title}</h3>
      <p className="max-w-md text-[14px] text-muted">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

const fieldBase =
  "w-full rounded-[3px] border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-muted/70 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

export function Label({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("grid gap-1.5", className)}>
      <span className="text-[13px] font-semibold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(fieldBase, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(fieldBase, "min-h-24 py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(fieldBase, "h-10 pr-8", className)} {...props} />;
}

export function Meter({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-white/20", className)}>
      <div className="h-full rounded-full bg-amber-500 transition-[width]" style={{ width: `${Math.max(4, value)}%` }} />
    </div>
  );
}

export function CompanyMark({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .split(/[\s·&-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[3px] border border-blue-200 bg-blue-50 font-semibold text-navy-800"
      style={{ width: size, height: size, fontSize: size * 0.32 }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}

export const formatDate = (iso: string | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  iso ? new Intl.DateTimeFormat("en-GB", { timeZone: process.env.NEXT_PUBLIC_TIMEZONE || "Asia/Hong_Kong", ...opts }).format(new Date(iso)) : "—";

export function relativeDays(iso: string | null) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (Number.isNaN(days)) return iso;
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
}
