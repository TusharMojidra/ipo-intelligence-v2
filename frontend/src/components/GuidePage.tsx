import React, { useEffect } from 'react';
import {
  ArrowLeft, BookOpen, Compass, Flame, TrendingUp, Radio, History,
  Building2, Users, BarChart3, AlertCircle, CheckCircle2, ShieldCheck,
  Sparkles, DollarSign, Activity, HelpCircle, Layers, ArrowRight, Lightbulb,
  Zap, AlertTriangle
} from 'lucide-react';

import { AppTheme } from './Header';

interface GuidePageProps {
  onBackToPredictor: () => void;
  targetSection?: string | null;
  theme?: AppTheme;
}

export const GuidePage: React.FC<GuidePageProps> = ({
  onBackToPredictor,
  targetSection,
  theme = 'midnight',
}) => {
  useEffect(() => {
    if (targetSection) {
      setTimeout(() => {
        const el = document.getElementById(targetSection);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          el.classList.add('ring-2', 'ring-sky-400', 'ring-offset-4', 'ring-offset-[#0B1120]');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-sky-400', 'ring-offset-4', 'ring-offset-[#0B1120]');
          }, 2500);
        }
      }, 150);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [targetSection]);

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-10 pb-16 motion-safe:animate-fadeIn">
      {/* Top Banner & Navigation */}
      <div className="terminal-card p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-card)]">
          <div>
            <button
              onClick={onBackToPredictor}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 mb-4 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back to Predictor Terminal</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl badge-accent flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5 text-[var(--accent-primary)]" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  IPO Predictor User Guide
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  Simple, step-by-step instructions with visual breakdowns of how the predictor works.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
              ✓ Beginner Friendly
            </span>
          </div>
        </div>

        {/* Quick-Jump Index Pills */}
        <div className="mt-5">
          <span className="text-xs text-zinc-400 block mb-2 font-bold font-sans">
            Jump Directly To Topic:
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'guide-overview', label: '1. Two-Phase Architecture' },
              { id: 'guide-macro', label: '2. Market Climate & Nifty' },
              { id: 'guide-phase1', label: '3. Phase 1 (Hot or Cold)' },
              { id: 'guide-capital-flow', label: '4. Capital Flow (Fresh vs OFS)' },
              { id: 'guide-subscription', label: '5. QIB, HNI & Retail Book' },
              { id: 'guide-phase2', label: '6. Phase 2 (Listing Gain & Range)' },
              { id: 'guide-upcoming', label: '7. Upcoming IPO Radar' },
              { id: 'guide-backtest', label: '8. Real Track Record' },
              { id: 'guide-tutorial', label: '9. Step-by-Step Tutorial' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => scrollToId(btn.id)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--canvas-bg)] hover:bg-[var(--accent-primary)]/20 text-zinc-300 hover:text-white border border-[var(--border-card)] transition-colors duration-200 cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 1: TWO-PHASE ARCHITECTURE OVERVIEW */}
      <section id="guide-overview" className="terminal-card p-6 sm:p-8 space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-4">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Why Does This Tool Have Two Separate Phases?</h2>
            <p className="text-xs text-zinc-400">The core secret to realistic IPO forecasting</p>
          </div>
        </div>

        <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
          <p>
            When a new company announces an IPO, investors ask two very different questions at two completely different times:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/25 space-y-2">
              <span className="text-xs font-bold text-sky-400 block font-sans">
                Question 1: Before Bidding Opens
              </span>
              <p className="text-base font-bold text-white">
                "Is this IPO fundamentally HOT or NOT?"
              </p>
              <p className="text-xs text-zinc-400 leading-normal">
                Bidding hasn't started yet. We only know how big the IPO is, the price per share, and current market conditions. That is what <strong>Phase 1 (Pre-IPO Heat Analysis)</strong> answers.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/25 space-y-2">
              <span className="text-xs font-bold text-indigo-400 block font-sans">
                Question 2: After Bidding Closes
              </span>
              <p className="text-base font-bold text-white">
                "What is the realistic listing day profit %?"
              </p>
              <p className="text-xs text-zinc-400 leading-normal">
                Now bidding is closed! We know exactly how many times institutions (QIB), rich individuals (HNI), and retail applied. That is what <strong>Phase 2 (Listing Gain & Price Range)</strong> predicts.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-300">
              <strong className="text-amber-300 block mb-1">Common Mistake in Other Apps:</strong>
              Trying to predict exact listing gain percentage before bidding closes is pure gambling. Real institutional investors wait for the demand numbers. That's why our system separates <strong>Pre-IPO Profit Check (Phase 1)</strong> from <strong>Listing Gain & Price Range (Phase 2)</strong>.
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: MACRO CLIMATE & NIFTY */}
      <section id="guide-macro" className="terminal-card p-6 sm:p-8 space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Understanding The Market Trend & Climate</h2>
            <p className="text-xs text-zinc-400">Why even great companies flop when the overall market is in a downtrend</p>
          </div>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed">
          An IPO is like a ship setting sail. Even the finest ship struggles in a hurricane. Our AI measures 3 crucial weather indicators for the Indian stock market (Nifty 50):
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[var(--canvas-bg)] p-4 rounded-xl border border-[var(--border-card)] space-y-2">
            <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Nifty 30-Day Return
            </span>
            <p className="text-xs text-zinc-300 leading-normal">
              <strong>"The Market Tide"</strong>: Has the Nifty 50 been going up or down over the past month? A rising market (+2% to +5%) lifts debut day gains. A falling market hurts listings.
            </p>
          </div>

          <div className="bg-[var(--canvas-bg)] p-4 rounded-xl border border-[var(--border-card)] space-y-2">
            <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4" /> Market Volatility
            </span>
            <p className="text-xs text-zinc-300 leading-normal">
              <strong>"The Fear Index"</strong>: How violently is the market swinging? Low volatility (below 13%) creates calm, confident listings. High volatility causes panicky debuts.
            </p>
          </div>

          <div className="bg-[var(--canvas-bg)] p-4 rounded-xl border border-[var(--border-card)] space-y-2">
            <span className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4" /> Trailing 5 IPO Debut
            </span>
            <p className="text-xs text-zinc-300 leading-normal">
              <strong>"Market Appetite"</strong>: How did the last 5 IPOs list? When recent IPOs make handsome profits, investor excitement runs high and spreads to the next IPO.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: PHASE 1 PRE-IPO CLASSIFIER */}
      <section id="guide-phase1" className="terminal-card p-6 sm:p-8 space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-4">
          <div className="w-8 h-8 rounded-xl badge-accent flex items-center justify-center font-bold text-sm">
            <Flame className="w-4 h-4 text-[var(--accent-primary)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Phase 1: Pre-IPO Heat Analysis (Hot or Not?)</h2>
            <p className="text-xs text-zinc-400">Evaluates issue size, pricing fundamentals, and live market sentiment</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-zinc-300">
          <p>
            Phase 1 evaluates only the structural facts of the offering before bidding starts:
          </p>

          <div id="guide-offering" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)]">
              <strong className="text-white text-xs block mb-1">Issue Size (₹ Crores):</strong>
              <p className="text-xs text-zinc-400">
                How much total cash the company is raising. Huge mega-issues (&gt;₹5,000 Cr) require immense money to absorb, while smaller compact issues (&lt;₹500 Cr) can pop much easier.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)]">
              <strong className="text-white text-xs block mb-1">Offer Price (₹):</strong>
              <p className="text-xs text-zinc-400">
                The upper price band per share set by the company and investment bankers.
              </p>
            </div>
          </div>

          <h3 className="text-base font-bold text-white pt-2">How to Read the 3 Verdict Badges:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
              <span className="text-xs font-bold font-mono text-emerald-400 flex items-center gap-1.5">
                HOT (&gt;65% Probability)
              </span>
              <p className="text-xs text-zinc-300">
                <strong>Strong debut expected.</strong> Sizing, valuation, and market climate heavily favor a profitable debut day.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
              <span className="text-xs font-bold font-mono text-amber-400 flex items-center gap-1.5">
                MODERATE (50% - 65%)
              </span>
              <p className="text-xs text-zinc-300">
                <strong>Selective demand.</strong> Modest gains expected. Listing success will depend on institutional anchor trust.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1.5">
              <span className="text-xs font-bold font-mono text-rose-400 flex items-center gap-1.5">
                COLD / HIGH RISK (&lt;50%)
              </span>
              <p className="text-xs text-zinc-300">
                <strong>Discount risk.</strong> Adverse market conditions or expensive valuation suggest high chance of listing flat or below offer price.
              </p>
            </div>
          </div>

          {/* Phase 1 Verified Accuracy Spotlight */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 mt-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Phase 1 Verified Accuracy
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                86.4% Winning IPO Recall
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-normal">
              Tested on <strong>210 out-of-sample debut Indian IPOs (2024-2026)</strong>, Phase 1 achieved <strong>63.3% overall directional accuracy</strong> and <strong>86.4% recall on profitable debuts</strong> (correctly catching 127 of 147 winning IPOs in advance before bidding opens).
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3B: CAPITAL FLOW (FRESH ISSUE VS OFS) */}
      <section id="guide-capital-flow" className="terminal-card p-6 sm:p-8 space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-4">
          <div className="w-8 h-8 rounded-xl badge-accent flex items-center justify-center font-bold text-sm">
            <Layers className="w-4 h-4 text-[var(--accent-primary)]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Capital Flow: Fresh Issue vs. Offer for Sale (OFS)</h2>
            <p className="text-xs text-zinc-400">Where the IPO money actually goes: Company Treasury vs. Exiting Investors</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
            <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" aria-hidden="true" /> Fresh Issue Capital (Growth Focus)
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed">
              New shares issued by the company. <strong>100% of these proceeds enter the company balance sheet.</strong> This capital is used to build new factories, pay down high-interest debt, invest in R&D, and fuel top-line revenue expansion. High Fresh Issue proportion (&gt;60%) is a strong green flag.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" aria-hidden="true" /> Offer for Sale (Promoter / PE Exit)
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Existing shares sold by founders, early promoters, and venture capital funds. <strong>Zero rupees from the OFS enter the company treasury.</strong> Instead, cash flows directly into the personal bank accounts of exiting shareholders. Heavy OFS (&gt;70%) represents an aggressive liquidity cash-out caution flag.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: THE 3 SUBSCRIPTION MULTIPLES */}
      <section id="guide-subscription" className="terminal-card p-6 sm:p-8 space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-sm">
            4
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">The Subscription Book (QIB, HNI & Retail Demand)</h2>
            <p className="text-xs text-zinc-400">The single most powerful force that dictates listing day prices</p>
          </div>
        </div>

        <div className="text-sm text-zinc-300 space-y-4">
          <p>
            When bidding is open for 3 days, India's stock exchanges track applications across three distinct groups:
          </p>

          <div className="space-y-3">
            <div id="guide-qib" className="p-4 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-sky-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-base">QIB: Qualified Institutional Buyers</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
                    The Smart Money
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Mutual funds (HDFC, SBI, ICICI), foreign institutional investors (FIIs), and pension giants. They employ hundreds of financial analysts. 
                  When QIB subscribes over <strong>50x to 150x</strong> (like in Bajaj Housing Finance or Premier Energies), the listing pop is almost guaranteed to be huge.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6 text-purple-400" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-base">HNI / NII: Non-Institutional Investors</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                    High Net Worth
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Wealthy individuals applying with more than ₹2 Lakhs per application. They often borrow short-term funds from NBFCs to bid aggressively, so they are deeply motivated by quick listing profits.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-emerald-400" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-base">RII: Retail Individual Investors</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    Everyday Citizens
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Regular people applying up to ₹2 Lakhs. High retail participation shows broad public brand recognition and buzz.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: PHASE 2 & DIAL GAUGE */}
      <section id="guide-phase2" className="terminal-card p-6 sm:p-8 space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-4">
          <div className="w-8 h-8 rounded-xl badge-accent flex items-center justify-center font-bold text-sm">
            <TrendingUp className="w-4 h-4 text-[var(--accent-primary)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Phase 2: Listing Gain Corridor & 80% Realistic Range</h2>
            <p className="text-xs text-zinc-400">Why expecting a single exact percentage is dangerous</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-zinc-300">
          <p>
            In the stock market, anyone who promises an exact number like *"This IPO will list at exactly +42.3%"* is misleading you. Market openings have volatility.
          </p>

          <div id="guide-dial" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] space-y-2">
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> 1. Realistic Target Gain (Outlier-Filtered)
              </span>
              <p className="text-xs text-zinc-400 leading-normal">
                Standard averages get distorted by extreme speculative hype (like when an IPO randomly triples). Our predictor filters out speculative bubbles to give you a solid, grounded estimate.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] space-y-2">
              <span className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" /> 2. The 80% Confidence Corridor
              </span>
              <p className="text-xs text-zinc-400 leading-normal">
                Predicts a realistic <strong>Price Floor</strong> and <strong>Price Ceiling</strong>. In our tests on 210+ recent real Indian IPOs, <strong>79.4% of all IPO debuts landed right inside this band!</strong>
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-2">
            <h4 className="text-white font-bold text-sm">How to Read the Listing Price Bounds:</h4>
            <p className="text-xs text-zinc-300">
              If an IPO's offer price is <strong>₹100</strong> and the model predicts an 80% corridor of <strong>+20% to +45%</strong>, your estimated opening day price is:
            </p>
            <div className="p-3 rounded-lg bg-[var(--canvas-bg)] font-mono text-xs flex justify-around text-zinc-200">
              <span>Conservative Floor: <strong className="text-white">₹120</strong></span>
              <span className="text-zinc-600">|</span>
              <span>Expected Target: <strong className="text-emerald-400">₹132</strong></span>
              <span className="text-zinc-600">|</span>
              <span>Bullish Ceiling: <strong className="text-sky-400">₹145</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: UPCOMING IPO RADAR */}
      <section id="guide-upcoming" className="terminal-card p-6 sm:p-8 space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-4">
          <div className="w-8 h-8 rounded-xl badge-accent flex items-center justify-center font-bold text-sm">
            <Radio className="w-4 h-4 text-[var(--accent-primary)] animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Using The Upcoming IPO Pipeline Radar</h2>
            <p className="text-xs text-zinc-400">Real-time tracking of new offerings before bidding begins</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-zinc-300">
          <p>
            Our backend automatically scrapes public market feeds (NSE India, official exchanges, and GMP aggregators) to discover newly announced IPOs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] space-y-2">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                1-Click "Analyze with Phase 1 AI"
              </span>
              <p className="text-xs text-zinc-400 leading-normal">
                Clicking this on any upcoming card automatically fills the company name, size, and price, merges current live Nifty momentum, and triggers Phase 1 instantly with celebratory sparkles!
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] space-y-2">
              <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                Why Phase 2 Shows "Insufficient Data"
              </span>
              <p className="text-xs text-zinc-400 leading-normal">
                Because bidding is still pending! The subscription book (QIB/HNI/Retail) does not exist yet. You can click <strong>"Enter Manually To Simulate"</strong> to test custom demand numbers yourself.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: HISTORICAL TRACK RECORD & PROOF */}
      <section id="guide-backtest" className="terminal-card p-6 sm:p-8 space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
            <History className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Track Record & Historical Proof</h2>
            <p className="text-xs text-zinc-400">Tested strictly out-of-sample on 210+ recent Indian IPOs</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-zinc-300">
          <p>
            Our system is evaluated on real, unmanipulated debut data. We evaluate strictly on recent debut IPOs (2024 through 2026) to verify real-world accuracy.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] text-center">
              <span className="text-2xl font-black font-mono text-emerald-400">86.4%</span>
              <span className="text-xs text-zinc-400 block mt-1 font-sans">Phase 1 Win Recall</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] text-center">
              <span className="text-2xl font-black font-mono text-cyan-400">63.3%</span>
              <span className="text-xs text-zinc-400 block mt-1 font-sans">Pre-IPO Accuracy</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] text-center">
              <span className="text-2xl font-black font-mono text-purple-400">79.4%</span>
              <span className="text-xs text-zinc-400 block mt-1 font-sans">Phase 2 Corridor Hit</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] text-center">
              <span className="text-2xl font-black font-mono text-sky-400">±16.6%</span>
              <span className="text-xs text-zinc-400 block mt-1 font-sans">Phase 2 Margin</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: STEP-BY-STEP QUICK START */}
      <section id="guide-tutorial" className="terminal-card p-6 sm:p-8 space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-4">
          <div className="w-8 h-8 rounded-xl badge-accent flex items-center justify-center font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">4-Step Quick Tutorial For Investors</h2>
            <p className="text-xs text-zinc-400">How to use this terminal for upcoming IPO decisions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] space-y-2">
            <span className="w-6 h-6 rounded-full bg-white/10 text-white font-mono text-xs flex items-center justify-center font-bold">1</span>
            <h4 className="font-bold text-white text-sm">Pick an Upcoming IPO</h4>
            <p className="text-xs text-zinc-400 leading-normal">
              Scroll down to <strong>Upcoming IPO Pipeline</strong> or select a recent benchmark like Bajaj Housing Finance or Premier Energies.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] space-y-2">
            <span className="w-6 h-6 rounded-full bg-white/10 text-white font-mono text-xs flex items-center justify-center font-bold">2</span>
            <h4 className="font-bold text-white text-sm">Check Phase 1 Verdict</h4>
            <p className="text-xs text-zinc-400 leading-normal">
              Observe the Heat Probability. If it says <strong>HOT (&gt;65%)</strong>, the offering structure and market climate are in your favor.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] space-y-2">
            <span className="w-6 h-6 rounded-full bg-white/10 text-white font-mono text-xs flex items-center justify-center font-bold">3</span>
            <h4 className="font-bold text-white text-sm">Inspect Subscription</h4>
            <p className="text-xs text-zinc-400 leading-normal">
              On Day 3 of bidding, check official QIB and HNI numbers, enter them into the sliders, and click <strong>Run Phase 2</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] space-y-2">
            <span className="w-6 h-6 rounded-full bg-white/10 text-white font-mono text-xs flex items-center justify-center font-bold">4</span>
            <h4 className="font-bold text-white text-sm">Plan Your Exit / Hold</h4>
            <p className="text-xs text-zinc-400 leading-normal">
              Read the 80% Expected Gain Range and estimated price bounds (e.g. ₹140 - ₹165) to set realistic expectations on debut day.
            </p>
          </div>
        </div>

        <div className="pt-4 text-center">
          <button
            onClick={onBackToPredictor}
            className="px-6 py-3 rounded-xl font-bold text-xs font-mono btn-accent inline-flex items-center gap-2 cursor-pointer shadow-lg motion-safe:hover:scale-105 active:scale-95 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          >
            <span>Launch Predictor Terminal</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
};
