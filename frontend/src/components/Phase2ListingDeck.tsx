import React, { useState } from 'react';
import {
  TrendingUp, RefreshCw, BarChart3, CheckCircle2,
  Layers, Users, Building2, AlertCircle, Sliders, Lock, Zap, Sparkles
} from 'lucide-react';
import { PredictionResult } from '../types';
import { ListingDialGauge } from './ListingDialGauge';
import { REAL_IPOS } from './Phase1ClassifierCard';
import { InfoButton } from './InfoButton';
import { AppTheme } from './Header';
import { NumericInput } from './NumericInput';

interface Phase2ListingDeckProps {
  companyName: string;
  offerPrice: number;
  qib: number;
  setQib: (v: number) => void;
  hni: number;
  setHni: (v: number) => void;
  rii: number;
  setRii: (v: number) => void;
  total: number;
  setTotal: (v: number) => void;
  result: PredictionResult | null;
  loading: boolean;
  onRunPhase2: (overridePayload?: any) => void;
  theme?: AppTheme;
  isUpcomingMode?: boolean;
  isPhase2Unlocked?: boolean;
  onUnlockPhase2?: () => void;
  onOpenGuide?: (id: string) => void;
  isSparkling?: boolean;
}

/**
 * Phase 2: Listing Gain & 80% Corridor Forecaster Module
 * 
 * Specifically answers: "WHAT IS THE EXPECTED LISTING GAIN % & PRICE CORRIDOR?"
 * Uses Quantile Gradient Boosting + Huber Robust Regression with final subscription book.
 * Restyled with Unified Terminal Tokens.
 */
