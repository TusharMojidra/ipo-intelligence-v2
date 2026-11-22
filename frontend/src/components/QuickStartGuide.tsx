import React from 'react';
import { Radio, Sliders, ArrowRight, Flame, Zap } from 'lucide-react';

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
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              How to Use This Platform
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Listing gain predictions and risk checks across two analytical phases.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Step Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Demo IPOs */}
        <div className="terminal-card p-6 sm:p-7 flex flex-col justify-between space-y-4 hover:border-[var(--accent-primary)]/50 transition-colors duration-300 group">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center font-bold">
              <Flame className="w-5 h-5" aria-hidden="true" />
            </div>

            <div>
              <h4 className="text-base font-bold text-white group-hover:text-[var(--accent-primary)] transition-colors">
                1. Test with Past IPOs
              </h4>
              <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed">
                Choose any past IPO (such as <em>Bajaj Housing Finance</em> or <em>Premier Energies</em>) from the demo selector to inspect historical predictions against listing outcomes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onScrollToPhase1}
            className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold text-white bg-white/5 hover:bg-[var(--accent-primary)]/15 border border-white/10 hover:border-[var(--accent-primary)]/40 flex items-center justify-center gap-2 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          >
            <span>Try Demo IPO</span>
            <ArrowRight className="w-3.5 h-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </div>

        {/* Step 2: Upcoming IPOs */}
        <div className="terminal-card p-6 sm:p-7 flex flex-col justify-between space-y-4 hover:border-[var(--accent-primary)]/50 transition-colors duration-300 group">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-400 flex items-center justify-center font-bold">
              <Radio className="w-5 h-5" aria-hidden="true" />
            </div>

            <div>
              <h4 className="text-base font-bold text-white group-hover:text-[var(--accent-primary)] transition-colors">
                2. Check Upcoming IPOs
              </h4>
              <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed">
                Browse scheduled Indian IPOs in the Upcoming tab and run pre-IPO demand analysis on forthcoming offerings before bidding closes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoToUpcoming}
            className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold text-white bg-white/5 hover:bg-[var(--accent-primary)]/15 border border-white/10 hover:border-[var(--accent-primary)]/40 flex items-center justify-center gap-2 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          >
            <span>View Upcoming IPOs</span>
            <ArrowRight className="w-3.5 h-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </div>

        {/* Step 3: Check Safety & Deep Dive */}
        <div className="terminal-card p-6 sm:p-7 flex flex-col justify-between space-y-4 hover:border-[var(--accent-primary)]/50 transition-colors duration-300 group">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" aria-hidden="true" />
            </div>

            <div>
              <h4 className="text-base font-bold text-white group-hover:text-[var(--accent-primary)] transition-colors">
                3. Safety & Capital Allocation
              </h4>
              <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed">
                Inspect founder cash-out proportions (Fresh Issue vs. OFS) and review the 4-point risk audit to identify potential allocation flags.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoToDeepDive}
            className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold text-white bg-white/5 hover:bg-[var(--accent-primary)]/15 border border-white/10 hover:border-[var(--accent-primary)]/40 flex items-center justify-center gap-2 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          >
            <span>Company Deep Dive</span>
            <ArrowRight className="w-3.5 h-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};
