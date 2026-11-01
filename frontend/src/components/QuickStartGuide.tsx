import React from 'react';
import { PlayCircle, Radio, Sliders, ArrowRight, Sparkles, Flame, CheckCircle2, Zap } from 'lucide-react';

interface QuickStartGuideProps {
  onScrollToPhase1: () => void;
  onGoToUpcoming: () => void;
  onGoToDeepDive: () => void;
}

export const QuickStartGuide: React.FC<QuickStartGuideProps> = ({
  onScrollToPhase1,
  onGoToUpcoming,
  onGoToDeepDive,
}) => {
  return (
    <section id="how-to-use-section" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-card)] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl badge-accent flex items-center justify-center font-bold shrink-0">
            <Zap className="w-4 h-4 text-[var(--accent-primary)]" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                How to Use This Platform
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full badge-accent font-semibold">
                3 Simple Steps
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Get instant listing gain predictions and risk checks in seconds: no complex financial knowledge needed.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Step Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Demo IPOs */}
        <div className="terminal-card p-6 sm:p-7 flex flex-col justify-between space-y-4 hover:border-[var(--accent-primary)]/50 transition-colors duration-300 group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center font-bold">
                <Flame className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-mono font-bold text-zinc-500 group-hover:text-[var(--accent-primary)] transition-colors">
                STEP 01
              </span>
            </div>

            <div>
              <h4 className="text-base font-bold text-white group-hover:text-[var(--accent-primary)] transition-colors">
                1. Test with Demo IPOs
              </h4>
              <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed">
                Want to see how it works first? Choose any past IPO (like <em>Bajaj Housing Finance</em> or <em>Premier Energies</em>) from the <strong>Try Demo IPO</strong> dropdown.
              </p>
            </div>

            <div className="pt-2 text-xs text-zinc-400 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Automatic calculation: no manual clicks</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
                <span>See first-day listing profit % & price range</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onScrollToPhase1}
            className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold text-white bg-white/5 hover:bg-[var(--accent-primary)]/15 border border-white/10 hover:border-[var(--accent-primary)]/40 flex items-center justify-center gap-2 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          >
            <span>Try Demo IPO Below</span>
            <ArrowRight className="w-3.5 h-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </div>

        {/* Step 2: Upcoming IPOs */}
        <div className="terminal-card p-6 sm:p-7 flex flex-col justify-between space-y-4 hover:border-[var(--accent-primary)]/50 transition-colors duration-300 group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-400 flex items-center justify-center font-bold">
                <Radio className="w-5 h-5 animate-pulse" aria-hidden="true" />
              </div>
              <span className="text-xs font-mono font-bold text-zinc-500 group-hover:text-[var(--accent-primary)] transition-colors">
                STEP 02
              </span>
            </div>

            <div>
              <h4 className="text-base font-bold text-white group-hover:text-[var(--accent-primary)] transition-colors">
                2. Check Upcoming IPOs
              </h4>
              <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed">
                Click on the <strong>Upcoming IPOs</strong> tab at the top. Browse scheduled Indian IPOs and just click <strong>"Predict IPO"</strong> on any company.
              </p>
            </div>

            <div className="pt-2 text-xs text-zinc-400 space-y-1.5">
              <div className="flex items-center gap-2 text-sky-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>We handle all data and calculations</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
                <span>Checks if the IPO is hot before you bid</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoToUpcoming}
            className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold text-white bg-white/5 hover:bg-[var(--accent-primary)]/15 border border-white/10 hover:border-[var(--accent-primary)]/40 flex items-center justify-center gap-2 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          >
            <span>Go to Upcoming IPOs</span>
            <ArrowRight className="w-3.5 h-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </div>

        {/* Step 3: Check Safety & Deep Dive */}
        <div className="terminal-card p-6 sm:p-7 flex flex-col justify-between space-y-4 hover:border-[var(--accent-primary)]/50 transition-colors duration-300 group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-mono font-bold text-zinc-500 group-hover:text-[var(--accent-primary)] transition-colors">
                STEP 03
              </span>
            </div>

            <div>
              <h4 className="text-base font-bold text-white group-hover:text-[var(--accent-primary)] transition-colors">
                3. Check Safety & Deep Dive
              </h4>
              <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed">
                Check whether founders are cashing out via OFS, inspect the 4-point safety score, and simulate demand elasticity in real time.
              </p>
            </div>

            <div className="pt-2 text-xs text-zinc-400 space-y-1.5">
              <div className="flex items-center gap-2 text-purple-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Automated 4-Point Red Flag Safety Score</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
                <span>Fresh capital vs. promoter cash-out audit</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoToDeepDive}
            className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold text-white bg-white/5 hover:bg-[var(--accent-primary)]/15 border border-white/10 hover:border-[var(--accent-primary)]/40 flex items-center justify-center gap-2 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          >
            <span>Open Company Deep Dive</span>
            <ArrowRight className="w-3.5 h-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};
