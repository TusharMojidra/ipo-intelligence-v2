import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ShieldCheck, ArrowRight, FileText, ArrowLeftRight, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { PredictionResult, HistoricalItem, UpcomingIPO } from './types';
import { Header, AppTheme, NavigationTab } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { KpiStrip } from './components/KpiStrip';
import { Phase1ClassifierCard, REAL_IPOS } from './components/Phase1ClassifierCard';
import { CapitalFlowCard } from './components/CapitalFlowCard';
import { SafetyAuditCard } from './components/SafetyAuditCard';
import { ExportDossierModal } from './components/ExportDossierModal';
import { evaluateIpoSafety } from './utils/safetyAudit';
import { Phase2ListingDeck } from './components/Phase2ListingDeck';
import { UpcomingIpoTab } from './components/UpcomingIpoTab';
import { BacktestTab } from './components/BacktestTab';
import { GuidePage } from './components/GuidePage';
import { ContactFeedbackTab } from './components/ContactFeedbackTab';
import { QuickStartGuide } from './components/QuickStartGuide';
import { SideScale } from './components/SideScale';
import { AiCompanionWidget } from './components/AiCompanionWidget';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('ipo_theme') as AppTheme;
    if (saved === 'midnight' || saved === 'emerald' || saved === 'cyber') {
      return saved;
    }
    return 'midnight';
  });

  // Pre-IPO Offering Facts (Phase 1)
  const [companyName, setCompanyName] = useState('Bajaj Housing Finance');
  const [issueSize, setIssueSize] = useState<number>(6560);
  const [freshIssue, setFreshIssue] = useState<number>(3560);
  const [ofs, setOfs] = useState<number>(3000);
  const [offerPrice, setOfferPrice] = useState<number>(70);
  const [nifty30, setNifty30] = useState<number>(2.8);
  const [niftyVol, setNiftyVol] = useState<number>(12.5);
  const [trailingGain, setTrailingGain] = useState<number>(35.0);

  // Subscription Demand Book (Phase 2)
  const [qib, setQib] = useState<number>(222.0);
  const [hni, setHni] = useState<number>(43.5);
  const [rii, setRii] = useState<number>(7.4);
  const [total, setTotal] = useState<number>(67.4);

  // Upcoming IPO & Phase 2 gating state
  const [isUpcomingMode, setIsUpcomingMode] = useState<boolean>(false);
  const [isPhase2Unlocked, setIsPhase2Unlocked] = useState<boolean>(false);
  const [isPhase1Sparkling, setIsPhase1Sparkling] = useState<boolean>(false);
  const [isPhase2Sparkling, setIsPhase2Sparkling] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [history, setHistory] = useState<HistoricalItem[]>([]);
  const [activeTab, setActiveTab] = useState<NavigationTab>('simulator');
  const [guideTargetSection, setGuideTargetSection] = useState<string | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [isKnowMoreOpen, setIsKnowMoreOpen] = useState<boolean>(false);

  const currentSafety = evaluateIpoSafety({
    companyName,
    issueSize,
    offerPrice,
    freshIssue,
    ofs,
    nifty30dReturn: nifty30,
    niftyVolatility: niftyVol,
  });

  const currentPayload = {
    company_name: companyName,
    issue_size: Number(issueSize),
    offer_price: Number(offerPrice),
    qib: Number(qib),
    hni: Number(hni),
    rii: Number(rii),
    total: Number(total),
    nifty_30d_return: Number(nifty30),
    nifty_volatility: Number(niftyVol),
    trailing_5_gain: Number(trailingGain),
    trailing_ipo_count: 8,
    year: 2026,
    month: 10,
  };

  useEffect(() => {
    fetchHistory();
    handlePredict();

    const handleGuideEvent = (e: any) => {
      if (e.detail?.targetId) {
        handleOpenGuide(e.detail.targetId);
      }
    };
    window.addEventListener('open-guide-section', handleGuideEvent);
    return () => window.removeEventListener('open-guide-section', handleGuideEvent);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    localStorage.setItem('ipo_theme', theme);
  }, [theme]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error('Error fetching history:', e);
    }
  };

  const triggerSparkles = (isHot: boolean = true) => {
    // 1. Center main radiant burst
    confetti({
      particleCount: 85,
      spread: 90,
      startVelocity: 42,
      origin: { y: 0.45 },
      colors: isHot
        ? ['#10B981', '#38BDF8', '#818CF8', '#F59E0B', '#EC4899', '#FBBF24']
        : ['#38BDF8', '#818CF8', '#60A5FA', '#34D399', '#A855F7', '#F472B6'],
      ticks: 250,
      gravity: 0.85,
      scalar: 1.15,
      shapes: ['star', 'circle'],
    });

    // 2. Dual flank celebratory cannons
    setTimeout(() => {
      confetti({
        particleCount: 45,
        angle: 60,
        spread: 60,
        origin: { x: 0.15, y: 0.55 },
        colors: ['#38BDF8', '#10B981', '#F59E0B'],
      });
      confetti({
        particleCount: 45,
        angle: 120,
        spread: 60,
        origin: { x: 0.85, y: 0.55 },
        colors: ['#818CF8', '#EC4899', '#38BDF8'],
      });
    }, 150);
  };

  const handlePredict = async (overridePayload?: Partial<typeof currentPayload>) => {
    setLoading(true);
    try {
      const payloadToSend = overridePayload ? { ...currentPayload, ...overridePayload } : currentPayload;
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSend),
      });

      if (res.ok) {
        const data: PredictionResult = await res.json();
        setResult(data);

        setIsPhase1Sparkling(true);
        setIsPhase2Sparkling(true);
        setTimeout(() => {
          setIsPhase1Sparkling(false);
          setIsPhase2Sparkling(false);
        }, 3500);

        triggerSparkles(data.hot_probability >= 50);
      }
    } catch (err: any) {
      console.error('Prediction error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUpcomingIpo = async (ipo: UpcomingIPO) => {
    setActiveTab('simulator');
    setCompanyName(ipo.company_name);
    setIssueSize(ipo.issue_size);
    if (ipo.fresh_issue !== undefined && ipo.ofs !== undefined) {
      setFreshIssue(ipo.fresh_issue);
      setOfs(ipo.ofs);
    } else {
      setFreshIssue(Math.round(ipo.issue_size * 0.5));
      setOfs(Math.round(ipo.issue_size * 0.5));
    }
    setOfferPrice(ipo.offer_price);
    if (ipo.market_context) {
      setNifty30(ipo.market_context.nifty_30d_return);
      setNiftyVol(ipo.market_context.nifty_volatility);
      setTrailingGain(ipo.market_context.trailing_5_gain);
    }

    const hasPhase2Data = Boolean(
      ipo.qib !== undefined && ipo.qib > 0 &&
      ipo.total !== undefined && ipo.total > 0
    );

    // Smoothly scroll directly to Phase 1 section once the simulator mounts
    setTimeout(() => {
      scrollTo('phase1-section');
    }, 100);

    if (hasPhase2Data) {
      const qibVal = ipo.qib!;
      const totalVal = ipo.total!;
      const hniVal = ipo.hni !== undefined && ipo.hni > 0 ? ipo.hni : Math.round(totalVal * 1.25 * 10) / 10;
      const riiVal = ipo.rii !== undefined && ipo.rii > 0 ? ipo.rii : Math.max(0.1, Math.round(totalVal * 0.75 * 10) / 10);

      setQib(qibVal);
      setHni(hniVal);
      setRii(riiVal);
      setTotal(totalVal);
      setIsUpcomingMode(false);
      setIsPhase2Unlocked(true);

      const fullPayload = {
        company_name: ipo.company_name,
        issue_size: Number(ipo.issue_size),
        offer_price: Number(ipo.offer_price),
        qib: Number(qibVal),
        hni: Number(hniVal),
        rii: Number(riiVal),
        total: Number(totalVal),
        nifty_30d_return: Number(ipo.market_context?.nifty_30d_return ?? nifty30),
        nifty_volatility: Number(ipo.market_context?.nifty_volatility ?? niftyVol),
        trailing_5_gain: Number(ipo.market_context?.trailing_5_gain ?? trailingGain),
        trailing_ipo_count: 8,
        year: 2026,
        month: 11,
      };

      await handlePredict(fullPayload);
    } else {
      // Upcoming IPO without subscription data: Phase 2 strictly locked
      setIsUpcomingMode(true);
      setIsPhase2Unlocked(false);

      // Reset subscription inputs to neutral/0
      setQib(0);
      setHni(0);
      setRii(0);
      setTotal(0);

      // Automatically trigger Phase 1 pre-IPO directional classifier
      setLoading(true);
      try {
        const phase1Payload = {
          company_name: ipo.company_name,
          issue_size: Number(ipo.issue_size),
          offer_price: Number(ipo.offer_price),
          nifty_30d_return: Number(ipo.market_context?.nifty_30d_return ?? nifty30),
          nifty_volatility: Number(ipo.market_context?.nifty_volatility ?? niftyVol),
          trailing_5_gain: Number(ipo.market_context?.trailing_5_gain ?? trailingGain),
          trailing_ipo_count: 8,
          year: 2026,
          month: 11,
        };

        const res = await fetch('/api/predict/phase1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(phase1Payload),
        });

        if (res.ok) {
          const data: PredictionResult = await res.json();
          setResult(data);

          // Activate glowing card sparkle state
          setIsPhase1Sparkling(true);
          setTimeout(() => {
            setIsPhase1Sparkling(false);
          }, 3500);

          // Fire radiant sparkle fireworks as user reaches Phase 1
          setTimeout(() => {
            triggerSparkles(data.hot_probability >= 50);
          }, 300);
        }
      } catch (e) {
        console.error('Error running Phase 1 on upcoming IPO:', e);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelectRealIpo = async (name: string) => {
    const found = REAL_IPOS.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (found) {
      let fresh = Math.round(found.size * 0.5);
      let ofsAmount = Math.round(found.size * 0.5);
      if (found.name.toLowerCase().includes('bajaj')) {
        fresh = 3560;
        ofsAmount = 3000;
      } else if (found.name.toLowerCase().includes('premier')) {
        fresh = 1291;
        ofsAmount = 1539;
      }

      setCompanyName(found.name);
      setIssueSize(found.size);
      setFreshIssue(fresh);
      setOfs(ofsAmount);
      setOfferPrice(found.price);
      setQib(found.qib);
      setHni(found.hni);
      setRii(found.rii);
      setTotal(found.total);
      setIsUpcomingMode(false);
      setIsPhase2Unlocked(true);

      // Automatically run AI prediction immediately when switching demo IPO
      const demoPayload = {
        company_name: found.name,
        issue_size: Number(found.size),
        offer_price: Number(found.price),
        qib: Number(found.qib),
        hni: Number(found.hni),
        rii: Number(found.rii),
        total: Number(found.total),
        nifty_30d_return: Number(nifty30),
        nifty_volatility: Number(niftyVol),
        trailing_5_gain: Number(trailingGain),
        trailing_ipo_count: 8,
        year: 2026,
        month: 10,
      };

      await handlePredict(demoPayload);
    }
  };

  const handleToggleUnlockPhase2 = () => {
    const nextState = !isPhase2Unlocked;
    setIsPhase2Unlocked(nextState);
    if (nextState) {
      handlePredict();
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleGoToDeepDive = () => {
    setActiveTab('simulator');
    setIsKnowMoreOpen(true);
    setTimeout(() => scrollTo('know-more-ipo-card'), 80);
  };

  const handleOpenGuide = (sectionId?: string) => {
    setActiveTab('guide');
    setGuideTargetSection(sectionId || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    if (tab === 'guide') {
      handleOpenGuide();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen app-bg text-zinc-100 pb-28 selection:bg-purple-500/30 relative">
      {/* Side Scale Ruler Navigation (Fixed Right Side, Inspired by getartcraft.com/apps) */}
      <SideScale
        theme={theme}
        activeTab={activeTab}
        isKnowMoreOpen={isKnowMoreOpen}
        onOpenDeepDive={handleGoToDeepDive}
      />

      {/* Sticky Top Navbar with High z-index */}
      <div className="relative z-50">
        <Header
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          theme={theme}
          setTheme={setTheme}
        />
      </div>

      {/* Main Content Sections */}
      <main className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-12">
        {activeTab === 'guide' ? (
          <GuidePage
            onBackToPredictor={() => {
              setActiveTab('simulator');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            targetSection={guideTargetSection}
            theme={theme}
          />
        ) : activeTab === 'upcoming' ? (
          <div className="space-y-8 motion-safe:animate-fadeIn">
            <UpcomingIpoTab
              onSelectUpcomingIpo={(ipo) => {
                handleSelectUpcomingIpo(ipo);
              }}
              selectedIpoName={companyName}
              theme={theme}
              onOpenGuide={handleOpenGuide}
            />
          </div>
        ) : activeTab === 'backtest' ? (
          <div className="space-y-8 motion-safe:animate-fadeIn">
            <BacktestTab history={history} onOpenGuide={handleOpenGuide} />
          </div>
        ) : activeTab === 'contact' || activeTab === 'feedback' ? (
          <ContactFeedbackTab
            onBackToPredictor={() => handleTabChange('simulator')}
            theme={theme}
          />
        ) : (
          /* Predictor Tab: Focused, Spacious, Air to Breathe */
          <div className="space-y-16 sm:space-y-20 motion-safe:animate-fadeIn">
            {/* SECTION 1: Full-Screen Centralized 3D Hero Banner */}
            <HeroBanner
              onScrollToPhase1={() => scrollTo('phase1-section')}
              onScrollToPhase2={() => scrollTo('phase2-section')}
              theme={theme}
            />

            {/* Quick Start Guide: How to Use The Platform in Simple Steps */}
            <QuickStartGuide
              onScrollToPhase1={() => scrollTo('phase1-section')}
              onGoToUpcoming={() => handleTabChange('upcoming')}
              onGoToDeepDive={handleGoToDeepDive}
            />

            {/* SECTION 2: 4-Metric Horizontal Market Regime Strip */}
            <KpiStrip onOpenGuide={handleOpenGuide} />

            {/* SECTION 3: Deep Dive & Report Export Bar (Placed Before Phase 1 & Phase 2) */}
            <div id="know-more-ipo-card" className="terminal-card p-6 sm:p-7 border border-[var(--border-card)] space-y-6 transition-colors duration-300 scroll-mt-24">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/25 flex items-center justify-center font-bold shrink-0">
                    <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-white tracking-tight">
                        Company Deep Dive: {companyName}
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-bold">
                        Safety & Capital Allocation
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Analyze safety score, founder cash-out proportion, or download an executive 1-page report.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsKnowMoreOpen(!isKnowMoreOpen)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs font-mono btn-accent flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
                    id="know-more-ipo-btn"
                  >
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    <span>{isKnowMoreOpen ? 'Hide Analysis ▲' : 'Detailed Analysis ▼'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDossierOpen(true)}
                    className="px-4 py-2.5 rounded-xl font-mono text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[var(--accent-primary)] flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none whitespace-nowrap"
                    id="export-dossier-under-phase1-btn"
                    title="View and Download 1-Page IPO Summary Report"
                  >
                    <FileText className="w-4 h-4 text-sky-400" aria-hidden="true" />
                    <span>Download Report</span>
                  </button>
                </div>
              </div>

              {/* In-place Revealed Details: Capital Flow & Safety Audit */}
              {isKnowMoreOpen && (
                <div id="know-more-expanded-details" className="pt-6 border-t border-[var(--border-card)] space-y-8 motion-safe:animate-fadeIn">
                  {/* Section 1: Where Does Your Money Go? (Capital Flow) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
                        Where Does Your Money Go? (Company Growth vs. Promoter Cash-Out)
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        Fresh: {Math.round((freshIssue / Math.max(1, freshIssue + ofs)) * 100)}% | OFS: {100 - Math.round((freshIssue / Math.max(1, freshIssue + ofs)) * 100)}%
                      </span>
                    </div>
                    <CapitalFlowCard
                      issueSize={issueSize}
                      freshIssue={freshIssue}
                      ofs={ofs}
                      onChangeSplit={(newFresh, newOfs) => {
                        setFreshIssue(newFresh);
                        setOfs(newOfs);
                      }}
                      onOpenGuide={handleOpenGuide}
                    />
                  </div>

                  {/* Section 2: Automated Red Flag & Safety Audit */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        Is This IPO Safe to Invest In? (Red Flag Detector)
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 font-bold border border-sky-500/25">
                        Safety Score: {currentSafety.score} / 4.0
                      </span>
                    </div>
                    <SafetyAuditCard
                      auditInput={{
                        companyName,
                        issueSize,
                        offerPrice,
                        freshIssue,
                        ofs,
                        nifty30dReturn: nifty30,
                        niftyVolatility: niftyVol,
                      }}
                      onOpenGuide={handleOpenGuide}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: Phase 1 Pre-IPO Directional Classifier (Hot or Not?) */}
            <Phase1ClassifierCard
              companyName={companyName}
              setCompanyName={setCompanyName}
              issueSize={issueSize}
              setIssueSize={setIssueSize}
              offerPrice={offerPrice}
              setOfferPrice={setOfferPrice}
              nifty30={nifty30}
              setNifty30={setNifty30}
              niftyVol={niftyVol}
              setNiftyVol={setNiftyVol}
              trailingGain={trailingGain}
              setTrailingGain={setTrailingGain}
              result={result}
              loading={loading}
              onRunPhase1={() => {
                if (isUpcomingMode && !isPhase2Unlocked) {
                  handleSelectUpcomingIpo({
                    id: 'custom',
                    company_name: companyName,
                    symbol: 'CUSTOM',
                    issue_size: issueSize,
                    offer_price: offerPrice,
                    price_band: `₹${offerPrice}`,
                    category: 'Mainboard',
                    exchange: 'NSE / BSE',
                    open_date: 'Upcoming',
                    close_date: 'Upcoming',
                    listing_date: 'Upcoming',
                    status: 'Upcoming',
                  });
                } else {
                  handlePredict();
                }
              }}
              onSelectRealIpo={handleSelectRealIpo}
              onScrollToPhase2={() => scrollTo('phase2-section')}
              theme={theme}
              isSparkling={isPhase1Sparkling}
              onOpenGuide={handleOpenGuide}
            />

            {/* SECTION 5: Phase 2 Listing Gain & Price Range Predictor */}
            <Phase2ListingDeck
              companyName={companyName}
              offerPrice={offerPrice}
              qib={qib}
              setQib={setQib}
              hni={hni}
              setHni={setHni}
              rii={rii}
              setRii={setRii}
              total={total}
              setTotal={setTotal}
              result={result}
              loading={loading}
              onRunPhase2={handlePredict}
              theme={theme}
              isUpcomingMode={isUpcomingMode}
              isPhase2Unlocked={isPhase2Unlocked}
              onUnlockPhase2={handleToggleUnlockPhase2}
              onOpenGuide={handleOpenGuide}
              isSparkling={isPhase2Sparkling}
            />
          </div>
        )}

        {/* Platform Footer */}
        <footer className="mt-20 pt-8 border-t border-[var(--border-card)] text-xs text-zinc-400">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white font-mono">IPO Intelligence v2.0</span>
              <span className="text-zinc-600">•</span>
              <span className="text-[11px] text-zinc-500">Dual-Phase Machine Learning Architecture</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <button
                type="button"
                onClick={() => handleTabChange('simulator')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Predictor
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('upcoming')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('contact')}
                className="text-[var(--accent-primary)] hover:underline transition-colors cursor-pointer font-bold"
              >
                Contact & Feedback
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
            <span>Official Desk: <strong className="text-zinc-300">ipo.intelligence.app@gmail.com</strong></span>
            <span>Empirical NSE & BSE Historical Data 2010 to 2026</span>
          </div>
        </footer>
      </main>

      {/* Institutional 1-Page IPO Intelligence Dossier Modal */}
      <ExportDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        companyName={companyName}
        issueSize={issueSize}
        offerPrice={offerPrice}
        freshIssue={freshIssue}
        ofs={ofs}
        nifty30={nifty30}
        niftyVol={niftyVol}
        qib={qib}
        hni={hni}
        rii={rii}
        total={total}
        result={result}
        safetyScore={currentSafety.score}
        safetyRating={currentSafety.overallRating}
      />

      {/* Intelligent AI Companion Guide Widget (Powered by Groq 120B / Llama 3.3) */}
      <AiCompanionWidget
        context={{
          companyName,
          issueSize,
          offerPrice,
          freshIssue,
          ofs,
          freshPct: Math.round((freshIssue / Math.max(1, freshIssue + ofs)) * 100),
          ofsPct: 100 - Math.round((freshIssue / Math.max(1, freshIssue + ofs)) * 100),
          expectedGain: result?.expected_gain ?? 38.2,
          rangeLower: result?.range_lower ?? 14.2,
          rangeUpper: result?.range_upper ?? 58.6,
          hotProb: result?.hot_probability ?? 82.5,
          safetyScore: currentSafety.score,
          qib,
          total,
        }}
        onNavigateToUpcoming={() => handleTabChange('upcoming')}
        onNavigateToDeepDive={handleGoToDeepDive}
        onNavigateToPhase1={() => scrollTo('phase1-section')}
      />

      {/* Institutional Authentication Modal */}
      <AuthModal />
    </div>
  );
}
