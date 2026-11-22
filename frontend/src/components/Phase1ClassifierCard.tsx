import React, { useState } from 'react';
import {
  Flame, Sparkles, ShieldCheck, AlertTriangle, ArrowRight,
  TrendingUp, RefreshCw, BarChart2, Cpu, CheckCircle2
} from 'lucide-react';
import { PredictionResult } from '../types';
import { InfoButton } from './InfoButton';
import { AppTheme } from './Header';
import { NumericInput } from './NumericInput';

interface Phase1ClassifierCardProps {
  companyName: string;
  setCompanyName: (v: string) => void;
  issueSize: number;
  setIssueSize: (v: number) => void;
  offerPrice: number;
  setOfferPrice: (v: number) => void;
  nifty30: number;
  setNifty30: (v: number) => void;
  niftyVol: number;
  setNiftyVol: (v: number) => void;
  trailingGain: number;
  setTrailingGain: (v: number) => void;
  result: PredictionResult | null;
  loading: boolean;
  onRunPhase1: () => void;
  onSelectRealIpo: (name: string) => void;
  onScrollToPhase2: () => void;
  theme?: AppTheme;
  isSparkling?: boolean;
  onOpenGuide?: (id: string) => void;
}

export const REAL_IPOS = [
  { name: 'Bajaj Housing Finance', size: 6560, price: 70, qib: 222.0, hni: 43.5, rii: 7.4, total: 67.4, actualGain: 114.2 },
  { name: 'Premier Energies', size: 2830, price: 450, qib: 216.7, hni: 50.0, rii: 7.7, total: 75.0, actualGain: 120.0 },
  { name: 'Onemi Technology', size: 450, price: 175, qib: 18.2, hni: 12.0, rii: 5.4, total: 11.7, actualGain: 32.0 },
  { name: 'Bagmane Prime Office', size: 1200, price: 100, qib: 14.5, hni: 6.2, rii: 3.8, total: 8.5, actualGain: 12.0 },
  { name: 'Powerica (Weak Demand)', size: 800, price: 320, qib: 0.8, hni: 0.5, rii: 1.1, total: 0.9, actualGain: -6.0 },
];

/**
 * Phase 1: Pre-IPO Directional Classifier Module
 * 
 * Specifically answers: "IS THIS IPO HOT OR COLD?"
 * Uses the Voting Ensemble (XGBoost + Random Forest) before or during bidding.
 * Restyled with Unified Terminal Tokens (No color fragmentation).
 */
