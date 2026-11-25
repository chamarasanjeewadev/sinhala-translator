"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pause, Play } from "lucide-react";

export type HeroSlide = {
  key: string;
  href: string;
  name: string;
  /** Tool colour from the logo, a CSS value such as var(--lane-voice). */
  color: string;
  image: string;
  /** Where the subject sits (CSS object-position), so the crop keeps faces in frame. */
  focus: string;
  /** The real product, set over the photo (server-rendered). */
  card: ReactNode;
};

type Labels = { region: string; slideOf: string; pause: string; play: string; goTo: string };

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

/**
 * Hero photo slider on native scroll-snap (swipe and keyboard scroll for free).
 * Autoplay stops for good on any swipe, click or keyboard use, has a visible
 * pause, and never starts under prefers-reduced-motion or in a hidden tab.
 */
export function HeroSlider({ slides, labels }: { slides: HeroSlide[]; labels: Labels }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.i))),
      { root: el, threshold: 0.6 }
    );
    el.querySelectorAll("[data-i]").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const el = track.current;
      if (!el || document.hidden) return;
      el.scrollTo({ left: ((active + 1) % slides.length) * el.clientWidth, behavior: "smooth" });
    }, 5500);
    return () => clearInterval(id);
  }, [playing, active, slides.length]);

  const stop = () => setPlaying(false);
  const go = (i: number) => {
    stop();
    const el = track.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section className="hv-slider" aria-roledescription="carousel" aria-label={labels.region}>
      <div
        ref={track}
        className="hv-slider__track"
        onPointerDown={stop}
        onWheel={stop}
        onKeyDown={stop}
        aria-live={playing ? "off" : "polite"}
      >
        {slides.map((s, i) => (
          <div
            key={s.key}
            data-i={i}
            className="hv-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${s.name}, ${fill(labels.slideOf, { n: i + 1, total: slides.length })}`}
            style={{ ["--c" as string]: s.color }}
          >
            <Image
              src={s.image}
              alt=""
              fill
              sizes="(max-width: 60rem) 100vw, 46vw"
              priority={i === 0}
              className="hv-slide__img"
              style={{ objectPosition: s.focus }}
            />
            <Link href={s.href} className="hv-slide__card" tabIndex={i === active ? 0 : -1} onFocus={stop}>
              <span className="hv-slide__tool">
                <i aria-hidden />
                {s.name}
              </span>
              {s.card}
            </Link>
          </div>
        ))}
      </div>
      <div className="hv-slider__bar">
        <div className="hv-slider__dots">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className="hv-slider__dot"
              style={{ ["--c" as string]: s.color }}
              aria-label={fill(labels.goTo, { name: s.name })}
              aria-current={i === active ? "true" : undefined}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="hv-slider__pause"
          aria-label={playing ? labels.pause : labels.play}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
        </button>
      </div>
    </section>
  );
}
