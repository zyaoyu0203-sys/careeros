"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { buttonClass, cx } from "@/components/ui";

export type Slide = {
  overline: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
  figure: string;
  figureLabel: string;
};

const INTERVAL_MS = 7000;

export function CapabilityCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const go = useCallback((delta: number) => setIndex(i => (i + delta + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (!playing || slides.length < 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const timer = setInterval(() => go(1), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playing, go, slides.length]);

  return (
    <section aria-roledescription="carousel" aria-label="What CareerOS is doing for you" className="mt-8">
      <div className="navy-panel relative h-[300px] rounded-[4px] sm:h-[280px]">
        {/* Diagonal band behind the figure, as in the portal reference */}
        <div className="pointer-events-none absolute top-[-40%] right-[22%] hidden h-[180%] w-[220px] rotate-[24deg] bg-navy-700/50 md:block" />
        {slides.map((slide, i) => (
          <article
            key={slide.overline}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            aria-hidden={i !== index}
            className={cx(
              "absolute inset-0 grid items-center gap-6 px-8 py-8 transition-all duration-500 sm:px-16 md:grid-cols-[1fr_280px]",
              i === index ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0",
            )}
          >
            <div className="relative max-w-[620px]">
              <div className="eyebrow text-blue-200">{slide.overline}</div>
              <h2 className="mt-3 font-serif text-[30px] leading-[1.15] font-semibold sm:text-[38px]">{slide.title}</h2>
              <p className="mt-3 max-w-[540px] text-[15px] text-white/80">{slide.body}</p>
              <Link href={slide.cta.href} tabIndex={i === index ? 0 : -1} className={buttonClass("light", "md", "mt-5")}>
                {slide.cta.label}
                <ChevronRight size={16} />
              </Link>
            </div>
            <div className="relative hidden flex-col items-center text-center md:flex">
              <div className="font-serif text-[104px] leading-none font-semibold tracking-tight text-blue-200 tabular-nums">{slide.figure}</div>
              <div className="mt-3 text-[12.5px] font-bold tracking-[0.16em] text-amber-500 uppercase">{slide.figureLabel}</div>
            </div>
          </article>
        ))}

        <button
          onClick={() => setPlaying(p => !p)}
          className="absolute top-3 left-3 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/50 text-white hover:bg-white/10"
          aria-label={playing ? "Pause slideshow" : "Play slideshow"}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={() => go(-1)}
          className="absolute top-1/2 left-3 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/40 text-white hover:bg-white/10 sm:grid"
          aria-label="Previous slide"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => go(1)}
          className="absolute top-1/2 right-3 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/40 text-white hover:bg-white/10 sm:grid"
          aria-label="Next slide"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="flex h-9 items-center justify-center gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.overline}
            onClick={() => setIndex(i)}
            aria-label={`Show slide ${i + 1}: ${slide.overline}`}
            aria-current={i === index}
            className={cx("h-2 rounded-full transition-all", i === index ? "w-6 bg-navy-700" : "w-2 bg-ink/25 hover:bg-ink/40")}
          />
        ))}
      </div>
    </section>
  );
}
