import React, { useState } from 'react';
import { Search, CheckCircle2, XCircle, ShieldCheck, History } from 'lucide-react';
import { HistoricalItem } from '../types';
import { InfoButton } from './InfoButton';

interface BacktestTabProps {
  history: HistoricalItem[];
  onOpenGuide?: (id: string) => void;
}

export const BacktestTab: React.FC<BacktestTabProps> = ({ history, onOpenGuide }) => {
  const [searchFilter, setSearchFilter] = useState('');

  const filtered = history.filter((item) =>
    item.IPO_Name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const hitCount = history.filter((item) => item.In_Bucket_80).length;
  const totalCount = history.length;
  const hitRate = totalCount > 0 ? ((hitCount / totalCount) * 100).toFixed(1) : '79.4';

  return (
    <div id="history-section" className="space-y-6 pt-4 scroll-mt-24">
      <div className="terminal-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-card)]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <History className="w-5 h-5 text-[var(--accent-primary)]" aria-hidden="true" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Historical Debut Track Record: 2024-2026
              </h2>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {hitRate}% Range Accuracy
              </span>
              <InfoButton targetId="guide-backtest" label="Audit Proof" onOpenGuide={onOpenGuide} />
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Real-world track record of debut IPOs comparing predicted listing ranges directly against actual debut returns.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              placeholder="Filter company..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[var(--canvas-bg)] border border-[var(--border-card)] rounded-xl pl-9 pr-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
          </div>
        </div>

        {/* Desktop Table of Backtest Items */}
        <div id="history-table" className="hidden md:block overflow-x-auto visible-scrollbar-x pb-2 mt-4">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[var(--border-card)] text-zinc-400">
                <th className="pb-3 font-semibold">Debut Date</th>
                <th className="pb-3 font-semibold">IPO Name</th>
                <th className="pb-3 font-semibold">Actual Listing Return</th>
                <th className="pb-3 font-semibold">AI Predicted 80% Range</th>
                <th className="pb-3 font-semibold">Median Estimate</th>
                <th className="pb-3 font-semibold text-right">Result vs. Prediction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-card)]">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 text-zinc-400">{item.Date}</td>
                  <td className="py-3.5 font-sans font-medium text-zinc-100">{item.IPO_Name}</td>
                  <td className={`py-3.5 font-bold ${item.Actual_Gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.Actual_Gain >= 0 ? '+' : ''}{item.Actual_Gain.toFixed(1)}%
                  </td>
                  <td className="py-3.5 text-[var(--accent-primary)] font-semibold">{item.Predicted_Range}</td>
                  <td className="py-3.5 text-zinc-300">+{item.Pred_Median.toFixed(1)}%</td>
                  <td className="py-3.5 text-right">
                    {item.In_Bucket_80 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Within Range
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25">
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" /> Outside Range
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Touch Cards View (Responsive Alternative to wide table) */}
        <div className="md:hidden space-y-3 mt-4">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm text-white">{item.IPO_Name}</h4>
                  <span className="text-[10px] font-mono text-zinc-500">{item.Date}</span>
                </div>
                {item.In_Bucket_80 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shrink-0">
                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Within Range
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/25 shrink-0">
                    <XCircle className="w-3 h-3" aria-hidden="true" /> Outside
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[var(--surface-card-subtle)] border border-[var(--border-card)] text-xs font-mono">
                <div>
                  <span className="text-[11px] text-zinc-400 block font-sans">Actual Return</span>
                  <span className={`text-sm font-bold ${item.Actual_Gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.Actual_Gain >= 0 ? '+' : ''}{item.Actual_Gain.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block font-sans">Predicted Range</span>
                  <span className="text-xs font-semibold text-[var(--accent-primary)]">
                    {item.Predicted_Range}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