export const Phase2ListingDeck: React.FC<Phase2ListingDeckProps> = ({
  companyName,
  offerPrice,
  qib, setQib,
  hni, setHni,
  rii, setRii,
  total, setTotal,
  result,
  loading,
  onRunPhase2,
  theme = 'midnight',
  isUpcomingMode = false,
  isPhase2Unlocked = false,
  onUnlockPhase2,
  onOpenGuide,
  isSparkling = false,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  const selectedReal = REAL_IPOS.find(
    (x) => x.name.toLowerCase() === companyName.toLowerCase()
  );

  // Direct ML predictions from the trained Huber robust regressor and Quantile Range engine
  const expectedGain = (result && typeof result.expected_gain === 'number') ? result.expected_gain : 38.2;
  const rangeLower = (result && typeof result.range_lower === 'number') ? result.range_lower : 14.2;
  const rangeUpper = (result && typeof result.range_upper === 'number') ? result.range_upper : 58.6;
  const minPrice = Math.max(1, Math.round(offerPrice * (1 + (rangeLower ?? 0) / 100)));
  const maxPrice = Math.max(1, Math.round(offerPrice * (1 + (rangeUpper ?? 0) / 100)));

  const handleRunPhase2 = () => {
    setIsRefreshing(true);
    onRunPhase2();

    // Smoothly scroll down to Phase 2 result card on mobile and stacked layouts
    setTimeout(() => {
      const el = document.getElementById('phase2-result-deck');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 800);
  };


  return (
    <section id="phase2-section" className="space-y-8 pt-6 scroll-mt-24">
      {/* Section Header Landmark Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-r from-sky-950/40 via-[var(--surface-card)] to-[var(--surface-card)] p-5 sm:p-6 shadow-xl backdrop-blur-md">
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-400 via-indigo-500 to-transparent" />
        
        {/* Subtle background animated particle or radial glow */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            {/* Animated Luminous Icon Badge */}
            <div className="relative shrink-0 mt-0.5">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 opacity-60 blur-sm animate-pulse" />
              <div className="relative w-12 h-12 rounded-xl bg-slate-900 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-lg">
                <TrendingUp className="w-6 h-6 text-sky-400" aria-hidden="true" />
              </div>
            </div>

            <div className="space-y-2">
              {/* Eyebrow & Info Button */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                  Phase 02 Forecaster
                </span>
                <InfoButton targetId="guide-phase2" label="How Phase 2 Works" onOpenGuide={onOpenGuide} />
              </div>

              {/* Major Section Heading */}
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug">
                Phase 2: Expected Listing Gain & Price Range Predictor
              </h2>

              {/* Subtitle / Objective Question */}
              <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
                Evaluates final institutional & retail subscription numbers: <span className="text-sky-300 font-semibold">"What is the realistic listing profit & price range?"</span>
              </p>
            </div>
          </div>

          {/* Target Chip */}
          <div className="shrink-0 flex sm:self-auto self-start">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-sky-500/25 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <div className="text-xs font-mono">
                <span className="text-zinc-400">Target: </span>
                <strong className="text-white font-bold">{companyName}</strong>
                <span className="text-zinc-400 ml-1.5 font-normal">(Offer: ₹{offerPrice})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insufficient Data State for Upcoming IPOs (Bidding Not Closed) */}
      {isUpcomingMode && !isPhase2Unlocked && (
        <div className="terminal-card p-6 bg-amber-500/5 border border-amber-500/30 rounded-2xl space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-400" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white">
                    Insufficient Subscription Data
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                    Bidding open / pending
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  For upcoming IPOs like <strong className="text-white">{companyName}</strong>, bidding has not yet closed. 
                  Institutional (QIB), HNI, and Retail subscription books are pending, so automatic Phase 2 quantitative gain corridor prediction is withheld.
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  ✓ <strong>Phase 1 (Pre-IPO Heat Analysis)</strong> was computed automatically above based on issue size and live market conditions.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onUnlockPhase2}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center gap-2 transition-colors duration-200 shadow-md cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
            >
              <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Enter manually to simulate</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Simulation State Banner */}
      {isUpcomingMode && isPhase2Unlocked && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-xs font-mono text-sky-300 shadow-sm">
          <span className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-sky-400 motion-safe:animate-ping" aria-hidden="true" />
            Simulating Phase 2 with Custom / Estimated Subscription Book
          </span>
          <button
            type="button"
            onClick={onUnlockPhase2}
            className="text-[11px] font-semibold text-zinc-400 hover:text-white underline cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none rounded"
          >
            Reset to Awaiting State
          </button>
        </div>
      )}

      {/* Main 2-Column Deck: Subscription Inputs (Left) vs Listing Range Outputs (Right) */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start transition-opacity duration-300 ${
        isUpcomingMode && !isPhase2Unlocked ? 'opacity-40 pointer-events-none select-none blur-[0.5px]' : 'opacity-100'
      }`}>
        {/* Left Form: Subscription Ratios (5 cols) */}
        <div className="lg:col-span-5 terminal-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-2">
            <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-2">
              Subscription demand book
            </span>
            <div className="flex items-center gap-2">
              <InfoButton targetId="guide-subscription" label="Demand Book" onOpenGuide={onOpenGuide} />
            </div>
          </div>

          {/* Subscription Demand Input Boxes (Touch & Mobile Friendly) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* QIB Input Box */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="phase2-qib-input" className="text-zinc-300 font-semibold flex items-center gap-1.5 cursor-pointer">
                  <Building2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" aria-hidden="true" />
                  <span>QIB (Institutions)</span>
                </label>
                <span className="text-[11px] font-mono text-[var(--accent-primary)] font-bold">{qib}x</span>
              </div>
              <div className="relative flex items-center">
                <NumericInput
                  id="phase2-qib-input"
                  min={0}
                  max={1000}
                  value={qib}
                  onChange={setQib}
                  className="w-full bg-[var(--canvas-bg)] border border-[var(--border-card)] rounded-xl pl-3.5 pr-9 py-2.5 text-sm font-mono font-bold text-[var(--accent-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-sky-400"
                  placeholder="e.g. 50"
                />
                <span className="absolute right-3.5 text-xs font-mono font-bold text-zinc-400 select-none">x</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {[1, 10, 50, 100, 200].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQib(preset)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
                  >
                    {preset}x
                  </button>
                ))}
              </div>
            </div>

            {/* HNI Input Box */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="phase2-hni-input" className="text-zinc-300 font-semibold flex items-center gap-1.5 cursor-pointer">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                  <span>HNI / NII (Wealthy)</span>
                </label>
                <span className="text-[11px] font-mono text-white font-bold">{hni}x</span>
              </div>
              <div className="relative flex items-center">
                <NumericInput
                  id="phase2-hni-input"
                  min={0}
                  max={1000}
                  value={hni}
                  onChange={setHni}
                  className="w-full bg-[var(--canvas-bg)] border border-[var(--border-card)] rounded-xl pl-3.5 pr-9 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-sky-400"
                  placeholder="e.g. 20"
                />
                <span className="absolute right-3.5 text-xs font-mono font-bold text-zinc-400 select-none">x</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {[1, 5, 20, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setHni(preset)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
                  >
                    {preset}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* RII Input Box */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="phase2-rii-input" className="text-zinc-300 font-semibold flex items-center gap-1.5 cursor-pointer">
                  <Users className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                  <span>RII (Retail Public)</span>
                </label>
                <span className="text-[11px] font-mono text-white font-bold">{rii}x</span>
              </div>
              <div className="relative flex items-center">
                <NumericInput
                  id="phase2-rii-input"
                  min={0}
                  max={500}
                  value={rii}
                  onChange={setRii}
                  className="w-full bg-[var(--canvas-bg)] border border-[var(--border-card)] rounded-xl pl-3.5 pr-9 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-sky-400"
                  placeholder="e.g. 7.4"
                />
                <span className="absolute right-3.5 text-xs font-mono font-bold text-zinc-400 select-none">x</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {[0.5, 2, 5, 15, 30].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRii(preset)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
                  >
                    {preset}x
                  </button>
                ))}
              </div>
            </div>

            {/* Total Subscription Input Box */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="phase2-total-input" className="text-zinc-300 font-semibold cursor-pointer">
                  <span>Total Subscription</span>
                </label>
                <span className="text-[11px] font-mono text-white font-bold">{total}x</span>
              </div>
              <div className="relative flex items-center">
                <NumericInput
                  id="phase2-total-input"
                  min={0}
                  max={1000}
                  value={total}
                  onChange={setTotal}
                  className="w-full bg-[var(--canvas-bg)] border border-[var(--border-card)] rounded-xl pl-3.5 pr-9 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-sky-400"
                  placeholder="e.g. 67.4"
                />
                <span className="absolute right-3.5 text-xs font-mono font-bold text-zinc-400 select-none">x</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {[1, 10, 30, 60, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTotal(preset)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
                  >
                    {preset}x
                  </button>
                ))}
              </div>
            </div>
          </div>


          {/* DEDICATED PHASE 2 ACTION BUTTON */}
          <button
            type="button"
            onClick={handleRunPhase2}
            disabled={loading || isRefreshing}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs btn-accent flex items-center justify-center gap-2 cursor-pointer mt-3 transition-all duration-300 relative overflow-hidden focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
              isRefreshing
                ? 'ring-2 ring-emerald-400 brightness-110 shadow-xl shadow-emerald-500/30'
                : isSparkling
                ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/20'
                : ''
            }`}
          >
            {loading || isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 motion-safe:animate-spin text-white" aria-hidden="true" />
                <span>Calculating Listing Price Corridor...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 text-white" aria-hidden="true" />
                <span>Run Phase 2: Predict listing price range</span>
              </>
            )}
          </button>
        </div>

        {/* Right Output: Phase 2 Predicted Range & Dial Gauge (7 cols) */}
        <div id="phase2-result-deck" className="lg:col-span-7 space-y-6 scroll-mt-24">
          {/* Card 1: Listing Dial Gauge & Primary % */}
          <div
            className={`terminal-card p-6 sm:p-8 space-y-6 transition-all duration-300 relative overflow-hidden ${
              isRefreshing
                ? 'animate-refresh-card ring-2 ring-emerald-400 shadow-2xl shadow-emerald-500/25'
                : isSparkling
                ? 'sparkle-active-card ring-2 ring-[var(--accent-primary)] shadow-lg shadow-sky-500/20'
                : ''
            }`}
          >
            {/* Shimmer Scan Line during Refresh */}
            {isRefreshing && (
              <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-2xl" aria-hidden="true">
                <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent animate-refresh-sweep" />
              </div>
            )}

            {/* Floating Sparkle Twinkles when activated */}
            {isSparkling && (
              <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
                <Sparkles className="absolute top-2 left-1/4 text-amber-300 w-4 h-4 motion-safe:animate-ping" />
                <Sparkles className="absolute top-1/2 right-6 text-sky-400 w-4 h-4 motion-safe:animate-pulse" />
                <Sparkles className="absolute bottom-4 left-10 text-emerald-300 w-4 h-4 motion-safe:animate-ping" />
                <Sparkles className="absolute top-8 right-1/3 text-indigo-300 w-4 h-4 motion-safe:animate-pulse" />
              </div>
            )}

            <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-2 relative z-20">
              <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-2">
                <Sparkles className={`w-4 h-4 text-[var(--accent-primary)] ${isRefreshing ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
                Expected listing gain and price range
              </span>
              <div className="flex items-center gap-2">
                {lastRefreshedAt && !isRefreshing && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full flex items-center gap-1.5 motion-safe:animate-fadeIn">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Refreshed {lastRefreshedAt}</span>
                  </span>
                )}
                <InfoButton targetId="guide-dial" label="Dial & Range" onOpenGuide={onOpenGuide} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Dial Gauge Visual (5 cols) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center">
                <ListingDialGauge
                  expectedGain={expectedGain}
                  rangeLower={rangeLower}
                  rangeUpper={rangeUpper}
                  verdictColor={
                    (result?.verdict_color as 'emerald' | 'cyan' | 'rose') ||
                    (expectedGain >= 15 ? 'emerald' : expectedGain >= 0 ? 'cyan' : 'rose')
                  }
                  isRefreshing={isRefreshing}
                />
              </div>

              {/* Expected Numbers (7 cols) */}
              <div className="md:col-span-7 space-y-3">
                <div>
                  <span className="text-xs font-mono text-zinc-400 block">
                    Most likely listing gain
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-4xl sm:text-5xl font-black font-mono transition-transform duration-300 ${
                        isRefreshing ? 'scale-105 brightness-125' : ''
                      } ${
                        expectedGain >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {expectedGain >= 0 ? '+' : ''}{expectedGain}%
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-card-subtle)] border border-[var(--border-card)] space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-mono">Expected range:</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {rangeLower >= 0 ? '+' : ''}{rangeLower}% to {rangeUpper >= 0 ? '+' : ''}{rangeUpper}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-mono">Price corridor:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      ₹{minPrice} to ₹{maxPrice}
                    </span>
                  </div>
                </div>

                {/* Real-time Model Key Driver & Verdict Status Pill */}
                <div className="p-2.5 rounded-xl bg-sky-500/5 border border-sky-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
                    <span className="text-[11px] font-mono leading-tight">
                      {result?.key_drivers?.[0] || (qib >= 15 ? `Heavy Institutional Demand (${qib}x QIB)` : `Institutional demand evaluated at ${qib}x QIB`)}
                    </span>
                  </div>
                  {result?.verdict_badge && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-black shrink-0 ${
                      expectedGain >= 15
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : expectedGain >= 0
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {result.verdict_badge}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Real Historical Comparison (if selected) */}
          {selectedReal && (
            <div className="terminal-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-1.5">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  Historical truth verification • {selectedReal.name}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-[var(--surface-card-subtle)] p-2.5 rounded-xl border border-[var(--border-card)]">
                  <span className="text-zinc-500 text-[10px] block">Actual listing gain</span>
                  <span className="text-base font-extrabold text-emerald-400">
                    +{selectedReal.actualGain}%
                  </span>
                </div>
                <div className="bg-[var(--surface-card-subtle)] p-2.5 rounded-xl border border-[var(--border-card)]">
                  <span className="text-zinc-500 text-[10px] block">Expected range</span>
                  <span className="text-base font-extrabold text-white">
                    {rangeLower >= 0 ? '+' : ''}{rangeLower}% to {rangeUpper >= 0 ? '+' : ''}{rangeUpper}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
