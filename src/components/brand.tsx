import Link from "next/link";

export function Brand({ light }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="CareerOS home">
      <span
        className={`grid h-10 w-10 place-items-center rounded-[3px] font-serif text-[22px] font-semibold ${light ? "bg-white text-navy-900" : "bg-navy-900 text-white"}`}
      >
        C
      </span>
      <span className="grid leading-tight">
        <span className={`font-serif text-[21px] font-semibold ${light ? "text-white" : "text-navy-900"}`}>CareerOS</span>
        <span className={`text-[10.5px] font-semibold tracking-[0.16em] uppercase ${light ? "text-white/70" : "text-muted"}`}>Job seeker portal</span>
      </span>
    </Link>
  );
}
