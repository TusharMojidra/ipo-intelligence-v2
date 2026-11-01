import React, { useState } from 'react';
import {
  Flame, Sparkles, ShieldCheck, AlertTriangle, ArrowRight,
  TrendingUp, RefreshCw, BarChart2, Cpu, CheckCircle2, ArrowDown
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

  const hotProb = result?.hot_probability ?? 82.5;
  const isHot = hotProb >= 65;
  const isModerate = hotProb >= 50 && hotProb < 65;
  const isCold = hotProb < 50;

  const getHeatBadge = () => {
    if (isHot) {
      return {
        level: 'HOT',
        tag: 'HIGH DEMAND',
        text: '🔥 HOT DEMAND (High Listing Interest)',
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
        dot: 'bg-emerald-400',
        statusColor: 'text-emerald-400',
        description: 'Strong market demand and institutional backing indicated before bidding begins.',
      };
    }
    if (isModerate) {
      return {
        level: 'MODERATE',
        tag: 'SELECTIVE DEMAND',
        text: '⚡ MODERATE DEMAND (Selective Interest)',
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
        dot: 'bg-amber-400',
        statusColor: 'text-amber-400',
        description: 'Average market interest; issue will rely on subscription book momentum.',
      };
    }
    return {
      level: 'COLD',
      tag: 'WEAK DEMAND',
      text: '❄️ COLD / SUBDUED DEMAND (Discount Risk)',
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
      dot: 'bg-rose-400',
      statusColor: 'text-rose-400',
      description: 'Subdued interest; cautionary pricing and market headwind risks.',
    };
  };

  const badge = getHeatBadge();

  const handleRunPhase1 = () => {
    onRunPhase1();
    // Smoothly redirect / scroll to Phase 1 result card on mobile and stacked layouts
    setTimeout(() => {
      const el = document.getElementById('phase1-result-deck');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  return (
    <section id="phase1-section" className="space-y-8 pt-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-card)] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl badge-accent flex items-center justify-center font-bold shrink-0">
            <Flame className="w-5 h-5 text-[var(--accent-primary)]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Phase 1: Pre-IPO Profit Check
              </h2>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full badge-accent font-semibold">
                BEFORE YOU BID
              </span>
              <InfoButton targetId="guide-phase1" label="How It Works" onOpenGuide={onOpenGuide} />
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Evaluates company details & market trend before bidding closes: <strong>"Will this IPO open with positive gains?"</strong>
            </p>
          </div>
        </div>

        {/* Quick Autofill Presets */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs text-zinc-400 font-mono hidden sm:inline">Try Demo IPO:</span>
          <select
            value={companyName}
            onChange={(e) => onSelectRealIpo(e.target.value)}
            className="bg-[var(--surface-card-subtle)] border border-[var(--border-card)] rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-[var(--accent-primary)] shadow-sm focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            {REAL_IPOS.map((ipo) => (
              <option key={ipo.name} value={ipo.name}>
                {ipo.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main 2-Column Deck: Inputs (Left) vs Phase 1 Outcome (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Pre-IPO Inputs (6 cols) */}
        <div className="lg:col-span-6 terminal-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-2">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-2 font-sans">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold">1</span>
              Pre-IPO Offering Parameters
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">Known before bidding</span>
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
                <span className="text-[11px] font-mono text-zinc-500">₹ Crores</span>
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
                <span className="text-[11px] font-mono text-zinc-500">Per Share</span>
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
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs font-mono btn-accent flex items-center justify-center gap-2 cursor-pointer mt-2 transition-colors duration-200 relative overflow-hidden focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
              isSparkling
                ? 'ring-2 ring-amber-400 shadow-md motion-safe:scale-[1.01]'
                : ''
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 motion-safe:animate-spin text-white" aria-hidden="true" />
                <span>Analyzing Pre-IPO Demand...</span>
              </>
            ) : (
              <>
                {isSparkling ? (
                  <Sparkles className="w-4 h-4 text-amber-300 motion-safe:animate-spin" aria-hidden="true" />
                ) : (
                  <Flame className="w-4 h-4" aria-hidden="true" />
                )}
                <span>
                  {isSparkling
                    ? 'Pre-IPO Demand Status Live!'
                    : 'Run Phase 1: Test IPO Demand Status'}
                </span>
                {isSparkling && <Sparkles className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />}
              </>
            )}
          </button>
        </div>

        {/* Right Output: Phase 1 Classification Verdict (6 cols) */}
        <div
          id="phase1-result-deck"
          className={`lg:col-span-6 terminal-card p-6 sm:p-8 space-y-6 transition-colors duration-300 relative overflow-hidden scroll-mt-24 ${
            isSparkling
              ? 'sparkle-active-card ring-2 ring-[var(--accent-primary)] shadow-lg'
              : ''
          }`}
        >
          <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-2 relative z-20">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-2 font-sans">
              <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" aria-hidden="true" />
              Phase 1 Directional Verdict
            </span>
            <div className="flex items-center gap-2">
              {isSparkling ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1 motion-safe:animate-pulse">
                  <Sparkles className="w-3 h-3 text-emerald-300" aria-hidden="true" />
                  <span>AI Prediction Live</span>
                </span>
              ) : (
                <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">XGBoost + Random Forest</span>
              )}
              <InfoButton targetId="guide-phase1" label="Verdict Info" onOpenGuide={onOpenGuide} />
            </div>
          </div>

          {/* Top Big Heat Badge (Qualitative Demand Only) */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${badge.bg}`}>
            <div>
              <div className="text-xs text-zinc-400 font-semibold mb-1 font-sans">
                Pre-IPO Demand Category
              </div>
              <div className="text-base sm:text-xl font-black font-mono flex items-center gap-2 text-white">
                <span className={`w-3 h-3 rounded-full ${badge.dot} motion-safe:animate-pulse`} />
                <span>{badge.text}</span>
              </div>
              <p className="text-[11px] text-zinc-300 mt-1">{badge.description}</p>
            </div>
            <div className="sm:text-right shrink-0">
              <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight block ${badge.statusColor}`}>
                {badge.level}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 font-semibold">
                {badge.tag}
              </span>
            </div>
          </div>

          {/* 3-Tier Qualitative Demand Spectrum (Cold / Moderate / Hot) */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">Demand Level Spectrum</span>
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                Status: {badge.level}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className={`p-2.5 rounded-xl border text-center transition-colors duration-200 ${
                isCold
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold shadow-sm ring-1 ring-rose-400'
                  : 'bg-[var(--canvas-bg)] border-[var(--border-card)] text-zinc-500 opacity-60'
              }`}>
                <div className="text-xs font-mono font-bold">Cold Risk</div>
                <div className="text-[9px] font-mono mt-0.5">{isCold ? '● Active Signal' : 'Discount Risk'}</div>
              </div>

              <div className={`p-2.5 rounded-xl border text-center transition-colors duration-200 ${
                isModerate
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-sm ring-1 ring-amber-400'
                  : 'bg-[var(--canvas-bg)] border-[var(--border-card)] text-zinc-500 opacity-60'
              }`}>
                <div className="text-xs font-mono font-bold">Moderate</div>
                <div className="text-[9px] font-mono mt-0.5">{isModerate ? '● Active Signal' : 'Selective Demand'}</div>
              </div>

              <div className={`p-2.5 rounded-xl border text-center transition-colors duration-200 ${
                isHot
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold shadow-sm ring-1 ring-emerald-400'
                  : 'bg-[var(--canvas-bg)] border-[var(--border-card)] text-zinc-500 opacity-60'
              }`}>
                <div className="text-xs font-mono font-bold">Hot Debut</div>
                <div className="text-[9px] font-mono mt-0.5">{isHot ? '● Active Signal' : 'High Pop'}</div>
              </div>
            </div>
          </div>

          {/* Market & Fundamental Signals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-[var(--surface-card-subtle)] p-3 rounded-xl border border-[var(--border-card)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-zinc-400">Market Sentiment</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              </div>
              <div className="text-sm sm:text-base font-extrabold font-mono text-white">
                {isHot ? 'Favorable / Bullish' : isModerate ? 'Neutral Support' : 'Cautious Climate'}
              </div>
              <span className="text-[10px] text-zinc-500">Nifty trend & liquidity</span>
            </div>

            <div className="bg-[var(--surface-card-subtle)] p-3 rounded-xl border border-[var(--border-card)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-zinc-400">Expected Direction</span>
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              </div>
              <div className="text-sm sm:text-base font-extrabold font-mono text-white">
                {isHot ? 'Positive Listing Bias' : isModerate ? 'Moderate Variance' : 'Discount Risk'}
              </div>
              <span className="text-[10px] text-zinc-500">Issue size & pricing fit</span>
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

      {/* Progressive Disclosure Pipeline Conduit Bridge */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 py-2 px-2">
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-card)] to-transparent flex-1" />
        <div className="px-3 sm:px-4 py-1.5 rounded-full bg-[var(--surface-card-subtle)] border border-[var(--border-card)] text-[10px] font-mono text-zinc-400 flex items-center gap-1.5 sm:gap-2 text-center">
          <span className="hidden sm:inline">Directional Signal Confirmed</span>
          <span className="sm:hidden">Signal Ready</span>
          <ArrowDown className="w-3 h-3 text-[var(--accent-primary)] motion-safe:animate-bounce shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Feed Live Bidding Demand Into Price Range Predictor</span>
          <span className="sm:hidden">Feed Book to Phase 2</span>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-card)] to-transparent flex-1" />
      </div>
    </section>
  );
};
