import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ShieldCheck, FileText, ArrowLeftRight } from 'lucide-react';
import { PredictionResult, HistoricalItem, UpcomingIPO } from './types';
import { Header, AppTheme, NavigationTab } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
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

  const handleSelectRealIpo = (name: string) => {
    const ipo = REAL_IPOS.find((x) => x.name === name);
    if (!ipo) return;

    setCompanyName(ipo.name);
    setIssueSize(ipo.size);
    setFreshIssue(Math.round(ipo.size * 0.55));
    setOfs(Math.round(ipo.size * 0.45));
    setOfferPrice(ipo.price);
    setQib(ipo.qib);
    setHni(ipo.hni);
    setRii(ipo.rii);
    setTotal(ipo.total);

    setIsUpcomingMode(false);
    setIsPhase2Unlocked(true);

    const payload = {
      company_name: ipo.name,
      issue_size: ipo.size,
      offer_price: ipo.price,
      qib: ipo.qib,
      hni: ipo.hni,
      rii: ipo.rii,
      total: ipo.total,
      nifty_30d_return: nifty30,
      nifty_volatility: niftyVol,
      trailing_5_gain: trailingGain,
      trailing_ipo_count: 8,
      year: 2026,
      month: 10,
    };

    handlePredict(payload);
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
      setIsUpcomingMode(true);
      setIsPhase2Unlocked(false);

      setQib(0);
      setHni(0);
      setRii(0);
      setTotal(0);

      setLoading(true);
      try {
        const phase1Payload = {
          company_name: ipo.company_name,
          issue_size: Number(ipo.issue_size),
          offer_price: Number(ipo.offer_price),
          nifty_30d_return: Number(ipo.market_context?.nifty_30d_return ?? nifty30),
          nifty_volatility: Number(ipo.market_context?.nifty_volatility ?? niftyVol),
          trailing_5_gain: Number(ipo.market_context?.trailing_5_gain ?? trailingGain),
        };
        const p1Res = await fetch('/api/predict/phase1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(phase1Payload),
        });
        if (p1Res.ok) {
          const p1Data = await p1Res.json();
          setResult({
            company_name: ipo.company_name,
            direction: (p1Data.hot_probability ?? 50) >= 50 ? 'Positive' : 'Cautious',
            expected_gain: 0,
            range_lower: 0,
            range_upper: 0,
            hot_probability: p1Data.hot_probability ?? 50,
            confidence: p1Data.confidence ?? 0.8,
            action_advice: p1Data.action_advice || 'Subscription pending. Evaluated via pre-IPO metrics.',
            key_drivers: [
              `Issue Size: ₹${ipo.issue_size} Cr (${ipo.category})`,
              `Pre-IPO Demand Category: ${p1Data.demand_category || p1Data.verdict_badge || 'Evaluating'}`,
              `Offer Price: ₹${ipo.offer_price}`,
              ...(p1Data.key_drivers || []),
            ],
            verdict_badge: p1Data.demand_category || p1Data.verdict_badge || 'Upcoming',
            verdict_color: p1Data.verdict_color || 'cyan',
          });

          setIsPhase1Sparkling(true);
          setTimeout(() => {
            setIsPhase1Sparkling(false);
          }, 3500);

          triggerSparkles(p1Data.hot_probability >= 50);
        }
      } catch (err) {
        console.error('Phase 1 standalone predict error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRunPhase1Only = async () => {
    setLoading(true);
    try {
      const phase1Payload = {
        company_name: companyName,
        issue_size: Number(issueSize),
        offer_price: Number(offerPrice),
        nifty_30d_return: Number(nifty30),
        nifty_volatility: Number(niftyVol),
        trailing_5_gain: Number(trailingGain),
      };
      const p1Res = await fetch('/api/predict/phase1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(phase1Payload),
      });
      if (p1Res.ok) {
        const p1Data = await p1Res.json();
        setResult((prev) => ({
          ...(prev || {}),
          company_name: companyName,
          direction: (p1Data.hot_probability ?? 50) >= 50 ? 'Positive' : 'Cautious',
          expected_gain: prev?.expected_gain ?? 0,
          range_lower: prev?.range_lower ?? 0,
          range_upper: prev?.range_upper ?? 0,
          hot_probability: p1Data.hot_probability ?? 50,
          confidence: p1Data.confidence ?? 0.8,
          action_advice: p1Data.action_advice || 'Subscription pending. Evaluated via pre-IPO metrics.',
          key_drivers: p1Data.key_drivers?.length
            ? p1Data.key_drivers
            : [
                `Issue Size: ₹${issueSize} Cr`,
                `Pre-IPO Demand Category: ${p1Data.verdict_badge || 'Evaluating'}`,
                `Offer Price: ₹${offerPrice}`,
              ],
          verdict_badge: p1Data.verdict_badge || 'Upcoming',
          verdict_color: p1Data.verdict_color || 'cyan',
        }));

        setIsPhase1Sparkling(true);
        setTimeout(() => {
          setIsPhase1Sparkling(false);
        }, 3500);

        triggerSparkles(p1Data.hot_probability >= 50);
      }
    } catch (err) {
      console.error('Phase 1 standalone predict error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUnlockPhase2 = () => {
    if (!isPhase2Unlocked) {
      setIsPhase2Unlocked(true);
      if (qib === 0 && total === 0) {
        setQib(15.0);
        setHni(10.0);
        setRii(4.0);
        setTotal(9.5);
      }
      handlePredict({
        qib: qib === 0 ? 15.0 : qib,
        hni: hni === 0 ? 10.0 : hni,
        rii: rii === 0 ? 4.0 : rii,
        total: total === 0 ? 9.5 : total,
      });
    } else {
      setIsPhase2Unlocked(false);
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      setTimeout(() => {
        const retryEl = document.getElementById(id);
        if (retryEl) {
          retryEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 250);
    }
  };

  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenGuide = (targetId?: string) => {
    setActiveTab('guide');
    if (targetId) {
      setGuideTargetSection(targetId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToDeepDive = () => {
    setIsKnowMoreOpen(true);
    setTimeout(() => {
      scrollTo('know-more-ipo-card');
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      {/* Precision Floating Side Telemetry Scale */}
      <SideScale activeTab={activeTab} onNavigateTab={handleTabChange} />

      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onTabChange={handleTabChange}
        theme={theme}
        setTheme={setTheme}
        onThemeChange={setTheme}
        onOpenDossier={() => setIsDossierOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-12">
        {activeTab === 'upcoming' ? (
          <UpcomingIpoTab
            onSelectUpcomingIpo={handleSelectUpcomingIpo}
            onSelectIpo={handleSelectUpcomingIpo}
            selectedIpoName={companyName}
            theme={theme}
            onOpenGuide={handleOpenGuide}
          />
        ) : activeTab === 'backtest' || activeTab === 'history' ? (
          <BacktestTab
            history={history}
            onOpenGuide={handleOpenGuide}
            onSelectIpo={(name) => {
              handleSelectRealIpo(name);
              setActiveTab('simulator');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : activeTab === 'guide' ? (
          <GuidePage initialSectionId={guideTargetSection} />
        ) : activeTab === 'contact' || activeTab === 'feedback' ? (
          <ContactFeedbackTab />
        ) : (
          /* Predictor Tab: Complete Terminal */
          <div className="space-y-12">
            {/* SECTION 1: Asymmetrical Split Hero Banner with 3D Visual */}
            <HeroBanner
              onScrollToPhase1={() => scrollTo('phase1-section')}
              onScrollToPhase2={() => scrollTo('phase2-section')}
              theme={theme}
            />

            {/* SECTION 2: Phase 1 Pre-IPO Directional Classifier */}
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
                  handleRunPhase1Only();
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

            {/* SECTION 4: Phase 2 Listing Gain & Price Range Predictor */}
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

            {/* SECTION 5: Company Deep Dive & Safety Audit (Positioned After Phase 1 & Phase 2) */}
            <div id="know-more-ipo-card" className="terminal-card p-4 sm:p-6 space-y-4 scroll-mt-24">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl badge-accent flex items-center justify-center font-bold shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[var(--accent-primary)]" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                        Company Deep Dive: {companyName}
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Analyze safety score, founder cash-out proportion, or download an executive 1-page report.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsKnowMoreOpen(!isKnowMoreOpen)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl font-bold text-xs font-mono btn-accent flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all"
                    id="know-more-ipo-btn"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{isKnowMoreOpen ? 'Hide Analysis' : 'Detailed Analysis'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDossierOpen(true)}
                    className="px-3 py-2 rounded-xl font-mono text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all whitespace-nowrap"
                    id="export-dossier-under-phase1-btn"
                    title="Download 1-Page Summary Report"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                    <span>Download Report</span>
                  </button>
                </div>
              </div>

              {/* In-place Revealed Details */}
              {isKnowMoreOpen && (
                <div id="know-more-expanded-details" className="pt-4 border-t border-[var(--border-card)] space-y-6 motion-safe:animate-fadeIn">
                  {/* Capital Flow */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
                        Where Does Your Money Go? (Company Growth vs Promoter Cash-Out)
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

                  {/* Safety Audit */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        IPO Risk & Safety Audit
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 font-bold border border-sky-500/20">
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
          </div>
        )}

        {/* Platform Footer */}
        <footer className="mt-20 pt-8 border-t border-[var(--border-card)] text-xs text-zinc-400">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white font-mono">IPO Intelligence</span>
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
