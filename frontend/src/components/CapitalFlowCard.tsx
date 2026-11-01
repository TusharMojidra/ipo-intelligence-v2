import React from 'react';
import { ArrowLeftRight, TrendingUp, UserMinus, ShieldCheck, AlertCircle, Info } from 'lucide-react';
import { InfoButton } from './InfoButton';

interface CapitalFlowCardProps {
  issueSize: number;
  freshIssue: number;
  ofs: number;
  onChangeSplit: (fresh: number, ofs: number) => void;
  onOpenGuide?: (id: string) => void;
}

export const CapitalFlowCard: React.FC<CapitalFlowCardProps> = ({
  issueSize,
  freshIssue,
  ofs,
  onChangeSplit,
  onOpenGuide,
}) => {
  // Ensure valid values
  const total = Math.max(1, freshIssue + ofs);
  const freshPct = Math.round((freshIssue / total) * 100);
  const ofsPct = 100 - freshPct;

  // Handle proportion slider (0% OFS to 100% OFS)
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ofsPercentage = Number(e.target.value);
    const newOfs = Math.round((ofsPercentage / 100) * issueSize);
    const newFresh = Math.max(0, issueSize - newOfs);
    onChangeSplit(newFresh, newOfs);
  };

  const handleFreshInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(0, Number(e.target.value) || 0);
    onChangeSplit(val, ofs);
  };

  const handleOfsInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(0, Number(e.target.value) || 0);
    onChangeSplit(freshIssue, val);
  };

  const setPreset = (freshRatio: number) => {
    const newFresh = Math.round(issueSize * freshRatio);
    const newOfs = Math.max(0, issueSize - newFresh);
    onChangeSplit(newFresh, newOfs);
  };

  const isGrowthDominant = freshPct >= 60;
  const isHeavyCashout = ofsPct >= 70;

  return (
    <div id="capital-flow-card" className="terminal-card p-5 space-y-4 transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-card)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl badge-accent flex items-center justify-center font-bold">
            <ArrowLeftRight className="w-4 h-4 text-[var(--accent-primary)]" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">
                Capital Flow: Fresh Issue vs. Offer for Sale (OFS)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-semibold">
                Capital Usage Breakdown
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              See how much money enters the company for growth vs. founders and investors taking cash out.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isGrowthDominant ? (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Company Growth Capital
            </span>
          ) : isHeavyCashout ? (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
              Heavy Founder Cash-Out
            </span>
          ) : (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-300 font-bold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" aria-hidden="true" />
              Balanced 50/50 Split
            </span>
          )}
          <InfoButton targetId="guide-capital-flow" label="Capital Flow Guide" onOpenGuide={onOpenGuide} />
        </div>
      </div>

      {/* Proportional Bi-Color Stacked Bar */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            <span className="text-emerald-400 font-bold">
              Fresh Capital: ₹{freshIssue.toLocaleString()} Cr ({freshPct}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">
              Promoter Exit (OFS): ₹{ofs.toLocaleString()} Cr ({ofsPct}%)
            </span>
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
          </div>
        </div>

        <div className="h-6 w-full bg-[var(--surface-card-subtle)] rounded-xl overflow-hidden p-1 border border-[var(--border-card)] flex gap-1">
          <div
            className="h-full rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-400 flex items-center justify-center text-[10px] font-mono font-black text-black"
            style={{ width: `${Math.max(5, Math.min(95, freshPct))}%` }}
            title={`Fresh Issue: ₹${freshIssue.toLocaleString()} Cr (${freshPct}%)`}
          >
            {freshPct >= 15 ? `${freshPct}% FRESH` : ''}
          </div>
          <div
            className="h-full rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 flex items-center justify-center text-[10px] font-mono font-black text-black"
            style={{ width: `${Math.max(5, Math.min(95, ofsPct))}%` }}
            title={`Offer for Sale: ₹${ofs.toLocaleString()} Cr (${ofsPct}%)`}
          >
            {ofsPct >= 15 ? `${ofsPct}% OFS` : ''}
          </div>
        </div>
      </div>

      {/* Interactive Range Slider: 0% OFS to 100% OFS */}
      <div className="p-3.5 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-300 font-medium">Adjust Founder Cash-Out vs. Company Growth</span>
          <span className="font-mono text-[11px] text-zinc-400">
            Cash-Out Ratio: <strong className="text-white">{ofsPct}%</strong>
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={ofsPct}
          onChange={handleSliderChange}
          className="w-full cursor-pointer accent-amber-500"
          id="capital-flow-slider"
        />

        <div className="flex justify-between text-[10px] font-mono text-zinc-500">
          <span>0% OFS (100% Fresh Growth)</span>
          <span>50% / 50% Split</span>
          <span>100% OFS (Pure Promoter Exit)</span>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="text-[10px] font-mono text-zinc-400 shrink-0">Presets:</span>
          <button
            type="button"
            onClick={() => setPreset(1.0)}
            className={`flex-1 sm:flex-none text-[10px] font-mono px-2 py-1 rounded cursor-pointer border transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
              freshPct === 100
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            100% Fresh
          </button>
          <button
            type="button"
            onClick={() => setPreset(0.75)}
            className={`flex-1 sm:flex-none text-[10px] font-mono px-2 py-1 rounded cursor-pointer border transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
              freshPct === 75
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            75% Fresh
          </button>
          <button
            type="button"
            onClick={() => setPreset(0.5)}
            className={`flex-1 sm:flex-none text-[10px] font-mono px-2 py-1 rounded cursor-pointer border transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
              freshPct === 50
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            50/50 Split
          </button>
          <button
            type="button"
            onClick={() => setPreset(0.2)}
            className={`flex-1 sm:flex-none text-[10px] font-mono px-2 py-1 rounded cursor-pointer border transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
              ofsPct === 80
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            80% OFS
          </button>
        </div>
      </div>

      {/* Two Column Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Fresh Capital Card */}
        <div className="p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
              Fresh Capital (Growth)
            </span>
            <span className="font-mono font-bold text-white text-xs">
              ₹{freshIssue.toLocaleString()} Cr
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-normal">
            Proceeds credited directly to the company treasury. Earmarked for plant capital expenditure, debt retirement, strategic R&D, and corporate working capital.
          </p>
          <div className="pt-2 border-t border-emerald-500/15 flex justify-between text-[10px] font-mono text-zinc-400">
            <span>Balance Sheet Impact:</span>
            <span className="text-emerald-300 font-bold">100% Value Accretive</span>
          </div>
        </div>

        {/* OFS Cashout Card */}
        <div className="p-3.5 rounded-xl border bg-amber-500/5 border-amber-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
              <UserMinus className="w-3.5 h-3.5" aria-hidden="true" />
              Offer for Sale (Promoter Exit)
            </span>
            <span className="font-mono font-bold text-white text-xs">
              ₹{ofs.toLocaleString()} Cr
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-normal">
            Proceeds transferred directly to exiting private equity funds, venture capitalists, and promoters. <strong>None of this capital enters the company.</strong>
          </p>
          <div className="pt-2 border-t border-amber-500/15 flex justify-between text-[10px] font-mono text-zinc-400">
            <span>Company Retention:</span>
            <span className="text-amber-300 font-bold">₹0 Cr (Pure Liquidity)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
