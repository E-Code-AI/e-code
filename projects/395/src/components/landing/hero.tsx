import React, { useEffect, useRef, useState } from "react";

type HeroProps = {
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  className?: string;
};

const HEADLINE_WORDS = ["Faster", "Smarter", "Scalable"];

const Hero: React.FC<HeroProps> = ({
  onPrimaryClick,
  onSecondaryClick,
  className = "",
}) => {
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const [hasMounted, setHasMounted] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!isAnimating) return;

    intervalRef.current = window.setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % HEADLINE_WORDS.length);
    }, 2600);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isAnimating]);

  const handlePrimaryClick = () => {
    if (onPrimaryClick) {
      onPrimaryClick();
      return;
    }
    const target = document.querySelector("[data-section='get-started']");
    if (target && "scrollIntoView" in target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSecondaryClick = () => {
    if (onSecondaryClick) {
      onSecondaryClick();
      return;
    }
    const target = document.querySelector("[data-section='learn-more']");
    if (target && "scrollIntoView" in target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const currentWord = HEADLINE_WORDS[currentWordIndex];

  return (
    <section
      className={`relative overflow-hidden bg-slate-950 text-slate-50 undefined`}
      aria-labelledby="hero-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.16),_transparent_55%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950" />
      <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-4 pb-20 pt-28 sm:px-6 lg:px-8 lg:pt-32">
        <div className="mb-6 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-300 shadow-sm backdrop-blur">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="uppercase tracking-wide">Now in public beta</span>
        </div>

        <div className="text-center">
          <h1
            id="hero-heading"
            className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl md:text-6xl"
          >
            Build
            <span className="relative inline-flex w-[7.5ch] justify-center overflow-hidden align-baseline sm:w-[8ch]">
              <span
                aria-hidden="true"
                className="ml-2 inline-block text-sky-400"
              >
                {currentWord}
              </span>
              <span className="sr-only">{currentWord}</span>
              <span
                className={`pointer-events-none absolute inset-0 ml-2 inline-flex flex-col text-sky-400 transition-opacity duration-500 undefined`}
                aria-hidden="true"
              >
                {HEADLINE_WORDS.map((word, index) => (
                  <span
                    key={word}
                    className={`transition-transform duration-500 undefined`}
                  >
                    {word}
                  </span>
                ))}
              </span>
            </span>
            products with less effort.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-balance text-sm text-slate-300 sm:text-base">
            Ship production-ready experiences in days, not weeks. From idea to
            launch, streamline your workflow with opinionated tooling that
            scales with your team.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={handlePrimaryClick}
              className="inline-flex w-full items-center justify-center rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto"
            >
              Get started free
            </button>
            <button
              type="button"
              onClick={handleSecondaryClick}
              className="inline-flex w-full items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-slate-100 shadow-sm transition hover:border-slate-500 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto"
            >
              Book a live demo
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            No credit card required · 14-day full-featured trial
          </p>
        </div>

        <div className="mt-10 flex w-full max-w-3xl flex-col items-center gap-4 text-xs text-slate-400 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-slate-200 ring-2 ring-slate-950">
                A
              </span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-slate-200 ring-2 ring-slate-950">
                B
              </span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-slate-200 ring-2 ring-slate-950">
                C
              </span>
            </div>
            <span>Trusted by product teams at fast-growing startups</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
              99.9% uptime
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span>Backed by enterprise-grade security</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;