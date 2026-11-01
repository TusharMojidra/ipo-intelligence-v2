import React from 'react';
import { Sparkles, Flame, TrendingUp, ShieldCheck, Database, ArrowDown } from 'lucide-react';
import { Hero3DVisual } from './Hero3DVisual';
import { AppTheme } from './Header';

interface HeroBannerProps {
  onScrollToPhase1: () => void;
  onScrollToPhase2: () => void;
  theme?: AppTheme;
}

/**
 * 55/45 Asymmetrical Split-Stage Hero Banner
 * 
 * Result of Multi-Agent Consensus:
 * - Left 55%: High-contrast, left-aligned institutional typography & dual-phase CTAs
 * - Right 45%: Contained 3D Interactive Crucible (Candlesticks, Bell, Trajectory, Coins)
 * - Zero spatial collision between text and 3D objects
 * - Strict adherence to 60-30-10 color hierarchy
 */
export const HeroBanner: React.FC<HeroBannerProps> = ({
  onScrollToPhase1,
  onScrollToPhase2,
  theme = 'midnight',
}) => {
  return (
    <section
      id="hero-section"
      className="relative w-full rounded-3xl terminal-card overflow-hidden p-6 sm:p-10 lg:p-12 shadow-2xl transition-colors duration-300"
    >
      {/* Subtle Ambient Radial Mesh (Zero text interference) */}
      <div className="absolute top-0 right-0 w-[55%] h-full bg-radial from-[var(--canvas-mesh-1)] via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Typography & CTAs (7 cols / 58%) */}
        <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
          {/* Precision Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
            Predict IPO Listing Gains <br className="hidden sm:inline" />
            <span className="text-[var(--accent-primary)]">
              With Machine Learning
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-zinc-300 max-w-xl leading-relaxed">
            Two-step analysis: First, check whether an IPO will debut at a profit before you apply. Second, predict the expected listing day gain (%) and price range once final bidding numbers are announced.
          </p>

          {/* Dual Phase Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2 w-full sm:w-auto">
            <button
              onClick={onScrollToPhase1}
              className="w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-xl text-xs sm:text-sm font-mono font-bold btn-accent flex items-center justify-center gap-2.5 transition-colors duration-200 cursor-pointer shadow-lg active:scale-95 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              <Flame className="w-4 h-4 text-amber-300" aria-hidden="true" />
              <span>Phase 1: Check IPO Heat</span>
            </button>

            <button
              onClick={onScrollToPhase2}
              className="w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-xl text-xs sm:text-sm font-mono font-bold bg-[var(--canvas-bg)] hover:bg-white/10 border border-[var(--border-card)] text-zinc-200 flex items-center justify-center gap-2.5 transition-colors duration-200 cursor-pointer hover:border-zinc-400 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              <TrendingUp className="w-4 h-4 text-[var(--accent-primary)]" aria-hidden="true" />
              <span>Phase 2: Listing Price Range</span>
            </button>
          </div>
        </div>

        {/* Right Column: Dedicated Framed 3D Stage (5 cols / 42%) */}
        <div className="lg:col-span-5 relative w-full h-[280px] sm:h-[420px] lg:h-[480px] flex items-center justify-center">
          <div className="w-full h-full rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-subtle)]/60 backdrop-blur-sm shadow-2xl overflow-hidden relative group">
            {/* Isolated Three.js Canvas */}
            <Hero3DVisual theme={theme} />

            {/* Non-obtrusive 3D Telemetry Badge */}
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[var(--surface-card-subtle)]/85 border border-[var(--border-card)] text-[10px] font-mono text-zinc-300 flex items-center gap-1.5 backdrop-blur-md pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 motion-safe:animate-ping" />
              <span>3D Live Listing Stage</span>
            </div>

            {/* Stage Footer Hint */}
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-[var(--surface-card-subtle)]/85 border border-[var(--border-card)] text-[10px] font-mono text-zinc-400 flex items-center gap-2 backdrop-blur-md pointer-events-none">
              <span className="text-emerald-400 font-bold">+38.2%</span> Expected Gain Range
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
