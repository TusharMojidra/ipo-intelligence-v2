import React, { useState, useRef, useEffect } from 'react';
import { Target, Radio, History, BookOpen, Palette, Check, ChevronDown, LogIn, LogOut, User, Bookmark, MessageSquare, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AppTheme = 'midnight' | 'emerald' | 'cyber';
export type NavigationTab = 'simulator' | 'upcoming' | 'backtest' | 'guide' | 'feedback' | 'contact';

export interface ThemeOption {
  id: AppTheme;
  name: string;
  tagline: string;
  dot1: string;
  dot2: string;
  badge: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'midnight',
    name: 'Midnight Blue (v1.1)',
    tagline: 'Deep Oceanic Navy • Sky & Indigo',
    dot1: 'bg-sky-400',
    dot2: 'bg-indigo-400',
    badge: 'Default (v1.1)',
  },
  {
    id: 'emerald',
    name: 'Bloomberg Emerald',
    tagline: 'Obsidian Terminal • Mint & Gold',
    dot1: 'bg-emerald-500',
    dot2: 'bg-amber-400',
    badge: 'Institutional',
  },
  {
    id: 'cyber',
    name: 'Charcoal Nebula',
    tagline: 'Deep Charcoal • Violet & Rose',
    dot1: 'bg-purple-500',
    dot2: 'bg-pink-500',
    badge: 'v1.0 Classic',
  },
];