export const Phase1ClassifierCard: React.FC<Phase1ClassifierCardProps> = ({
  companyName, setCompanyName,
  issueSize, setIssueSize,
  offerPrice, setOfferPrice,
  nifty30, setNifty30,
  niftyVol, setNiftyVol,
  trailingGain, setTrailingGain,
  result,
  loading,
  onRunPhase1,
  onSelectRealIpo,
  onScrollToPhase2,
  theme = 'midnight',
  isSparkling = false,
  onOpenGuide,
}) => {
  const [showAdvancedMacro, setShowAdvancedMacro] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  const hotProb = result?.hot_probability ?? 82.5;
  const isHot = hotProb >= 65;
  const isModerate = hotProb >= 50 && hotProb < 65;
  const isCold = hotProb < 50;

  const getHeatBadge = () => {
    if (isHot) {
      return {
        level: 'Hot',
        tag: 'High demand',
        text: 'High listing interest',
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
        dot: 'bg-emerald-400',
        statusColor: 'text-emerald-400',
        description: 'Strong market demand and institutional backing indicated before bidding begins.',
      };
    }
    if (isModerate) {
      return {
        level: 'Moderate',
        tag: 'Selective demand',
        text: 'Selective interest',
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
        dot: 'bg-amber-400',
        statusColor: 'text-amber-400',
        description: 'Average market interest; issue will rely on subscription book momentum.',
      };
    }
    return {
      level: 'Cold',
      tag: 'Weak demand',
      text: 'Discount risk',
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
      dot: 'bg-rose-400',
      statusColor: 'text-rose-400',
      description: 'Subdued interest; cautionary pricing and market headwind risks.',
    };
  };

  const badge = getHeatBadge();

  const handleRunPhase1 = () => {
    setIsRefreshing(true);
    onRunPhase1();

    // Smoothly redirect / scroll to Phase 1 result card on mobile and stacked layouts
    setTimeout(() => {
      const el = document.getElementById('phase1-result-deck');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 750);
  };

  return (
    <section id="phase1-section" className="space-y-8 pt-6">
      {/* Section Header Landmark Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-950/40 via-[var(--surface-card)] to-[var(--surface-card)] p-5 sm:p-6 shadow-xl backdrop-blur-md">
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 via-orange-500 to-transparent" />
        
        {/* Subtle background animated particle or radial glow */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            {/* Animated Luminous Icon Badge */}
            <div className="relative shrink-0 mt-0.5">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 opacity-60 blur-sm animate-pulse" />
              <div className="relative w-12 h-12 rounded-xl bg-slate-900 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-lg">
                <Flame className="w-6 h-6 text-amber-400" aria-hidden="true" />
              </div>
            </div>

            <div className="space-y-2">
              {/* Eyebrow & Info Button */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  Phase 01 Classifier
                </span>
                <InfoButton targetId="guide-phase1" label="How It Works" onOpenGuide={onOpenGuide} />
              </div>

              {/* Major Section Heading */}
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug">
                Phase 1: Pre-IPO Profit Check
              </h2>

              {/* Subtitle / Objective Question */}
              <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
                Evaluates company details & market trend before bidding closes: <span className="text-amber-300 font-semibold">"Will this IPO open with positive gains?"</span>
              </p>
            </div>
          </div>

          {/* Quick Autofill Presets Selector */}
          <div className="shrink-0 flex items-center gap-2 sm:self-auto self-start">
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">Sample IPO:</span>
            <div className="relative">
              <select
                value={companyName}
                onChange={(e) => onSelectRealIpo(e.target.value)}
                className="bg-slate-900/90 border border-amber-500/25 rounded-xl px-3.5 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-400 shadow-md focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
                aria-label="Select sample IPO"
              >
                {REAL_IPOS.map((ipo) => (
                  <option key={ipo.name} value={ipo.name}>
                    {ipo.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Deck: Inputs (Left) vs Phase 1 Outcome (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Pre-IPO Inputs (6 cols) */}
        <div className="lg:col-span-6 terminal-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-2">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-2 font-sans">
              Pre-IPO Offering Parameters
            </span>
            <div className="flex items-center gap-2">
              <InfoButton targetId="guide-offering" label="Offering Facts" onOpenGuide={onOpenGuide} />
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">Company / Issue Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-[var(--canvas-bg)] border border-[var(--border-card)] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-sky-400"
              placeholder="e.g. Swiggy Limited, Hyundai Motor India"
            />
          </div>

          {/* Issue Size & Offer Price - Touch-Friendly Number Input Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="phase1-issue-size" className="text-zinc-300 font-semibold cursor-pointer">
                  Issue Size (₹ Cr)
                </label>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-mono text-zinc-400 select-none">₹</span>
                <NumericInput
                  id="phase1-issue-size"
                  min={1}
                  max={50000}
                  value={issueSize}
                  onChange={setIssueSize}
                  className="w-full bg-[var(--canvas-bg)] border border-[var(--border-card)] rounded-xl pl-7 pr-12 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-sky-400"
                  placeholder="e.g. 6560"
                />
                <span className="absolute right-3 text-xs font-mono text-zinc-400 select-none">Cr</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {[500, 1500, 6500, 12000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setIssueSize(preset)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
                  >
                    ₹{preset >= 1000 ? `${preset / 1000}k` : preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="phase1-offer-price" className="text-zinc-300 font-semibold cursor-pointer">
                  Offer Price (₹)
                </label>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-mono text-zinc-400 select-none">₹</span>
                <NumericInput
                  id="phase1-offer-price"
                  min={1}
                  max={10000}
                  value={offerPrice}
                  onChange={setOfferPrice}
                  className="w-full bg-[var(--canvas-bg)] border border-[var(--border-card)] rounded-xl pl-7 pr-14 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-sky-400"
                  placeholder="e.g. 70"
                />
                <span className="absolute right-3 text-[11px] font-mono text-zinc-400 select-none">/ share</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {[70, 250, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setOfferPrice(preset)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Collapsible Macro Context */}
          <div className="pt-2 border-t border-[var(--border-card)]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAdvancedMacro(!showAdvancedMacro)}
                className="text-xs font-mono text-[var(--accent-primary)] hover:underline flex items-center gap-1.5 py-1 cursor-pointer"
              >
                <span>{showAdvancedMacro ? 'Hide Market Macro Climate' : 'Customize Market Macro Climate (Nifty, Volatility)'}</span>
                <span>{showAdvancedMacro ? '▲' : '▼'}</span>
              </button>
              <InfoButton targetId="guide-macro" label="Nifty Signals" onOpenGuide={onOpenGuide} />
            </div>

            {showAdvancedMacro && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Nifty 30d Return</label>
                  <NumericInput
                    allowNegative={true}
                    value={nifty30}
                    onChange={setNifty30}
                    className="w-full bg-[var(--canvas-bg)] border border-[var(--border-card)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus-visible:ring-2 focus-visible:ring-sky-400"
                    placeholder="e.g. 2.8"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Nifty Volatility %</label>
                  <NumericInput
                    value={niftyVol}
                    onChange={setNiftyVol}
                    className="w-full bg-[var(--canvas-bg)] border border-[var(--border-card)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus-visible:ring-2 focus-visible:ring-sky-400"
                    placeholder="e.g. 12.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Trailing 5 IPO Gain %</label>
                  <NumericInput
                    allowNegative={true}
                    value={trailingGain}
                    onChange={setTrailingGain}
                    className="w-full bg-[var(--canvas-bg)] border border-[var(--border-card)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus-visible:ring-2 focus-visible:ring-sky-400"
                    placeholder="e.g. 35.0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* DEDICATED PHASE 1 ACTION BUTTON */}
          <button
            type="button"
            onClick={handleRunPhase1}
            disabled={loading || isRefreshing}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs font-mono btn-accent flex items-center justify-center gap-2 cursor-pointer mt-2 transition-all duration-300 relative overflow-hidden focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
              isRefreshing
                ? 'ring-2 ring-sky-400 brightness-110 shadow-lg shadow-sky-500/30'
                : isSparkling
                ? 'ring-2 ring-amber-400 shadow-md motion-safe:scale-[1.01]'
                : ''
            }`}
          >
            {loading || isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 motion-safe:animate-spin text-white" aria-hidden="true" />
                <span>Analyzing Pre-IPO Demand...</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 text-amber-300" aria-hidden="true" />
                <span>Run Phase 1: Test IPO Demand Status</span>
              </>
            )}
          </button>
        </div>

        {/* Right Output: Phase 1 Classification Verdict (6 cols) */}
        <div
          id="phase1-result-deck"
          className={`lg:col-span-6 terminal-card p-6 sm:p-8 space-y-6 transition-all duration-300 relative overflow-hidden scroll-mt-24 ${
            isRefreshing
              ? 'animate-refresh-card ring-2 ring-[var(--accent-primary)] shadow-xl shadow-sky-500/25'
              : isSparkling
              ? 'sparkle-active-card ring-2 ring-[var(--accent-primary)] shadow-lg'
              : ''
          }`}
        >
          {/* Shimmer Scan Line during Refresh */}
          {isRefreshing && (
            <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-2xl" aria-hidden="true">
              <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-[var(--accent-primary)]/30 to-transparent animate-refresh-sweep" />
            </div>
          )}

          <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-2 relative z-20">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-2 font-sans">
              <Sparkles className={`w-4 h-4 text-[var(--accent-primary)] ${isRefreshing ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
              Phase 1 Directional Verdict
            </span>
            <div className="flex items-center gap-2">
              {lastRefreshedAt && !isRefreshing && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full flex items-center gap-1.5 motion-safe:animate-fadeIn">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Refreshed {lastRefreshedAt}</span>
                </span>
              )}
              <InfoButton targetId="guide-phase1" label="Verdict Info" onOpenGuide={onOpenGuide} />
            </div>
          </div>

          {/* Top Big Heat Badge (Qualitative Demand Only) */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${badge.bg}`}>
            <div>
              <div className="text-base sm:text-xl font-black font-mono flex items-center gap-2 text-white">
                <span className={`w-3 h-3 rounded-full ${badge.dot}`} />
                <span>{badge.text}</span>
              </div>
              <p className="text-[11px] text-zinc-300 mt-1">{badge.description}</p>
            </div>
            <div className="sm:text-right shrink-0">
              <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight block ${badge.statusColor}`}>
                {badge.level}
              </span>
            </div>
          </div>

          {/* 3-Tier Qualitative Demand Spectrum (Cold / Moderate / Hot) */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-2">
              <div className={`p-2.5 rounded-xl border text-center transition-colors duration-200 ${
                isCold
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold shadow-sm ring-1 ring-rose-400'
                  : 'bg-[var(--canvas-bg)] border-[var(--border-card)] text-zinc-500 opacity-60'
              }`}>
                <div className="text-xs font-mono font-bold">Cold Risk</div>
              </div>

              <div className={`p-2.5 rounded-xl border text-center transition-colors duration-200 ${
                isModerate
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-sm ring-1 ring-amber-400'
                  : 'bg-[var(--canvas-bg)] border-[var(--border-card)] text-zinc-500 opacity-60'
              }`}>
                <div className="text-xs font-mono font-bold">Moderate</div>
              </div>

              <div className={`p-2.5 rounded-xl border text-center transition-colors duration-200 ${
                isHot
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold shadow-sm ring-1 ring-emerald-400'
                  : 'bg-[var(--canvas-bg)] border-[var(--border-card)] text-zinc-500 opacity-60'
              }`}>
                <div className="text-xs font-mono font-bold">Hot Debut</div>
              </div>
            </div>
          </div>


          {/* Action Advice & Next Step CTA */}
          <div className="pt-2 border-t border-[var(--border-card)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-zinc-300 leading-snug">
              <strong className="text-white">Investor Guidance: </strong>
              {result?.action_advice || 'Strong pre-IPO indicators suggest favorable debut conditions.'}
            </div>

            <button
              type="button"
              onClick={onScrollToPhase2}
              className="flex-shrink-0 px-4 py-2.5 rounded-xl badge-accent text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer hover:brightness-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              <span>Proceed to Phase 2</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
