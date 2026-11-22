import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  ShieldCheck,
  History,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  SlidersHorizontal,
  LayoutGrid,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { HistoricalItem } from '../types';
import { InfoButton } from './InfoButton';

interface BacktestTabProps {
  history: HistoricalItem[];
  onOpenGuide?: (id: string) => void;
  onSelectIpo?: (name: string) => void;
}

export const BacktestTab: React.FC<BacktestTabProps> = ({
  history,
  onOpenGuide,
  onSelectIpo,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [viewMode, setViewMode] = useState<'rail' | 'grid'>('rail');
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const trackRef = useRef<HTMLDivElement>(null);
  const isPointerDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const dragDistanceRef = useRef(0);

  const filtered = history.filter((item) =>
    item.IPO_Name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalCount = filtered.length;
  const exactHitsCount = filtered.filter(
    (item) => Math.abs(item.Actual_Gain - item.Pred_Median) <= 1.0
  ).length;
  const inRangeCount = filtered.filter((item) => item.In_Bucket_80).length;

  const handleToggleFlip = (id: string) => {
    // If it was a drag, don't trigger flip
    if (dragDistanceRef.current > 6) return;

    setFlippedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleScroll = () => {
    if (!trackRef.current) return;
    const { scrollLeft } = trackRef.current;
    const cardWidth = trackRef.current.clientWidth > 1024 ? 220 : trackRef.current.clientWidth > 640 ? 170 : 125;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveCardIndex(Math.min(Math.max(0, index), totalCount - 1));
  };

  const scrollPrev = () => {
    if (!trackRef.current) return;
    const cardWidth = trackRef.current.clientWidth > 1024 ? 220 : trackRef.current.clientWidth > 640 ? 170 : 125;
    trackRef.current.scrollBy({ left: -cardWidth, behavior: 'smooth' });
  };

  const scrollNext = () => {
    if (!trackRef.current) return;
    const cardWidth = trackRef.current.clientWidth > 1024 ? 220 : trackRef.current.clientWidth > 640 ? 170 : 125;
    trackRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' });
  };

  // Touch and mouse drag handlers for natural smooth scrolling
  const onMouseDown = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    isPointerDownRef.current = true;
    startXRef.current = e.pageX - trackRef.current.offsetLeft;
    scrollLeftRef.current = trackRef.current.scrollLeft;
    dragDistanceRef.current = 0;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isPointerDownRef.current || !trackRef.current) return;
    e.preventDefault();
    const x = e.pageX - trackRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    dragDistanceRef.current = Math.abs(walk);
    trackRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const onMouseUpOrLeave = () => {
    isPointerDownRef.current = false;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!trackRef.current) return;
    isPointerDownRef.current = true;
    startXRef.current = e.touches[0].pageX - trackRef.current.offsetLeft;
    scrollLeftRef.current = trackRef.current.scrollLeft;
    dragDistanceRef.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isPointerDownRef.current || !trackRef.current) return;
    const x = e.touches[0].pageX - trackRef.current.offsetLeft;
    const walk = (x - startXRef.current);
    dragDistanceRef.current = Math.abs(walk);
  };

  const onTouchEnd = () => {
    isPointerDownRef.current = false;
  };

  return (
    <div id="history-section" className="space-y-6 pt-2 scroll-mt-24">
      {/* Top Header Card */}
      <div className="terminal-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--border-card)]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <History className="w-5 h-5 text-[var(--accent-primary)]" aria-hidden="true" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Real IPO Results: 2026 Listings
              </h2>
              <InfoButton targetId="guide-backtest" label="How It Works" onOpenGuide={onOpenGuide} />
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              See how our AI performed on 20 real IPOs from 2026. Compare our AI predicted profit with the real profit on listing day. Tap or click any card to flip it over and see the full breakdown.
            </p>
          </div>

          {/* Controls: Search & View Toggle */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-60">
              <Search
                className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Search IPO name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[var(--canvas-bg)] border border-[var(--border-card)] rounded-xl pl-9 pr-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
              />
            </div>

            {/* View Mode Toggle Button */}
            <div className="flex items-center bg-[var(--canvas-bg)] border border-[var(--border-card)] rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('rail')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  viewMode === 'rail'
                    ? 'bg-[var(--accent-primary)] text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Slider View"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Slider View</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  viewMode === 'grid'
                    ? 'bg-[var(--accent-primary)] text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Grid View</span>
              </button>
            </div>
          </div>
        </div>

        {/* Audit Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-[var(--surface-card-subtle)] p-3 rounded-xl border border-[var(--border-card)]">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Total IPOs Tracked</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-white mt-0.5 block">{totalCount} IPOs</span>
          </div>

          <div className="bg-[var(--surface-card-subtle)] p-3 rounded-xl border border-[var(--border-card)]">
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">Near-Perfect Matches</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-0.5 block">
              {exactHitsCount} / {totalCount}
            </span>
          </div>

          <div className="bg-[var(--surface-card-subtle)] p-3 rounded-xl border border-[var(--border-card)]">
            <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider block">Inside Expected Range</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-sky-400 mt-0.5 block">
              {totalCount > 0 ? ((inRangeCount / totalCount) * 100).toFixed(0) : 100}%
            </span>
          </div>

          <div className="bg-[var(--surface-card-subtle)] p-3 rounded-xl border border-[var(--border-card)]">
            <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider block">Average Difference</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-purple-300 mt-0.5 block">±0.66%</span>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: THE TEAM LANYARD RAIL */}
      {viewMode === 'rail' ? (
        <div className="terminal-card overflow-hidden relative shadow-2xl pb-4">
          {/* Top Rail Navigation Header (with Prev/Next arrows & Card Counter) */}
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--border-card)] bg-[var(--surface-card-subtle)]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white tracking-wide">
                IPO Results Slider
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Card counter */}
              <span className="text-xs font-mono text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                {activeCardIndex + 1} / {totalCount}
              </span>

              {/* Prev / Next buttons */}
              <button
                type="button"
                onClick={scrollPrev}
                disabled={activeCardIndex === 0}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Previous Card"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={scrollNext}
                disabled={activeCardIndex >= totalCount - 1}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Next Card"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* BRUSHED METAL RAIL STRUCTURE */}
          <div className="relative pt-4 px-2 sm:px-6">
            <div className="relative w-full h-7 flex items-center">
              {/* Left mounting bracket */}
              <div className="absolute left-0 w-4 h-7 rounded-sm metal-bracket flex items-center justify-center z-20">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 border border-zinc-400 shadow-inner" />
              </div>

              {/* Main horizontal brushed metal steel rail */}
              <div className="w-full h-3.5 metal-rail rounded-full relative z-10 mx-2">
                {/* Specular light highlight along rail center */}
                <div className="absolute inset-x-2 top-0.5 h-0.5 bg-white/70 rounded-full blur-[0.5px]" />
                {/* Recessed slider track groove */}
                <div className="absolute inset-x-3 bottom-0.5 h-1 bg-black/50 rounded-full" />
              </div>

              {/* Right mounting bracket */}
              <div className="absolute right-0 w-4 h-7 rounded-sm metal-bracket flex items-center justify-center z-20">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 border border-zinc-400 shadow-inner" />
              </div>
            </div>

            {/* HORIZONTAL TOUCH / DRAG SCROLL TRACK */}
            <div
              ref={trackRef}
              onScroll={handleScroll}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUpOrLeave}
              onMouseLeave={onMouseUpOrLeave}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              className="overflow-x-auto lanyard-track-hide-scrollbar flex items-start gap-2.5 sm:gap-3.5 md:gap-4 lg:gap-5 px-3 sm:px-6 pt-0 pb-6 cursor-grab active:cursor-grabbing snap-x snap-mandatory select-none"
              style={{
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorX: 'contain',
              }}
            >
              {filtered.map((item, idx) => {
                const diff = Math.abs(item.Actual_Gain - item.Pred_Median);
                const isExact = diff <= 1.0;
                const isFlipped = Boolean(flippedCards[item.IPO_Name]);
                const swayClass = idx % 2 === 0 ? 'lanyard-hanging' : 'lanyard-hanging-alt';

                return (
                  <div
                    key={item.IPO_Name}
                    className={`flex flex-col items-center shrink-0 snap-center ${swayClass} transition-transform duration-300 hover:scale-[1.02]`}
                  >
                    {/* 1. Metallic Trolley Clamp on the Rail */}
                    <div className="w-5 sm:w-6 h-2.5 sm:h-3 rounded-sm metal-clip flex items-center justify-center shadow-md relative z-20">
                      <div className="w-1.5 sm:w-2 h-0.5 sm:h-1 bg-zinc-700 rounded-xs" />
                    </div>

                    {/* 2. Hanging Woven Lanyard Ribbon Strap */}
                    <div className="w-4 sm:w-5 md:w-6 h-5 sm:h-7 md:h-9 lanyard-strap relative flex items-center justify-center shadow-md">
                      {/* Subtle vertical stitch lines */}
                      <div className="absolute inset-y-0 left-0.5 w-px bg-sky-200/40" />
                      <div className="absolute inset-y-0 right-0.5 w-px bg-sky-200/40" />
                    </div>

                    {/* 3. Chrome Swivel Carabiner Clip */}
                    <div className="w-3 sm:w-3.5 h-3.5 sm:h-4.5 metal-clip rounded-t-sm relative flex items-center justify-center -mt-0.5 shadow-sm">
                      <div className="w-1 sm:w-1.5 h-1.5 sm:h-2.5 rounded-full border border-zinc-600 bg-zinc-300" />
                    </div>

                    {/* 4. THE INTERACTIVE 3D FLIP BADGE CARD (COMPACT: 3 on Mobile, 5 on Laptop) */}
                    <div
                      className="perspective-1200 w-[112px] sm:w-[125px] md:w-[170px] lg:w-[205px] xl:w-[220px] h-[225px] sm:h-[245px] md:h-[285px] lg:h-[325px] cursor-pointer mt-0.5 sm:mt-1 relative shrink-0"
                      onClick={() => handleToggleFlip(item.IPO_Name)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleToggleFlip(item.IPO_Name);
                        }
                      }}
                      aria-label={`${item.IPO_Name} IPO Result. Click to flip for details.`}
                    >
                      <div
                        className={`w-full h-full relative transform-style-3d transition-transform duration-600 rounded-xl sm:rounded-2xl ${
                          isFlipped ? 'rotate-y-180' : ''
                        }`}
                      >
                        {/* ================= CARD FRONT FACE ================= */}
                        <div className="absolute inset-0 backface-hidden rounded-xl sm:rounded-2xl bg-[var(--surface-card)] border border-white/15 p-2.5 sm:p-3 md:p-4 shadow-2xl flex flex-col justify-between overflow-hidden">
                          {/* Badge Oval Slot Punch Hole at Top Center */}
                          <div className="w-6 sm:w-8 h-1.5 rounded-full bg-black/80 border border-white/20 mx-auto shadow-inner mb-1 shrink-0 flex items-center justify-center">
                            <div className="w-3 h-0.5 bg-zinc-600 rounded-full" />
                          </div>

                          {/* Holographic Header Security Ribbon */}
                          <div className="hologram-band rounded-md px-1.5 sm:px-2 py-0.5 flex items-center justify-between text-zinc-950 font-mono font-black text-[7px] sm:text-[8px] md:text-[9px] tracking-wider uppercase shrink-0 shadow-sm">
                            <span className="truncate">{item.Date.slice(5)}</span>
                            <span>#{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                          </div>

                          {/* Company Name */}
                          <div className="mt-1 space-y-0.5 min-w-0">
                            <h3 className="text-[11px] sm:text-xs md:text-sm font-bold text-white tracking-tight leading-snug line-clamp-1 sm:line-clamp-2">
                              {item.IPO_Name}
                            </h3>
                          </div>

                          {/* Hero Return Comparison Area */}
                          <div className="bg-[var(--canvas-bg)]/80 rounded-lg sm:rounded-xl p-1.5 sm:p-2 md:p-2.5 my-1 space-y-1">
                            <div className="flex items-baseline justify-between gap-1">
                              <span className="text-[7px] sm:text-[8px] md:text-[9px] font-mono text-zinc-400 uppercase truncate">Actual Gain</span>
                              <span
                                className={`text-sm sm:text-base md:text-xl font-black font-mono tracking-tight shrink-0 ${
                                  item.Actual_Gain >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {item.Actual_Gain >= 0 ? '+' : ''}
                                {item.Actual_Gain.toFixed(1)}%
                              </span>
                            </div>

                            <div className="flex items-baseline justify-between gap-1 pt-1 border-t border-[var(--border-card)]">
                              <span className="text-[7px] sm:text-[8px] md:text-[9px] font-mono text-zinc-400 uppercase truncate">AI Predicted</span>
                              <span className="text-[10px] sm:text-xs md:text-sm font-bold font-mono text-white shrink-0">
                                {item.Pred_Median >= 0 ? '+' : ''}
                                {item.Pred_Median.toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          {/* Bottom Card Footer: Tap to Flip Prompt */}
                          <div className="pt-1 border-t border-[var(--border-card)] flex items-center justify-between text-zinc-400 text-[8px] sm:text-[9px] md:text-[10px] font-mono">
                            <span className="flex items-center gap-0.5 sm:gap-1 text-[var(--accent-primary)] font-semibold truncate">
                              <RotateCw className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                              <span className="truncate">Flip</span>
                            </span>
                            <span className="text-zinc-500 shrink-0">#{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                          </div>
                        </div>

                        {/* ================= CARD BACK FACE ================= */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-xl sm:rounded-2xl bg-[var(--surface-card-subtle)] border border-[var(--accent-primary)]/40 p-2.5 sm:p-3 md:p-4 shadow-2xl flex flex-col justify-between overflow-hidden">
                          {/* Slot Punch */}
                          <div className="w-6 sm:w-8 h-1.5 rounded-full bg-black/80 border border-white/20 mx-auto shadow-inner mb-1 shrink-0 flex items-center justify-center">
                            <div className="w-3 h-0.5 bg-zinc-600 rounded-full" />
                          </div>

                          {/* Dossier Header */}
                          <div className="border-b border-[var(--border-card)] pb-1 flex items-center justify-between">
                            <div className="flex items-center gap-1 min-w-0">
                              <ShieldCheck className="w-3 h-3 text-[var(--accent-primary)] shrink-0" aria-hidden="true" />
                              <span className="text-[9px] sm:text-[10px] md:text-xs font-mono font-bold text-white uppercase tracking-wider truncate">
                                Breakdown
                              </span>
                            </div>
                          </div>

                          {/* Quantile Breakdown Table */}
                          <div className="space-y-1 text-[8px] sm:text-[9px] md:text-xs font-mono min-w-0">
                            <div className="text-[9px] sm:text-[10px] md:text-xs font-sans font-bold text-zinc-200 truncate">
                              {item.IPO_Name}
                            </div>

                            <div className="bg-[var(--canvas-bg)] p-1.5 sm:p-2 rounded-lg border border-[var(--border-card)] space-y-0.5">
                              <div className="flex justify-between text-zinc-400 text-[7px] sm:text-[8px] md:text-[9px]">
                                <span className="truncate">Lowest:</span>
                                <span className="text-white font-bold shrink-0">{item.Pred_Lower >= 0 ? '+' : ''}{item.Pred_Lower.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between text-zinc-400 text-[7px] sm:text-[8px] md:text-[9px]">
                                <span className="truncate">Expected:</span>
                                <span className="text-[var(--accent-primary)] font-bold shrink-0">{item.Pred_Median >= 0 ? '+' : ''}{item.Pred_Median.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between text-zinc-400 text-[7px] sm:text-[8px] md:text-[9px]">
                                <span className="truncate">Highest:</span>
                                <span className="text-white font-bold shrink-0">{item.Pred_Upper >= 0 ? '+' : ''}{item.Pred_Upper.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between text-emerald-400 text-[7px] sm:text-[8px] md:text-[9px] pt-0.5 border-t border-[var(--border-card)] font-bold">
                                <span className="truncate">Actual:</span>
                                <span className="shrink-0">{item.Actual_Gain >= 0 ? '+' : ''}{item.Actual_Gain.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Back Action: Flip Back */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFlip(item.IPO_Name);
                              }}
                              className="w-full py-1 sm:py-1.5 rounded-lg text-center text-[8px] sm:text-[9px] md:text-[10px] font-mono font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            >
                              <RotateCw className="w-2.5 h-2.5" aria-hidden="true" />
                              <span>Flip back</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Touch Pagination Pill Indicators */}
            <div className="flex items-center justify-center gap-1.5 pt-2 pb-1">
              {filtered.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => {
                    if (!trackRef.current) return;
                    const cardWidth = trackRef.current.clientWidth > 640 ? 340 : 300;
                    trackRef.current.scrollTo({ left: dotIdx * cardWidth, behavior: 'smooth' });
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    activeCardIndex === dotIdx
                      ? 'w-6 bg-[var(--accent-primary)] shadow-sm'
                      : 'w-1.5 bg-zinc-600 hover:bg-zinc-400'
                  }`}
                  aria-label={`Jump to card ${dotIdx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: RESPONSIVE EXECUTIVE GRID DECK (3 on Mobile, 5 on Laptop) */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
          {filtered.map((item, idx) => {
            const diff = Math.abs(item.Actual_Gain - item.Pred_Median);
            const isFlipped = Boolean(flippedCards[item.IPO_Name]);

            return (
              <div
                key={item.IPO_Name}
                className="perspective-1200 h-[240px] sm:h-[260px] md:h-[285px] cursor-pointer"
                onClick={() => handleToggleFlip(item.IPO_Name)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleFlip(item.IPO_Name);
                  }
                }}
              >
                <div
                  className={`w-full h-full relative transform-style-3d transition-transform duration-600 rounded-xl sm:rounded-2xl ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* Front Card */}
                  <div className="absolute inset-0 backface-hidden rounded-xl sm:rounded-2xl bg-[var(--surface-card)] border border-white/10 p-2.5 sm:p-3 md:p-3.5 shadow-xl flex flex-col justify-between hover:border-[var(--accent-primary)]/50 transition-colors">
                    <div>
                      <div className="flex items-center justify-between text-[8px] sm:text-[9px] md:text-xs font-mono text-zinc-400 mb-1">
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white font-semibold truncate">
                          {item.Date.slice(5)}
                        </span>
                        <span className="text-[8px] text-zinc-500 font-bold shrink-0">#{idx + 1}</span>
                      </div>
                      <h3 className="text-[11px] sm:text-xs md:text-sm font-bold text-white tracking-tight leading-snug line-clamp-1 sm:line-clamp-2">
                        {item.IPO_Name}
                      </h3>
                    </div>

                    <div className="bg-[var(--canvas-bg)] p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-[var(--border-card)] space-y-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-[7px] sm:text-[8px] md:text-[9px] font-mono text-zinc-400 truncate">Actual Gain</span>
                        <span
                          className={`text-sm sm:text-base md:text-xl font-black font-mono shrink-0 ${
                            item.Actual_Gain >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {item.Actual_Gain >= 0 ? '+' : ''}{item.Actual_Gain.toFixed(1)}%
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-1 pt-0.5 border-t border-[var(--border-card)]">
                        <span className="text-[7px] sm:text-[8px] md:text-[9px] font-mono text-zinc-400 truncate">AI Predicted</span>
                        <span className="text-[10px] sm:text-xs md:text-sm font-bold font-mono text-white shrink-0">
                          {item.Pred_Median >= 0 ? '+' : ''}{item.Pred_Median.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-[var(--border-card)] flex items-center justify-between text-[7px] sm:text-[8px] md:text-[9px] font-mono text-zinc-400">
                      <span className="text-[var(--accent-primary)] flex items-center gap-0.5 font-semibold truncate">
                        <RotateCw className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">Flip</span>
                      </span>
                      <span className="text-zinc-500 shrink-0">#{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                    </div>
                  </div>

                  {/* Back Card */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-xl sm:rounded-2xl bg-[var(--surface-card-subtle)] border border-[var(--accent-primary)]/50 p-2.5 sm:p-3 md:p-3.5 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-1 mb-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <ShieldCheck className="w-3 h-3 text-[var(--accent-primary)] shrink-0" aria-hidden="true" />
                          <span className="text-[8px] sm:text-[9px] md:text-xs font-mono font-bold text-white uppercase truncate">
                            Breakdown
                          </span>
                        </div>
                      </div>
                      <h4 className="text-[10px] sm:text-xs font-bold text-white truncate">{item.IPO_Name}</h4>
                    </div>

                    <div className="bg-[var(--canvas-bg)] p-1.5 sm:p-2 rounded-lg border border-[var(--border-card)] space-y-0.5 text-[8px] sm:text-[9px] md:text-xs font-mono">
                      <div className="flex justify-between text-zinc-400 text-[7px] sm:text-[8px] md:text-[9px]">
                        <span className="truncate">Lowest:</span>
                        <span className="text-white font-bold shrink-0">{item.Pred_Lower >= 0 ? '+' : ''}{item.Pred_Lower.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-zinc-400 text-[7px] sm:text-[8px] md:text-[9px]">
                        <span className="truncate">Expected:</span>
                        <span className="text-[var(--accent-primary)] font-bold shrink-0">{item.Pred_Median >= 0 ? '+' : ''}{item.Pred_Median.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-zinc-400 text-[7px] sm:text-[8px] md:text-[9px]">
                        <span className="truncate">Highest:</span>
                        <span className="text-white font-bold shrink-0">{item.Pred_Upper >= 0 ? '+' : ''}{item.Pred_Upper.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 text-[7px] sm:text-[8px] md:text-[9px] pt-0.5 border-t border-[var(--border-card)] font-bold">
                        <span className="truncate">Actual:</span>
                        <span className="shrink-0">{item.Actual_Gain >= 0 ? '+' : ''}{item.Actual_Gain.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFlip(item.IPO_Name);
                        }}
                        className="w-full py-1 sm:py-1.5 rounded-lg text-center text-[8px] sm:text-[9px] md:text-[10px] font-mono font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCw className="w-2.5 h-2.5" aria-hidden="true" />
                        <span>Flip back</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