interface HeaderProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  theme,
  setTheme,
}) => {
  const { user, isAuthenticated, logout, openAuthModal, watchlist } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const currentThemeObj = THEMES.find((t) => t.id === theme) || THEMES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getAccentGradient = (t: AppTheme) => {
    if (t === 'emerald') return 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/25';
    if (t === 'cyber') return 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-purple-500/25';
    return 'bg-gradient-to-r from-sky-400 to-indigo-500 shadow-sky-500/25';
  };

  const getBrandGradient = (t: AppTheme) => {
    if (t === 'emerald') return 'from-emerald-500 to-teal-500 shadow-emerald-500/30';
    if (t === 'cyber') return 'from-purple-500 to-pink-500 shadow-purple-500/30';
    return 'from-sky-400 to-indigo-600 shadow-sky-500/30';
  };

  const getBadgeStyle = (t: AppTheme) => {
    if (t === 'emerald') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (t === 'cyber') return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
  };

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300"
      style={{
        backgroundColor: 'var(--canvas-header)',
        borderColor: 'var(--border-card)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div
            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getBrandGradient(
              theme
            )} flex items-center justify-center text-white font-black text-xs shadow-md transition-colors duration-300`}
          >
            IP
          </div>
          <span className="font-bold text-sm tracking-tight text-white flex items-center">
            <span>IPO Predictor</span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ml-1.5 transition-colors ${getBadgeStyle(
                theme
              )}`}
            >
              v2.0
            </span>
          </span>
        </div>

        {/* Center Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
              activeTab === 'simulator'
                ? `${getAccentGradient(theme)} text-white shadow-md font-bold`
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Target className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Predictor</span>
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
              activeTab === 'upcoming'
                ? `${getAccentGradient(theme)} text-white shadow-md font-bold`
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Upcoming IPOs</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse ml-0.5" />
          </button>

          <button
            onClick={() => setActiveTab('backtest')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
              activeTab === 'backtest'
                ? `${getAccentGradient(theme)} text-white shadow-md font-bold`
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Real Track Record</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
              activeTab === 'guide'
                ? `${getAccentGradient(theme)} text-white shadow-md font-bold`
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>User Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('contact')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
              activeTab === 'contact' || activeTab === 'feedback'
                ? `${getAccentGradient(theme)} text-white shadow-md font-bold`
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Contact & Feedback</span>
          </button>
        </nav>

        {/* Right Controls: Theme Switcher & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Theme Switcher Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface-card-subtle)] border border-[var(--border-card)] hover:border-zinc-400 text-zinc-200 hover:text-white transition-colors duration-200 shadow-md cursor-pointer select-none group focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
              title="Theme Change"
              aria-label="Theme Change"
            >
              <Palette className="w-3.5 h-3.5 text-[var(--accent-primary)] motion-safe:transition-transform duration-200 group-hover:rotate-12" aria-hidden="true" />
              <div className="flex items-center -space-x-1">
                <span className={`w-2.5 h-2.5 rounded-full ${currentThemeObj.dot1}`} />
                <span className={`w-2.5 h-2.5 rounded-full ${currentThemeObj.dot2}`} />
              </div>
              <span className="text-xs font-medium hidden sm:inline">Theme</span>
              <ChevronDown
                className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${
                  menuOpen ? 'rotate-180 text-white' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-2xl border shadow-2xl p-2 z-[100] motion-safe:animate-in motion-safe:fade-in duration-150"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  borderColor: 'var(--border-card)',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75)',
                }}
              >
                <div className="px-3 py-2 text-xs font-semibold text-zinc-400 border-b border-[var(--border-card)] mb-1 flex items-center justify-between font-sans">
                  <span>Select Theme Palette</span>
                  <span className="text-[10px] text-zinc-400">3 Presets</span>
                </div>
                <div className="space-y-1">
                  {THEMES.map((t) => {
                    const isSelected = t.id === theme;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTheme(t.id);
                          setMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
                          isSelected
                            ? 'bg-white/10 border border-white/20 text-white font-bold'
                            : 'hover:bg-white/5 border border-transparent text-zinc-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center -space-x-1.5 flex-shrink-0">
                            <span className={`w-3.5 h-3.5 rounded-full ${t.dot1} ring-2 ring-[var(--surface-card)]`} />
                            <span className={`w-3.5 h-3.5 rounded-full ${t.dot2} ring-2 ring-[var(--surface-card)]`} />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white flex items-center gap-2">
                              <span>{t.name}</span>
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/10 text-zinc-300">
                                {t.badge}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-400">{t.tagline}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* User Authentication Menu */}
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-300 transition-colors duration-200 shadow-sm cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign In</span>
            </button>
          ) : (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface-card-subtle)] border border-[var(--border-card)] hover:border-emerald-500/50 text-zinc-200 transition-colors duration-200 shadow-md cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || 'Profile'}
                    className="w-5 h-5 rounded-full object-cover border border-emerald-500/40"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                    {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden md:inline max-w-[100px] truncate text-slate-200">
                  {user?.full_name || user?.email.split('@')[0]}
                </span>
                {watchlist.length > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Bookmark className="w-2.5 h-2.5 fill-amber-400/30" aria-hidden="true" />
                    {watchlist.length}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${userMenuOpen ? 'rotate-180 text-white' : ''}`} aria-hidden="true" />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl border shadow-2xl p-2 z-[100] motion-safe:animate-in motion-safe:fade-in duration-150"
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    borderColor: 'var(--border-card)',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75)',
                  }}
                >
                  <div className="px-3 py-2 border-b border-[var(--border-card)] mb-1">
                    <p className="text-xs font-bold text-white truncate">{user?.full_name || 'Terminal Trader'}</p>
                    <p className="text-[10px] font-mono text-zinc-400 truncate">{user?.email}</p>
                    {user?.phone_number && (
                      <p className="text-[10px] font-mono text-emerald-400/90 mt-0.5">
                        Phone: +91 {user.phone_number} {user.phone_verified ? '✓' : ''}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        {user?.auth_provider === 'google' ? 'Google Auth' : user?.role || 'Verified'}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {watchlist.length} bookmarked
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors duration-200 cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sub-Header Scrollable Tab Navigation */}
      <nav className="md:hidden border-t border-[var(--border-card)] bg-[var(--surface-card-subtle)]/95 backdrop-blur-md px-3 pt-2 pb-2.5 flex items-center gap-1.5 overflow-x-auto visible-scrollbar-x">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
            activeTab === 'simulator'
              ? `${getAccentGradient(theme)} text-white shadow-md font-bold`
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Target className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Predictor</span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
            activeTab === 'upcoming'
              ? `${getAccentGradient(theme)} text-white shadow-md font-bold`
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Radio className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Upcoming IPOs</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse ml-0.5" />
        </button>

        <button
          onClick={() => setActiveTab('backtest')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
            activeTab === 'backtest'
              ? `${getAccentGradient(theme)} text-white shadow-md font-bold`
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <History className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Track Record</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
            activeTab === 'guide'
              ? `${getAccentGradient(theme)} text-white shadow-md font-bold`
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
          <span>User Guide</span>
        </button>

        <button
          onClick={() => setActiveTab('contact')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
            activeTab === 'contact' || activeTab === 'feedback'
              ? `${getAccentGradient(theme)} text-white shadow-md font-bold`
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Contact & Feedback</span>
        </button>
      </nav>
    </header>
  );
};
