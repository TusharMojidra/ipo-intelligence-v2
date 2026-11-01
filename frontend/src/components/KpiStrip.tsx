import React from 'react';
import { InfoButton } from './InfoButton';

interface KpiStripProps {
  onOpenGuide?: (id: string) => void;
}

export const KpiStrip: React.FC<KpiStripProps> = ({ onOpenGuide }) => {
  return (
    <div id="kpi-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 terminal-card overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-card)]">
      {/* KPI 1: Phase 1 Pre-IPO Classification */}
      <div className="p-5 sm:p-6 lg:p-7 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs text-zinc-400 font-semibold block">
            Pre-IPO Direction Accuracy
          </span>
          <InfoButton targetId="guide-phase1" label="Proof" onOpenGuide={onOpenGuide} />
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">63.3%</span>
          <span className="text-xs font-mono font-semibold text-emerald-400/80">(86.4% Recall)</span>
        </div>
        <span className="text-xs text-zinc-400 block leading-relaxed">
          Catches 9 out of 10 winning debuts
        </span>
      </div>

      {/* KPI 2 */}
      <div className="p-5 sm:p-6 lg:p-7 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs text-zinc-400 font-semibold block">
            80% Price Range Accuracy
          </span>
          <InfoButton targetId="guide-dial" label="Range Band" onOpenGuide={onOpenGuide} />
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-2xl sm:text-3xl font-black font-mono text-purple-400">79.4%</span>
        </div>
        <span className="text-xs text-zinc-400 block leading-relaxed">
          166 of 209 IPOs landed in range
        </span>
      </div>

      {/* KPI 3 */}
      <div className="p-5 sm:p-6 lg:p-7 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs text-zinc-400 font-semibold block">
            Average Error Margin
          </span>
          <InfoButton targetId="guide-phase2" label="Margin" onOpenGuide={onOpenGuide} />
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100">±16.6%</span>
        </div>
        <span className="text-xs text-zinc-400 block leading-relaxed">
          Narrow deviation on debut IPOs
        </span>
      </div>

      {/* KPI 4 */}
      <div className="p-5 sm:p-6 lg:p-7 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs text-zinc-400 font-semibold block">
            Current Market Trend
          </span>
          <InfoButton targetId="guide-macro" label="Market Trend" onOpenGuide={onOpenGuide} />
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-2xl sm:text-3xl font-black font-mono text-cyan-400">Nifty Bull</span>
        </div>
        <span className="text-xs text-zinc-400 block leading-relaxed">
          +2.8% 30-day momentum
        </span>
      </div>
    </div>
  );
};
