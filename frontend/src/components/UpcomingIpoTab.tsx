import React, { useState, useEffect } from 'react';
import {
  Radio, Search, RefreshCw, Calendar, TrendingUp, Sparkles,
  Building2, Layers, CheckCircle2, AlertCircle, ArrowRight,
  Filter, ExternalLink, ShieldCheck, Clock, DollarSign,
  ChevronDown, ChevronUp, Bookmark, Zap
} from 'lucide-react';
import { UpcomingIPO } from '../types';
import { InfoButton } from './InfoButton';
import { AppTheme } from './Header';
import { useAuth } from '../context/AuthContext';

interface UpcomingIpoTabProps {
  onSelectUpcomingIpo: (ipo: UpcomingIPO) => void;
  selectedIpoName?: string;
  theme?: AppTheme;
  onOpenGuide?: (id: string) => void;
}

export const UpcomingIpoTab: React.FC<UpcomingIpoTabProps> = ({
  onSelectUpcomingIpo,
  selectedIpoName,
  theme = 'midnight',
  onOpenGuide,
}) => {
  const { isWatchlisted, toggleWatchlist } = useAuth();
  const [ipos, setIpos] = useState<UpcomingIPO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Bidding Open' | 'Bidding Closed' | 'Upcoming' | 'Mainboard' | 'SME'>('All');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    fetchUpcomingIpos();
  }, []);

  // Reset pagination wrap when search or category filter changes
  useEffect(() => {
    setIsExpanded(false);
  }, [searchQuery, categoryFilter]);

  const fetchUpcomingIpos = async (forceLive: boolean = false) => {
    if (forceLive) setRefreshing(true);
    else setLoading(true);

    try {
      const url = forceLive ? '/api/upcoming-ipos?force_live=true' : '/api/upcoming-ipos';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setIpos(data.ipos || []);
        if (data.last_updated) setLastUpdated(data.last_updated);
      }
    } catch (e) {
      console.error('Error fetching upcoming IPOs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter IPOs
  const filteredIpos = ipos.filter((ipo) => {
    const matchesSearch =
      ipo.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ipo.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ipo.sector && ipo.sector.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (categoryFilter === 'All') return true;
    if (categoryFilter === 'Bidding Open') return ipo.status === 'Bidding Open';
    if (categoryFilter === 'Bidding Closed') return ipo.status === 'Bidding Closed' || ipo.status === 'Allotment Awaited';
    if (categoryFilter === 'Upcoming') return ipo.status === 'Upcoming' || ipo.status === 'Pre-IPO Filed';
    if (categoryFilter === 'Mainboard') return ipo.category === 'Mainboard';
    if (categoryFilter === 'SME') return ipo.category === 'SME';
    return true;
  });

  // Limit to 9 items initially, wrap the rest behind a "View More" button
  const INITIAL_LIMIT = 9;
  const visibleIpos = isExpanded ? filteredIpos : filteredIpos.slice(0, INITIAL_LIMIT);
  const hasMore = filteredIpos.length > INITIAL_LIMIT;
  const remainingCount = filteredIpos.length - INITIAL_LIMIT;

  // KPI Calculations
  const totalPipelineValue = ipos.reduce((acc, curr) => acc + (curr.issue_size || 0), 0);
  const biddingOpenCount = ipos.filter((x) => x.status === 'Bidding Open').length;
  const biddingClosedCount = ipos.filter((x) => x.status === 'Bidding Closed' || x.status === 'Allotment Awaited').length;
  const upcomingScheduledCount = ipos.filter((x) => x.status === 'Upcoming' || x.status === 'Pre-IPO Filed').length;

  const getStatusBadge = (status: string) => {
    if (status === 'Bidding Open') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
          Bidding Open
        </span>
      );
    }
    if (status === 'Bidding Closed' || status === 'Allotment Awaited') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300">
          <Clock className="w-3 h-3 text-amber-400" aria-hidden="true" />
          Awaiting Listing
        </span>
      );
    }
    if (status === 'Upcoming') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 border border-sky-500/30 text-sky-300">
          <Calendar className="w-3 h-3 text-sky-400" aria-hidden="true" />
          Upcoming
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300">
        <Sparkles className="w-3 h-3 text-purple-400" aria-hidden="true" />
        Pre-IPO Filed
      </span>
    );
  };

  return (
    <section id="upcoming-section" className="space-y-6 pt-4 scroll-mt-24">
      {/* Top Header Card with Radar Status */}
      <div className="terminal-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[var(--border-card)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl badge-accent flex items-center justify-center font-bold">
                <Radio className="w-5 h-5 text-[var(--accent-primary)] motion-safe:animate-pulse" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                  Upcoming IPO Pipeline
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full badge-accent font-semibold">
                    Live Radar
                  </span>
                  <InfoButton targetId="guide-upcoming" label="Radar Info" onOpenGuide={onOpenGuide} />
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Automated background discovery & live monitoring of forthcoming Indian IPOs before bidding opens.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <div className="hidden sm:flex items-center gap-2 bg-[var(--canvas-bg)] px-3 py-1.5 rounded-xl border border-[var(--border-card)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 motion-safe:animate-ping" />
              <span className="text-xs font-mono text-zinc-300">
                {lastUpdated ? `Live Feed (${lastUpdated})` : 'Live Pipeline Active'}
              </span>
            </div>

            <button
              onClick={() => fetchUpcomingIpos(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/25 transition-colors duration-200 cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
              title="Rescan Public Feeds & DRHP Filings"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
              <span>{refreshing ? 'Scanning...' : 'Rescan Feeds'}</span>
            </button>
          </div>
        </div>

        {/* 4 Pipeline Stat Badges */}
        <div id="upcoming-stats" className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <div className="bg-[var(--canvas-bg)] p-3.5 rounded-xl border border-[var(--border-card)]">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[var(--accent-primary)]" aria-hidden="true" /> Total in Pipeline
            </span>
            <p className="text-xl font-bold font-mono text-white mt-1">
              {ipos.length} <span className="text-xs font-normal text-zinc-400">Offerings</span>
            </p>
          </div>

          <div className="bg-[var(--canvas-bg)] p-3.5 rounded-xl border border-[var(--border-card)]">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" /> Bidding Open Now
            </span>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {biddingOpenCount} <span className="text-xs font-normal text-zinc-400">Live</span>
            </p>
          </div>

          <div className="bg-[var(--canvas-bg)] p-3.5 rounded-xl border border-[var(--border-card)]">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" /> Awaiting Listing
            </span>
            <p className="text-xl font-bold font-mono text-amber-300 mt-1">
              {biddingClosedCount} <span className="text-xs font-normal text-zinc-400">Closed</span>
            </p>
          </div>

          <div className="bg-[var(--canvas-bg)] p-3.5 rounded-xl border border-[var(--border-card)]">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" /> Upcoming Pipeline
            </span>
            <p className="text-xl font-bold font-mono text-sky-300 mt-1">
              {upcomingScheduledCount} <span className="text-xs font-normal text-zinc-400">Forthcoming</span>
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-[var(--border-card)]">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search upcoming company, symbol, or sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--canvas-bg)] border border-[var(--border-card)] rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto visible-scrollbar-x pb-2.5 sm:pb-1">
            {(['All', 'Bidding Open', 'Bidding Closed', 'Upcoming', 'Mainboard', 'SME'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
                  categoryFilter === cat
                    ? 'bg-[var(--accent-primary)] text-white font-bold shadow-sm'
                    : 'bg-[var(--canvas-bg)] text-zinc-400 hover:text-white border border-[var(--border-card)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Upcoming IPOs */}
      {loading ? (
        <div className="terminal-card p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[var(--accent-primary)] motion-safe:animate-spin mx-auto" aria-hidden="true" />
          <p className="text-sm font-medium text-zinc-300">Discovering live upcoming Indian IPOs...</p>
          <p className="text-xs text-zinc-500">Querying public issue feeds & DRHP records</p>
        </div>
      ) : filteredIpos.length === 0 ? (
        <div className="terminal-card p-12 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" aria-hidden="true" />
          <p className="text-sm font-medium text-zinc-300">No upcoming IPOs match your search or filter.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('All');
            }}
            className="text-xs text-[var(--accent-primary)] hover:underline cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div id="upcoming-ipo-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 scroll-mt-24">
            {visibleIpos.map((ipo) => {
              const isSelected = selectedIpoName?.toLowerCase() === ipo.company_name.toLowerCase();

              return (
                <div
                  key={ipo.id || ipo.company_name}
                  className={`terminal-card p-5 transition-colors duration-300 flex flex-col justify-between relative group ${
                    isSelected
                      ? 'ring-2 ring-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                      : 'hover:border-[var(--accent-primary)]/50'
                  }`}
                >
                  {/* Top Row: Category + Status Badge + Watchlist Bookmark */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                          {ipo.category} • {ipo.exchange}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchlist(ipo.company_name, ipo.symbol);
                          }}
                          className={`p-1 rounded-md transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
                            isWatchlisted(ipo.company_name)
                              ? 'text-amber-400 bg-amber-400/15 border border-amber-400/30 hover:bg-amber-400/25'
                              : 'text-zinc-500 hover:text-amber-300 hover:bg-white/5 border border-transparent'
                          }`}
                          title={isWatchlisted(ipo.company_name) ? "Remove from personal watchlist" : "Add to personal watchlist"}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isWatchlisted(ipo.company_name) ? 'fill-amber-400' : ''}`} aria-hidden="true" />
                        </button>
                      </div>
                      {getStatusBadge(ipo.status)}
                    </div>

                    {/* Company Name & Sector */}
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-white group-hover:text-[var(--accent-primary)] transition-colors line-clamp-1">
                        {ipo.company_name}
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                        {ipo.sector || 'Commercial Offering'}
                      </p>
                    </div>

                    {/* Key Financial Offer Metrics */}
                    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-card)] mb-3">
                      <div>
                        <span className="text-[11px] text-zinc-400 block font-sans">Issue Size</span>
                        <span className="text-sm font-bold font-mono text-white">
                          ₹{ipo.issue_size >= 1000 ? `${(ipo.issue_size).toLocaleString('en-IN')}` : ipo.issue_size} Cr
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-zinc-400 block font-sans">Price Band</span>
                        <span className="text-sm font-bold font-mono text-[var(--accent-primary)]">
                          {ipo.price_band || `₹${ipo.offer_price}`}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-zinc-400 block font-sans">Lot Size</span>
                        <span className="text-xs font-mono text-zinc-300">
                          {ipo.lot_size ? `${ipo.lot_size} Shares` : 'TBA'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-zinc-400 block font-sans">Grey Mkt (GMP)</span>
                        <span className="text-xs font-mono font-semibold text-emerald-400">
                          {ipo.gmp && ipo.gmp !== 'TBA' ? ipo.gmp : 'Estimating...'}
                        </span>
                      </div>
                    </div>

                    {/* Model Predicted Listing Gain (Active for Bidding Closed & Bidding Open offerings with subscription) */}
                    {ipo.predicted_gain !== undefined && (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 flex items-center justify-between mb-3">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" /> Model Expected Gain
                          </span>
                          <span className={`text-base font-black font-mono ${ipo.predicted_gain >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                            {ipo.predicted_gain >= 0 ? `+${ipo.predicted_gain}%` : `${ipo.predicted_gain}%`}
                          </span>
                        </div>
                        {ipo.predicted_range && (
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-400 block font-medium">80% Expected Range</span>
                            <span className="text-xs font-mono font-bold text-white">
                              {ipo.predicted_range}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timeline Dates */}
                    <div className="space-y-1.5 text-[11px] text-zinc-400 border-t border-[var(--border-card)] pt-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Calendar className="w-3 h-3 text-zinc-500" aria-hidden="true" /> Bidding Window:
                        </span>
                        <span className="font-mono text-zinc-200">
                          {ipo.open_date} to {ipo.close_date}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Expected Listing:</span>
                        <span className="font-mono text-zinc-300">{ipo.listing_date || 'TBA'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button: Predict IPO */}
                  <div className="pt-2">
                    <button
                      onClick={() => onSelectUpcomingIpo(ipo)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-colors duration-200 shadow-md cursor-pointer btn-accent active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
                      title={ipo.qib && ipo.total ? "Run Full Phase 1 Pre-IPO & Phase 2 Listing Gain Prediction" : "Run Phase 1 Pre-IPO Prediction"}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                      <span>{ipo.qib && ipo.total ? "Predict (Phase 1 & 2)" : "Predict Pre-IPO Heat"}</span>
                      <ArrowRight className="w-3.5 h-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
                    </button>
                    <p className="text-[10px] text-center text-zinc-400 mt-1.5">
                      {ipo.qib && ipo.total
                        ? "⚡ Calculates Pre-IPO Heat & Listing Gain Corridor"
                        : "⚡ Predicts Pre-IPO Profit Check (Phase 2 Locked Pending Book)"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* View More / Show Less Pagination Wrapper */}
          {hasMore ? (
            <div className="flex flex-col items-center justify-center gap-3 pt-4 pb-2">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span>
                  Showing <strong className="text-white font-semibold">{visibleIpos.length}</strong> of{' '}
                  <strong className="text-white font-semibold">{filteredIpos.length}</strong> upcoming offerings
                </span>
                {isExpanded && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                    Full Pipeline Unwrapped
                  </span>
                )}
              </div>

              <button
                id="view-more-upcoming-btn"
                onClick={() => {
                  if (isExpanded) {
                    setIsExpanded(false);
                    const el = document.getElementById('upcoming-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    setIsExpanded(true);
                  }
                }}
                className="group relative inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-xs font-bold font-mono tracking-wide transition-colors duration-200 cursor-pointer overflow-hidden bg-sky-500/15 border border-sky-400/30 hover:border-sky-400/60 hover:bg-sky-500/25 text-sky-200 hover:text-white shadow-lg active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4 text-sky-400 motion-safe:transition-transform motion-safe:group-hover:-translate-y-0.5" aria-hidden="true" />
                    <span>Show Less (Wrap Back to Top 9)</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4 text-sky-400" aria-hidden="true" />
                    <span>View More ({remainingCount} More Upcoming IPOs)</span>
                    <ChevronDown className="w-4 h-4 text-sky-400 motion-safe:transition-transform motion-safe:group-hover:translate-y-0.5" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          ) : (
            filteredIpos.length > 0 && (
              <div className="text-center pt-2">
                <p className="text-[11px] font-mono text-zinc-500">
                  Showing all {filteredIpos.length} matching upcoming offerings
                </p>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
};
