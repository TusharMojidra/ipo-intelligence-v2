import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Compass, BarChart3, Flame, TrendingUp, Radio, History, ShieldCheck, HelpCircle, MessageSquare, Mail } from 'lucide-react';
import { AppTheme, NavigationTab } from './Header';

export interface ScaleSection {
  id: string;
  number: string;
  label: string;
  subtitle: string;
  icon?: React.ReactNode;
}

export const TAB_SECTIONS: Record<NavigationTab, ScaleSection[]> = {
  simulator: [
    {
      id: 'hero-section',
      number: '01',
      label: 'OVERVIEW',
      subtitle: 'Terminal Overview & 3D Stage',
      icon: <Compass className="w-3.5 h-3.5" />,
    },
    {
      id: 'how-to-use-section',
      number: '02',
      label: 'HOW TO USE',
      subtitle: '3-Step Quick Start Guide',
      icon: <HelpCircle className="w-3.5 h-3.5" />,
    },
    {
      id: 'kpi-section',
      number: '03',
      label: 'CLIMATE',
      subtitle: 'Market Trend & Signals',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
    },
    {
      id: 'know-more-ipo-card',
      number: '04',
      label: 'DEEP DIVE',
      subtitle: 'Safety Audit & Capital Flow',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
    {
      id: 'phase1-section',
      number: '05',
      label: 'PHASE 1',
      subtitle: 'Pre-IPO Profit Check',
      icon: <Flame className="w-3.5 h-3.5" />,
    },
    {
      id: 'phase2-section',
      number: '06',
      label: 'PHASE 2',
      subtitle: 'Listing Gain & Price Range',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
    },
  ],
  upcoming: [
    {
      id: 'upcoming-section',
      number: '01',
      label: 'OVERVIEW',
      subtitle: 'Live Pipeline Radar (0–16%)',
      icon: <Radio className="w-3.5 h-3.5" />,
    },
    {
      id: 'upcoming-ipo-grid',
      number: '02',
      label: 'OFFERINGS',
      subtitle: 'Scheduled IPO Companies (17–100%)',
      icon: <Flame className="w-3.5 h-3.5" />,
    },
  ],
  backtest: [
    {
      id: 'history-section',
      number: '01',
      label: 'RECORDS',
      subtitle: 'Historical Debut Track Record (0–100%)',
      icon: <History className="w-3.5 h-3.5" />,
    },
  ],
  guide: [
    {
      id: 'guide-overview',
      number: '01',
      label: 'OVERVIEW',
      subtitle: 'Two-Phase Architecture',
      icon: <Compass className="w-3.5 h-3.5" />,
    },
    {
      id: 'guide-macro',
      number: '02',
      label: 'MACRO',
      subtitle: 'Market Climate & Nifty 50',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
    },
    {
      id: 'guide-phase1',
      number: '03',
      label: 'PHASE 1',
      subtitle: 'Directional Classifier',
      icon: <Flame className="w-3.5 h-3.5" />,
    },
    {
      id: 'guide-capital-flow',
      number: '04',
      label: 'CAPITAL',
      subtitle: 'Fresh Capital vs. OFS Exit',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
    {
      id: 'guide-subscription',
      number: '05',
      label: 'DEMAND',
      subtitle: 'QIB, HNI & Retail Book',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
    },
    {
      id: 'guide-phase2',
      number: '06',
      label: 'PHASE 2',
      subtitle: 'Listing Gain & 80% Corridor',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
    },
    {
      id: 'guide-upcoming',
      number: '07',
      label: 'RADAR',
      subtitle: 'Upcoming IPO Discovery',
      icon: <Radio className="w-3.5 h-3.5" />,
    },
    {
      id: 'guide-backtest',
      number: '08',
      label: 'AUDIT',
      subtitle: 'Real Track Record Proof',
      icon: <History className="w-3.5 h-3.5" />,
    },
    {
      id: 'guide-tutorial',
      number: '09',
      label: 'TUTORIAL',
      subtitle: 'Step-by-Step Walkthrough',
      icon: <HelpCircle className="w-3.5 h-3.5" />,
    },
  ],
  feedback: [
    {
      id: 'feedback-section',
      number: '01',
      label: 'FEEDBACK',
      subtitle: 'Customer Bug & Idea Dispatch',
      icon: <MessageSquare className="w-3.5 h-3.5" />,
    },
  ],
  contact: [
    {
      id: 'contact-section',
      number: '01',
      label: 'CONTACT',
      subtitle: 'Official Project Channels',
      icon: <Mail className="w-3.5 h-3.5" />,
    },
  ],
};

// Legacy fallback export
export const SECTIONS: ScaleSection[] = TAB_SECTIONS.simulator;

interface SideScaleProps {
  theme?: AppTheme;
  activeTab?: NavigationTab;
  isKnowMoreOpen?: boolean;
  onOpenDeepDive?: () => void;
}

export const SideScale: React.FC<SideScaleProps> = ({
  theme = 'midnight',
  activeTab = 'simulator',
  isKnowMoreOpen = false,
  onOpenDeepDive,
}) => {
  const currentSections = TAB_SECTIONS[activeTab] || TAB_SECTIONS.simulator;
  const [scrollPct, setScrollPct] = useState<number>(0);
  const [activeSection, setActiveSection] = useState<string>(() => currentSections[0]?.id || 'hero-section');
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [ghostY, setGhostY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [sectionPcts, setSectionPcts] = useState<Record<string, number>>({});

  const trackRef = useRef<HTMLDivElement>(null);

  // Synchronize scroll metrics and active milestone
  const updateMetrics = useCallback(() => {
    const docH = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    const vh = window.innerHeight;
    const maxScroll = Math.max(1, docH - vh);
    const currentScroll = window.scrollY;
    const pct = Math.min(100, Math.max(0, (currentScroll / maxScroll) * 100));
    setScrollPct(pct);

    const pcts: Record<string, number> = {};
    const sections = TAB_SECTIONS[activeTab] || TAB_SECTIONS.simulator;
    
    // Compute accurate, invariant absolute document coordinates
    const positions: { id: string; top: number; bottom: number; height: number }[] = [];

    sections.forEach((sec, idx) => {
      const el = document.getElementById(sec.id);
      if (el) {
        const rect = el.getBoundingClientRect();
        const top = rect.top + currentScroll;
        const bottom = top + rect.height;
        const secPct = Math.min(100, Math.max(0, (top / maxScroll) * 100));
        pcts[sec.id] = secPct;
        positions.push({ id: sec.id, top, bottom, height: rect.height });
      } else {
        const fallbackPct = (idx / Math.max(1, sections.length - 1)) * 95;
        pcts[sec.id] = fallbackPct;
      }
    });

    // Check if user is scrolled to the very bottom
    if (currentScroll + vh >= docH - 40 && positions.length > 0) {
      setActiveSection(positions[positions.length - 1].id);
      setSectionPcts(pcts);
      return;
    }

    // Determine currently active section
    // Viewport focal anchor is ~35% down from top of screen
    const anchorY = currentScroll + vh * 0.35;
    let foundActive = sections[0]?.id || '';

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      if (anchorY >= p.top) {
        foundActive = p.id;
      }
    }

    if (activeTab === 'upcoming') {
      // Upcoming IPO Tab Calibration:
      // 0–16% -> 1. OVERVIEW
      // 17–100% -> 2. OFFERINGS
      pcts['upcoming-section'] = 0;
      pcts['upcoming-ipo-grid'] = 17;

      if (pct >= 17) {
        foundActive = 'upcoming-ipo-grid';
      } else {
        foundActive = 'upcoming-section';
      }
    } else if (activeTab === 'backtest') {
      // Real Track Record Tab Calibration:
      // 0–100% -> 1. RECORDS
      pcts['history-section'] = 0;
      foundActive = 'history-section';
    }

    setSectionPcts(pcts);
    setActiveSection(foundActive);
  }, [activeTab, isKnowMoreOpen]);

  useEffect(() => {
    updateMetrics();
    window.addEventListener('scroll', updateMetrics, { passive: true });
    window.addEventListener('resize', updateMetrics);

    // ResizeObserver guarantees immediate sync whenever dynamic cards expand (like Deep Dive)
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && document.body) {
      ro = new ResizeObserver(() => {
        updateMetrics();
      });
      ro.observe(document.body);
    }

    // Staggered timers to recalculate right after React DOM tab & accordion transitions
    const t1 = setTimeout(updateMetrics, 40);
    const t2 = setTimeout(updateMetrics, 120);
    const t3 = setTimeout(updateMetrics, 300);

    return () => {
      window.removeEventListener('scroll', updateMetrics);
      window.removeEventListener('resize', updateMetrics);
      if (ro) ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [updateMetrics, activeTab, isKnowMoreOpen]);

  // Scrubbing & Dragging handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!trackRef.current) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = trackRef.current.getBoundingClientRect();
    const relativeY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const targetPct = (relativeY / rect.height) * 100;
    scrollToPct(targetPct);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const relativeY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setGhostY(relativeY);

    if (isDragging) {
      const targetPct = (relativeY / rect.height) * 100;
      scrollToPct(targetPct);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerLeave = () => {
    if (!isDragging) {
      setGhostY(null);
    }
  };

  const scrollToPct = (pct: number) => {
    const docH = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    const vh = window.innerHeight;
    const maxScroll = Math.max(1, docH - vh);
    const targetY = (pct / 100) * maxScroll;
    window.scrollTo({ top: targetY, behavior: isDragging ? 'auto' : 'smooth' });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Digits for ArtCraft mechanical rolling odometer
  const roundedPct = Math.round(scrollPct);
  const hundreds = Math.floor(roundedPct / 100);
  const tens = Math.floor((roundedPct % 100) / 10);
  const ones = roundedPct % 10;

  // Major and minor ticks for frameless precision rail
  const ticks = [
    { pct: 0, major: true, label: '00' },
    { pct: 5, major: false },
    { pct: 10, major: true, label: '10' },
    { pct: 15, major: false },
    { pct: 20, major: true, label: '20' },
    { pct: 25, major: false },
    { pct: 30, major: true, label: '30' },
    { pct: 35, major: false },
    { pct: 40, major: true, label: '40' },
    { pct: 45, major: false },
    { pct: 50, major: true, label: '50' },
    { pct: 55, major: false },
    { pct: 60, major: true, label: '60' },
    { pct: 65, major: false },
    { pct: 70, major: true, label: '70' },
    { pct: 75, major: false },
    { pct: 80, major: true, label: '80' },
    { pct: 85, major: false },
    { pct: 90, major: true, label: '90' },
    { pct: 95, major: false },
    { pct: 100, major: true, label: '99' },
  ];

  return (
    <aside
      className="fixed right-1 sm:right-3 md:right-6 top-20 sm:top-24 bottom-6 sm:bottom-10 z-40 flex flex-col justify-between w-7 sm:w-12 md:w-14 select-none pointer-events-auto bg-transparent touch-none"
      aria-label="Frameless Section Navigation Scale"
    >
      {/* 1. Header: Scale Crown Label */}
      <div className="relative z-10 pb-1.5 sm:pb-2 text-right pr-1 pointer-events-none">
        <span className="block text-[7px] sm:text-[8px] font-mono text-zinc-500 font-bold">
          Scale
        </span>
      </div>

      {/* 2. Pure Frameless Hairline Track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="relative z-10 flex-1 my-1 cursor-ns-resize group touch-none"
        title="Click or drag hairline to scrub page position"
      >
        {/* The Single Frameless Hairline Guide */}
        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-[var(--border-card)] group-hover:bg-[var(--border-card-hover)] transition-colors pointer-events-none" />

        {/* Dynamic Progress Fill Line */}
        <div
          className="absolute right-0 top-0 w-[1.5px] bg-gradient-to-b from-[var(--accent-primary)] to-[var(--accent-secondary)] pointer-events-none"
          style={{
            height: `${scrollPct}%`,
            boxShadow: '0 0 6px var(--accent-glow)',
          }}
        />

        {/* Precision Micro-Ticks (Emerging frameless from the line) */}
        {ticks.map((tick) => (
          <div
            key={tick.pct}
            className="absolute right-0 flex items-center pointer-events-none"
            style={{ top: `${tick.pct}%`, transform: 'translateY(-50%)' }}
          >
            {/* Monospace percent mark on major ticks (hidden on small mobile to avoid crowding) */}
            {tick.major && (
              <span className="mr-1 sm:mr-1.5 text-[7px] sm:text-[8px] font-mono text-zinc-500 tracking-tight opacity-50 hidden sm:inline">
                {tick.label}
              </span>
            )}

            {/* Hairline Tick Pip */}
            <span
              className={`block transition-colors ${
                tick.major ? 'bg-zinc-400' : 'bg-zinc-600'
              }`}
              style={{
                width: tick.major ? '8px' : '4px',
                height: '1px',
                opacity: tick.major ? 0.75 : 0.35,
              }}
            />
          </div>
        ))}

        {/* 3. Section Milestone Beacons (Tab-Specific Navigation) */}
        {currentSections.map((sec) => {
          const secPct = sectionPcts[sec.id] ?? 0;
          const isActive = activeSection === sec.id;
          const isHovered = hoveredSection === sec.id;

          return (
            <div
              key={sec.id}
              className="absolute right-0 flex items-center pointer-events-auto cursor-pointer group/sec z-20 py-1"
              style={{ top: `${secPct}%`, transform: 'translateY(-50%)' }}
              onMouseEnter={() => setHoveredSection(sec.id)}
              onMouseLeave={() => setHoveredSection(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (sec.id === 'know-more-ipo-card' && onOpenDeepDive) {
                  onOpenDeepDive();
                } else {
                  scrollToSection(sec.id);
                }
              }}
            >
              {/* ArtCraft-style Section Flyout Eyebrow Tooltip (Left) */}
              {(isHovered || isActive) && (
                <div
                  className={`absolute right-7 sm:right-14 flex items-center gap-1.5 sm:gap-2 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border shadow-2xl backdrop-blur-xl transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 max-w-[200px] sm:max-w-none ${
                    isActive
                      ? 'bg-[var(--surface-card)]/95 border-[var(--accent-primary)] text-white shadow-2xl ring-1 ring-[var(--accent-primary)]/40'
                      : 'bg-[var(--canvas-bg)]/90 border-white/15 text-zinc-300 opacity-90'
                  }`}
                >
                  <span
                    className="font-mono text-[8px] sm:text-[9px] font-bold shrink-0"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    {sec.number}
                  </span>
                  <div className="h-2.5 sm:h-3 w-[1px] bg-white/15 shrink-0" />
                  <span className="font-mono text-[8px] sm:text-[9px] font-bold text-white truncate">
                    {sec.label}
                  </span>
                  <span className="text-[7px] sm:text-[8px] text-zinc-400 hidden md:inline truncate">
                    • {sec.subtitle}
                  </span>
                </div>
              )}

              {/* Minimalist Milestone Indicator Dot & Label */}
              <div className="flex items-center gap-0.5 sm:gap-1 mr-[-3px]">
                <span
                  className={`text-[7px] sm:text-[8px] font-mono font-bold motion-safe:transition-transform motion-safe:transition-colors duration-150 ${
                    isActive
                      ? 'text-[var(--accent-primary)] font-black motion-safe:scale-110'
                      : 'text-zinc-500 opacity-60 group-hover/sec:opacity-100 group-hover/sec:text-zinc-300'
                  }`}
                >
                  {sec.number}
                </span>

                {/* Milestone Hairline Pip Node */}
                <div
                  className={`rounded-full transition-colors duration-200 ${
                    isActive
                      ? 'w-2 h-2 bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)] ring-2 ring-[var(--accent-primary)]/30'
                      : 'w-1.5 h-1.5 bg-[var(--border-card-hover)] border border-[var(--border-card)] group-hover/sec:bg-zinc-300'
                  }`}
                />
              </div>
            </div>
          );
        })}

        {/* 4. Hover Ghost Jump Preview */}
        {ghostY !== null && !isDragging && (
          <div
            className="absolute right-0 pointer-events-none flex items-center z-15"
            style={{
              top: `${ghostY}px`,
              transform: 'translateY(-50%)',
            }}
          >
            <span className="w-4 sm:w-6 h-[1px] bg-sky-400/50 block shadow-sm" />
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 -ml-0.5" />
          </div>
        )}

        {/* 5. Active Laser Needle with Mechanical Rolling Odometer */}
        <div
          className="absolute right-0 pointer-events-none flex items-center z-30"
          style={{
            top: `${scrollPct}%`,
            transform: 'translateY(-50%)',
          }}
        >
          {/* Odometer Floating Chip */}
          <div
            className="absolute right-5 sm:right-8 flex items-center px-1 sm:px-1.5 py-0.5 rounded font-mono font-bold text-[8px] sm:text-[9px] border shadow-xl backdrop-blur-md"
            style={{
              backgroundColor: 'rgba(11, 17, 32, 0.94)',
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.6), 0 0 6px var(--accent-glow)',
            }}
          >
            {/* Animated Rolling Digit Columns */}
            <div className="ruler-digits">
              {/* Hundreds digit */}
              <div
                className="ruler-digit-col"
                style={{ transform: `translateY(-${hundreds}em)` }}
              >
                <span>0</span>
                <span>1</span>
              </div>

              {/* Tens digit */}
              <div
                className="ruler-digit-col"
                style={{ transform: `translateY(-${tens}em)` }}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>

              {/* Ones digit */}
              <div
                className="ruler-digit-col"
                style={{ transform: `translateY(-${ones}em)` }}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>
            <span className="ml-0.5 text-[7px] sm:text-[8px] font-black opacity-80">%</span>
          </div>

          {/* Laser Needle Line */}
          <div
            className="w-4 sm:w-6 md:w-7 h-[1.5px] rounded-l-full block"
            style={{
              backgroundColor: 'var(--accent-primary)',
              boxShadow: '0 0 8px var(--accent-glow)',
            }}
          />
        </div>
      </div>

      {/* 3. Footer: Scale Bottom Mark */}
      <div className="relative z-10 pt-1.5 sm:pt-2 text-right pr-1 pointer-events-none">
        <span className="block text-[7px] sm:text-[8px] font-mono text-zinc-600 font-semibold">
          100%
        </span>
      </div>
    </aside>
  );
};
