import React, { useState } from 'react';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp,
  DollarSign, Building2, TrendingUp, HelpCircle
} from 'lucide-react';
import { evaluateIpoSafety, SafetyAuditInput } from '../utils/safetyAudit';

interface SafetyAuditCardProps {
  auditInput: SafetyAuditInput;
  onOpenGuide?: (id: string) => void;
}

export const SafetyAuditCard: React.FC<SafetyAuditCardProps> = ({
  auditInput,
  onOpenGuide,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const audit = evaluateIpoSafety(auditInput);

  const getStatusIcon = (status: 'safe' | 'caution' | 'neutral') => {
    if (status === 'safe') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />;
    }
    if (status === 'caution') {
      return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />;
    }
    return <Info className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />;
  };

  return (
    <div id="safety-audit-card" className="terminal-card p-5 space-y-4 transition-colors duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-card)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl badge-accent flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">
                Automated Red Flag & Safety Audit
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Checks on founder cash-out, big investor safety buffers, IPO scale, and market trend.
            </p>
          </div>
        </div>

        {/* Health Score Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${audit.ratingBg} ${audit.ratingBorder}`}>
            <span className="text-xs font-mono font-bold text-zinc-300">
              Safety Score: <strong className={audit.ratingColor}>{audit.score} / {audit.maxScore}</strong>
            </span>
            <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded bg-black/40 ${audit.ratingColor}`}>
              {audit.overallRating}
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-[var(--canvas-bg)] hover:bg-white/10 border border-[var(--border-card)] text-zinc-400 hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            title={isExpanded ? 'Collapse Audit Details' : 'Expand Audit Details'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Summary Advice Banner */}
      <div className="p-3 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] flex items-start gap-2.5 text-xs text-zinc-300">
        <Info className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-snug">
          <strong className="text-white">Investor Checklist Summary: </strong>
          {audit.summaryAdvice}
        </p>
      </div>

      {/* 4 Rule-Based Checklist Cards */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {audit.checks.map((check) => (
            <div
              key={check.id}
              className={`p-3.5 rounded-xl border transition-colors duration-200 flex flex-col justify-between space-y-2.5 ${
                check.status === 'caution'
                  ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
                  : check.status === 'safe'
                  ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                  : 'bg-[var(--canvas-bg)] border-[var(--border-card)] hover:border-sky-500/30'
              }`}
            >
              {/* Header: Title */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                  {getStatusIcon(check.status)}
                  {check.title}
                </span>
              </div>

              {/* Headline & Explanation */}
              <div>
                <h4 className="text-xs font-bold text-white leading-tight">
                  {check.headline}
                </h4>
                <p className="text-[11px] text-zinc-400 mt-1 leading-normal">
                  {check.explanation}
                </p>
              </div>

              {/* Metric Footer */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">{check.metricLabel}:</span>
                <span className="font-bold text-zinc-200">{check.metricValue}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
