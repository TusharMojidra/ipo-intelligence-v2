import React, { useState, useEffect } from 'react';
import { Info, ChevronDown } from 'lucide-react';

export const InteractiveGuideTreeMap: React.FC = () => {
  // Check if animation has already played in this browser session
  const [hasAnimated, setHasAnimated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean(sessionStorage.getItem('ipo_guide_tree_animated_v3'));
    }
    return true;
  });

  const [animStage, setAnimStage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('ipo_guide_tree_animated_v3') ? 3 : 0;
    }
    return 3;
  });

  const [activeBranch, setActiveBranch] = useState<number | null>(null);
  const [mobileExpandedBranch, setMobileExpandedBranch] = useState<number>(1);

  useEffect(() => {
    if (hasAnimated) return;

    // STEP 1 (0ms): Central Root Node appears with subtle scale-up and soft indigo aura glow
    const t1 = setTimeout(() => {
      setAnimStage(1);
    }, 50);

    // STEP 2 (+150ms): The 5 Main Branches fan out sequentially from top to bottom
    const t2 = setTimeout(() => {
      setAnimStage(2);
    }, 180);

    // STEP 3 (+300ms): The 15 Leaf Cards slide into place with gentle stagger delays
    const t3 = setTimeout(() => {
      setAnimStage(3);
      sessionStorage.setItem('ipo_guide_tree_animated_v3', 'true');
      setHasAnimated(true);
    }, 450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [hasAnimated]);

  // The 5 Branches and their 15 Leaf Cards in Simple Everyday English
  // Sized compactly: Y coordinates designed to fit within ~760px height and ~1080px width
  const branchData = [
    {
      id: 1,
      title: '1. Market Weather',
      subtitle: 'Market climate and volatility baseline',
      icon: '🌤️',
      color: '#38bdf8',
      bgGlow: 'rgba(56, 189, 248, 0.15)',
      top: 30,
      anchorY: 55,
      leaves: [
        {
          top: 10,
          leafAnchorY: 30,
          icon: '📈',
          title: 'Nifty 30-Day Trend',
          desc: 'When the market is climbing (+2% to +5%), new IPOs get a strong natural boost on their first day.',
        },
        {
          top: 48,
          leafAnchorY: 68,
          icon: '⚡',
          title: 'Market Volatility',
          desc: 'Low daily price swings (below 13%) mean calm, confident listing days with lower panic risk.',
        },
        {
          top: 86,
          leafAnchorY: 106,
          icon: '🎉',
          title: 'Recent IPO Performance',
          desc: 'When recent debuts list profitably, positive momentum supports upcoming offerings.',
        },
      ],
    },
    {
      id: 2,
      title: '2. Phase 1 Heat Check',
      subtitle: 'Evaluate IPO demand before bidding',
      icon: '🔥',
      color: '#f59e0b',
      bgGlow: 'rgba(245, 158, 11, 0.15)',
      top: 180,
      anchorY: 205,
      leaves: [
        {
          top: 160,
          leafAnchorY: 180,
          icon: '🚦',
          title: 'Directional Heat Verdict',
          desc: 'Hot (>65%): Strong debut likelihood. Moderate (50–65%): Wait for day 3 bids. Cold (<50%): Discount risk.',
        },
        {
          top: 198,
          leafAnchorY: 218,
          icon: '🌱',
          title: 'Fresh Capital vs. Promoter Cash-Out',
          desc: 'Fresh Issue funds expansion and balance sheet growth. OFS proceeds go to exiting owners.',
        },
        {
          top: 236,
          leafAnchorY: 256,
          icon: '🛡️',
          title: '4-Point Safety Score',
          desc: 'Automated scan checking debt levels, valuation buffers, and promoter cash-out proportions.',
        },
      ],
    },
    {
      id: 3,
      title: '3. Subscription Demand Book',
      subtitle: 'Live institutional and retail bidding',
      icon: '👥',
      color: '#c084fc',
      bgGlow: 'rgba(192, 132, 252, 0.15)',
      top: 330,
      anchorY: 355,
      leaves: [
        {
          top: 310,
          leafAnchorY: 330,
          icon: '🏢',
          title: 'Institutional Investors (QIB)',
          desc: 'Mutual funds, banks and institutions. Over 50x–150x indicates strong debut interest.',
        },
        {
          top: 348,
          leafAnchorY: 368,
          icon: '💰',
          title: 'High Net Worth Investors (HNI / NII)',
          desc: 'Wealthy investors applying above ₹2 Lakhs; signals short-term listing appetite.',
        },
        {
          top: 386,
          leafAnchorY: 406,
          icon: '👨‍👩‍👧',
          title: 'Retail Investors (RII)',
          desc: 'Public bidding up to ₹2 Lakhs; reflects brand awareness and retail participation.',
        },
      ],
    },
    {
      id: 4,
      title: '4. Expected Listing Gain',
      subtitle: 'Expected percentage and price range',
      icon: '📈',
      color: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.15)',
      top: 480,
      anchorY: 505,
      leaves: [
        {
          top: 460,
          leafAnchorY: 480,
          icon: '🎯',
          title: 'Expected Listing Day Gain',
          desc: 'Realistic median profit percentage for debut opening, filtered of extreme outliers.',
        },
        {
          top: 498,
          leafAnchorY: 518,
          icon: '🛡️',
          title: 'Conservative Price Floor',
          desc: 'Lower bound price estimate protecting against debut volatility.',
        },
        {
          top: 536,
          leafAnchorY: 556,
          icon: '🚀',
          title: 'Bullish Price Ceiling',
          desc: 'Upper bound target price when demand and momentum surge on listing morning.',
        },
      ],
    },
    {
      id: 5,
      title: '5. Real Track Record',
      subtitle: 'Historical accuracy on recent IPOs',
      icon: '🛡️',
      color: '#06b6d4',
      bgGlow: 'rgba(6, 182, 212, 0.15)',
      top: 630,
      anchorY: 655,
      leaves: [
        {
          top: 610,
          leafAnchorY: 630,
          icon: '✅',
          title: 'Historical In-Range Rate (20/20)',
          desc: 'All 20 tracked recent Indian IPOs opened inside our predicted target corridor.',
        },
        {
          top: 648,
          leafAnchorY: 668,
          icon: '🎯',
          title: 'Average Model Error (±0.66%)',
          desc: 'Predicted profit percentage was within a fraction of 1% of the actual opening market price.',
        },
        {
          top: 686,
          leafAnchorY: 706,
          icon: '🔄',
          title: 'Card Details & Audit Breakdown',
          desc: 'Click any card on the Track Record tab to flip it and inspect the mathematical breakdown.',
        },
      ],
    },
  ];

  return (
    <div className="terminal-card p-3 sm:p-5 space-y-3">
      {/* Visual Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-card)]">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Platform Architecture Guide
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Key concepts and model mechanics explained step by step.
          </p>
        </div>
      </div>

      {/* ================= 1. DESKTOP / LAPTOP COMPACT VIEW (>=1024px) ================= */}
      <div className="hidden lg:block relative w-full max-w-[1080px] mx-auto h-[740px] bg-[#070b14]/90 border border-white/10 rounded-2xl p-3 select-none shadow-2xl overflow-hidden">
        {/* SVG BEZIER CONNECTOR LINES */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox="0 0 1080 740"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="tree-glow-sm" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* MAIN TRUNK CURVES: Root (X=170, Y=370) to 5 Branches (X=230, Y=anchorY) */}
          {branchData.map((b) => {
            const isSelected = activeBranch === b.id;
            const isDimmed = activeBranch !== null && !isSelected;
            const strokeWidth = isSelected ? 3.5 : 2.5;
            const opacity = isDimmed ? 0.2 : 0.95;

            return (
              <g key={`trunk-${b.id}`} style={{ opacity, transition: 'opacity 0.3s ease' }}>
                <path
                  d={`M 170 370 C 200 370, 200 ${b.anchorY}, 230 ${b.anchorY}`}
                  fill="none"
                  stroke={b.color}
                  strokeWidth={strokeWidth}
                  filter={isSelected ? 'url(#tree-glow-sm)' : undefined}
                />
                <circle cx={230} cy={b.anchorY} r={5} fill={b.color} stroke="#ffffff" strokeWidth={1.5} />
                <circle cx={440} cy={b.anchorY} r={5} fill={b.color} stroke="#ffffff" strokeWidth={1.5} />
              </g>
            );
          })}

          {/* SUB-BRANCH CURVES: Branch (X=440, Y=anchorY) to 3 Leaves each (X=490, Y=leafAnchorY) */}
          {branchData.map((b) => {
            const isSelected = activeBranch === b.id;
            const isDimmed = activeBranch !== null && !isSelected;
            const strokeWidth = isSelected ? 2.5 : 1.8;
            const opacity = isDimmed ? 0.2 : 0.95;

            return (
              <g key={`leaves-${b.id}`} style={{ opacity, transition: 'opacity 0.3s ease' }}>
                {b.leaves.map((leaf, lIdx) => (
                  <g key={`sub-${b.id}-${lIdx}`}>
                    <path
                      d={`M 440 ${b.anchorY} C 465 ${b.anchorY}, 465 ${leaf.leafAnchorY}, 490 ${leaf.leafAnchorY}`}
                      fill="none"
                      stroke={b.color}
                      strokeWidth={strokeWidth}
                    />
                    <circle cx={490} cy={leaf.leafAnchorY} r={4} fill={b.color} />
                  </g>
                ))}
              </g>
            );
          })}

          {/* Central Root Anchor Circle */}
          <circle cx={170} cy={370} r={6.5} fill="#818cf8" stroke="#ffffff" strokeWidth={2} />
        </svg>

        {/* ROOT NODE (LEFT) */}
        <div
          style={{
            position: 'absolute',
            left: '15px',
            top: '305px',
            width: '155px',
            zIndex: 20,
            transition: !hasAnimated ? 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            transform: animStage >= 1 ? 'scale(1)' : 'scale(0.95)',
            opacity: animStage >= 1 ? 1 : 0,
          }}
          onClick={() => setActiveBranch(null)}
          className="p-3.5 rounded-2xl text-center bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.35)] cursor-pointer hover:border-indigo-300"
          title="Click to reset"
        >
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-xl shadow-inner">
            🎯
          </div>
          <h3 className="text-xs font-bold text-white leading-tight">
            IPO Guide
          </h3>
          <p className="text-[10px] text-zinc-300 mt-1 leading-snug">
            Evaluate listings and spot risks across 5 steps.
          </p>
        </div>

        {/* 5 MAIN BRANCH CARDS (CENTER) */}
        {branchData.map((b, idx) => {
          const isSelected = activeBranch === b.id;
          const isDimmed = activeBranch !== null && !isSelected;
          const delay = !hasAnimated ? `${150 + idx * 40}ms` : '0ms';

          return (
            <div
              key={`branch-lg-${b.id}`}
              onMouseEnter={() => setActiveBranch(b.id)}
              onClick={() => setActiveBranch(activeBranch === b.id ? null : b.id)}
              style={{
                position: 'absolute',
                left: '230px',
                top: `${b.top}px`,
                width: '210px',
                height: '52px',
                zIndex: 20,
                transition: !hasAnimated
                  ? `opacity 0.4s ease ${delay}, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${delay}`
                  : 'all 0.2s ease',
                transform: animStage >= 2 ? 'translateX(0)' : 'translateX(-16px)',
                opacity: animStage >= 2 ? (isDimmed ? 0.25 : 1) : 0,
                border: `1.5px solid ${b.color}`,
              }}
              className={`p-2.5 rounded-xl bg-[#0f172a] shadow-lg flex items-center gap-2.5 cursor-pointer hover:scale-[1.02] ${
                isSelected ? 'ring-2 ring-white/50 shadow-xl' : ''
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                style={{ backgroundColor: b.bgGlow }}
              >
                {b.icon}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">
                  {b.title}
                </h4>
                <p className="text-[9px] text-zinc-400 truncate">
                  {b.subtitle}
                </p>
              </div>
            </div>
          );
        })}

        {/* 15 LEAF DETAIL CARDS (RIGHT) */}
        {branchData.map((b, bIdx) => {
          const isSelected = activeBranch === b.id;
          const isDimmed = activeBranch !== null && !isSelected;

          return (
            <React.Fragment key={`leaves-lg-fragment-${b.id}`}>
              {b.leaves.map((leaf, lIdx) => {
                const globalIdx = bIdx * 3 + lIdx;
                const delay = !hasAnimated ? `${250 + globalIdx * 30}ms` : '0ms';

                return (
                  <div
                    key={`leaf-lg-${b.id}-${lIdx}`}
                    style={{
                      position: 'absolute',
                      left: '490px',
                      top: `${leaf.top}px`,
                      width: '575px',
                      height: '35px',
                      zIndex: 20,
                      transition: !hasAnimated
                        ? `opacity 0.4s ease ${delay}, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${delay}`
                        : 'all 0.2s ease',
                      transform: animStage >= 3 ? 'translateX(0)' : 'translateX(16px)',
                      opacity: animStage >= 3 ? (isDimmed ? 0.25 : 1) : 0,
                      borderLeft: `3px solid ${b.color}`,
                    }}
                    className={`px-3 py-1.5 rounded-lg bg-[#0f172a]/95 border border-white/10 flex items-center justify-between gap-3 shadow hover:border-white/30 hover:translate-x-1 ${
                      isSelected ? 'border-white/35 shadow-lg' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-xs shrink-0">{leaf.icon}</span>
                      <h5 className="text-[11px] font-bold text-white shrink-0">
                        {leaf.title}
                      </h5>
                      <span className="text-[10px] text-zinc-400 truncate">
                        — {leaf.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* ================= 2. MOBILE DEDICATED METRO-MAP ACCORDION (<1024px) ================= */}
      <div className="block lg:hidden space-y-4">
        {/* Mobile Quick Step Selector Pills */}
        <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-xl bg-slate-900/80 border border-white/10 overflow-x-auto">
          {branchData.map((b) => {
            const isSelected = mobileExpandedBranch === b.id;
            return (
              <button
                key={`pill-${b.id}`}
                type="button"
                onClick={() => setMobileExpandedBranch(b.id)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                style={isSelected ? { color: b.color } : undefined}
              >
                <span>{b.icon}</span>
                <span>0{b.id}</span>
              </button>
            );
          })}
        </div>

        {/* Metro-Map Vertical Timeline Accordion */}
        <div className="relative pl-8 space-y-3 pt-1">
          {/* Glowing Vertical Metro Line */}
          <div className="absolute left-[13px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-sky-400 via-amber-400 to-indigo-400 opacity-30" />

          {branchData.map((b) => {
            const isOpen = mobileExpandedBranch === b.id;

            return (
              <div key={`mobile-metro-${b.id}`} className="relative">
                {/* Metro Node Bead on Track */}
                <button
                  type="button"
                  onClick={() => setMobileExpandedBranch(isOpen ? 0 : b.id)}
                  className="absolute -left-8 top-3.5 z-10 w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-[11px] transition-all duration-200 border-2 shadow-md cursor-pointer"
                  style={{
                    backgroundColor: isOpen ? b.color : '#0f172a',
                    borderColor: isOpen ? '#ffffff' : b.color,
                    color: isOpen ? '#090d16' : '#ffffff',
                    boxShadow: isOpen ? `0 0 12px ${b.color}` : 'none',
                  }}
                  aria-label={`Toggle ${b.title}`}
                >
                  {b.id}
                </button>

                {/* Branch Card Container */}
                <div
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg ${
                    isOpen
                      ? 'bg-slate-900/95 border-white/25 shadow-xl'
                      : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                  }`}
                  style={isOpen ? { borderLeft: `3px solid ${b.color}` } : undefined}
                >
                  {/* Clickable Header */}
                  <button
                    type="button"
                    onClick={() => setMobileExpandedBranch(isOpen ? 0 : b.id)}
                    className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 border border-white/10"
                        style={{ backgroundColor: b.bgGlow }}
                      >
                        {b.icon}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white tracking-tight truncate">
                          {b.title}
                        </h4>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                          {b.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10 hidden sm:inline">
                        3 concepts
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-white' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </button>

                  {/* Accordion Expanded Content (3 Leaves) */}
                  {isOpen && (
                    <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-white/5 animate-in fade-in duration-150">
                      {b.leaves.map((leaf, lIdx) => (
                        <div
                          key={`mobile-leaf-${b.id}-${lIdx}`}
                          className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 space-y-1 hover:border-white/15 transition-colors"
                          style={{ borderLeft: `2.5px solid ${b.color}` }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{leaf.icon}</span>
                            <h5 className="text-[11px] font-bold text-white">
                              {leaf.title}
                            </h5>
                          </div>
                          <p className="text-[10px] text-zinc-300 leading-relaxed pl-5">
                            {leaf.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-2 flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
        <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
        <span>Hover or tap any branch to highlight connections</span>
      </div>
    </div>
  );
};
