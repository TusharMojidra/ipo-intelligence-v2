import React from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { AppTheme } from './Header';
import { InteractiveGuideTreeMap } from './InteractiveGuideTreeMap';

interface GuidePageProps {
  onBackToPredictor?: () => void;
  targetSection?: string | null;
  initialSectionId?: string | null;
  theme?: AppTheme;
}

export const GuidePage: React.FC<GuidePageProps> = ({
  onBackToPredictor,
}) => {
  return (
    <div className="space-y-6 pb-16 motion-safe:animate-fadeIn">
      {/* Top Banner Navigation */}
      <div className="terminal-card p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={onBackToPredictor || (() => window.history.back())}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 mb-3 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back to Predictor Terminal</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl badge-accent flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5 text-[var(--accent-primary)]" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  IPO Predictor User Guide
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                  Visual node & branch architecture explaining every single concept in simple, friendly English.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ONLY THE GRAPHICAL NODE & BRANCH REPRESENTATION */}
      <InteractiveGuideTreeMap />
    </div>
  );
};
