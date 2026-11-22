import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Target, Radio, History, BookOpen, Palette, Check, ChevronDown, LogIn, LogOut, User, Bookmark, MessageSquare, Mail, ShieldCheck, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AppTheme = 'midnight' | 'emerald' | 'cyber';
export type NavigationTab = 'simulator' | 'upcoming' | 'backtest' | 'guide' | 'feedback' | 'contact' | 'history';

export interface ThemeOption {
  id: AppTheme;
  name: string;
  tagline: string;
  dot1: string;
  dot2: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'midnight',
    name: 'Midnight Blue',
    tagline: 'Deep Oceanic Navy • Sky & Indigo',
    dot1: 'bg-sky-400',
    dot2: 'bg-indigo-400',
  },
  {
    id: 'emerald',
    name: 'Bloomberg Emerald',
    tagline: 'Obsidian Terminal • Mint & Gold',
    dot1: 'bg-emerald-500',
    dot2: 'bg-amber-400',
  },
  {
    id: 'cyber',
    name: 'Charcoal Nebula',
    tagline: 'Deep Charcoal • Violet & Rose',
    dot1: 'bg-purple-500',
    dot2: 'bg-pink-500',
  },
];

interface HeaderProps {
  activeTab: NavigationTab;
  setActiveTab?: (tab: NavigationTab) => void;
  onTabChange?: (tab: NavigationTab) => void;
  theme: AppTheme;
  setTheme?: (theme: AppTheme) => void;
  onThemeChange?: (theme: AppTheme) => void;
  onOpenDossier?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onTabChange,
  theme,
  setTheme,
  onThemeChange,
  onOpenDossier,
}) => {
  const switchTab = (tab: NavigationTab) => {
    if (setActiveTab) setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const switchTheme = (t: AppTheme) => {
    if (setTheme) setTheme(t);
    if (onThemeChange) onThemeChange(t);
  };
  const { user, isAuthenticated, logout, openAuthModal, watchlist } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setMenuOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

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
          <span className="font-bold text-sm tracking-tight text-white">
            IPO Predictor
          </span>
        </div>

        {/* Center Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => switchTab('simulator')}
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
            onClick={() => switchTab('upcoming')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
              activeTab === 'upcoming'
                ? `${getAccentGradient(theme)} text-white shadow-md font-bold`
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Upcoming IPOs</span>
          </button>

          <button
            onClick={() => switchTab('backtest')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
              activeTab === 'backtest' || activeTab === 'history'
                ? `${getAccentGradient(theme)} text-white shadow-md font-bold`
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Real Track Record</span>
          </button>

          <button
            onClick={() => switchTab('guide')}
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
            onClick={() => switchTab('contact')}
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
          {/* Theme Switcher Dropdown (Desktop only - hidden on mobile navbar) */}
          <div className="relative hidden md:block" ref={menuRef}>
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
                <div className="px-3 py-2 text-xs font-semibold text-zinc-400 border-b border-[var(--border-card)] mb-1 font-sans">
                  <span>Select Theme</span>
                </div>
                <div className="space-y-1">
                  {THEMES.map((t) => {
                    const isSelected = t.id === theme;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          switchTheme(t.id);
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
                            <div className="text-xs font-semibold text-white">
                              {t.name}
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
                      openAuthModal('sessions');
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors duration-200 cursor-pointer font-medium mb-1 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                    <span>Security & Sessions</span>
                  </button>

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

          {/* Mobile Hamburger Menu Button (BetaList style) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 border border-[var(--border-card)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay Portaled to document.body (BetaList style) */}
      {mobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 w-full h-full z-[99999] md:hidden bg-[#090d16] text-white flex flex-col overflow-y-auto animate-in fade-in duration-200"
          style={{ backgroundColor: 'var(--canvas-bg, #0B1120)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
        >
          {/* Top Bar: Brand & Circular Close Button */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0 bg-[#090d16]/95 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getBrandGradient(
                  theme
                )} flex items-center justify-center text-white font-black text-xs shadow-md`}
              >
                IP
              </div>
              <span className="font-bold text-base tracking-tight text-white">
                IPO Predictor
              </span>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="w-10 h-10 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors border border-white/10 cursor-pointer shadow-md"
              aria-label="Close Navigation Menu"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation Links (BetaList layout & style) */}
          <div className="flex-1 px-6 py-6 flex flex-col justify-between">
            <nav className="flex flex-col space-y-2">
              <button
                type="button"
                onClick={() => {
                  switchTab('simulator');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left py-3.5 px-4 rounded-xl text-lg font-bold transition-all duration-150 flex items-center justify-between cursor-pointer ${
                  activeTab === 'simulator'
                    ? 'bg-white/10 text-white font-extrabold'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-3.5">
                  <Target className="w-5 h-5 text-sky-400" />
                  <span>Predictor</span>
                </span>
                {activeTab === 'simulator' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  switchTab('upcoming');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left py-3.5 px-4 rounded-xl text-lg font-bold transition-all duration-150 flex items-center justify-between cursor-pointer ${
                  activeTab === 'upcoming'
                    ? 'bg-white/10 text-white font-extrabold'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-3.5">
                  <Radio className="w-5 h-5 text-emerald-400" />
                  <span>Upcoming IPOs</span>
                </span>
                {activeTab === 'upcoming' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  switchTab('backtest');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left py-3.5 px-4 rounded-xl text-lg font-bold transition-all duration-150 flex items-center justify-between cursor-pointer ${
                  activeTab === 'backtest' || activeTab === 'history'
                    ? 'bg-white/10 text-white font-extrabold'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-3.5">
                  <History className="w-5 h-5 text-purple-400" />
                  <span>Real Track Record</span>
                </span>
                {(activeTab === 'backtest' || activeTab === 'history') && (
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.9)]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  switchTab('guide');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left py-3.5 px-4 rounded-xl text-lg font-bold transition-all duration-150 flex items-center justify-between cursor-pointer ${
                  activeTab === 'guide'
                    ? 'bg-white/10 text-white font-extrabold'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-3.5">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <span>User Guide</span>
                </span>
                {activeTab === 'guide' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                )}
              </button>

              <div className="h-px bg-white/10 my-3" />

              <button
                type="button"
                onClick={() => {
                  switchTab('contact');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left py-3.5 px-4 rounded-xl text-lg font-bold transition-all duration-150 flex items-center justify-between cursor-pointer ${
                  activeTab === 'contact' || activeTab === 'feedback'
                    ? 'bg-white/10 text-white font-extrabold'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-3.5">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  <span>Contact & Feedback</span>
                </span>
                {(activeTab === 'contact' || activeTab === 'feedback') && (
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                )}
              </button>
            </nav>

            {/* Theme & User Controls */}
            <div className="pt-6 space-y-6">
              {/* Theme Selection in Mobile Menu */}
              <div className="pt-4 border-t border-white/10">
                <p className="text-[11px] font-mono text-zinc-400 font-semibold mb-2.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Terminal Theme</span>
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => switchTheme(t.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        theme === t.id
                          ? 'bg-white/10 border-white/25 text-white'
                          : 'bg-white/5 border-transparent text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center -space-x-1">
                          <span className={`w-2.5 h-2.5 rounded-full ${t.dot1}`} />
                          <span className={`w-2.5 h-2.5 rounded-full ${t.dot2}`} />
                        </div>
                        <span>{t.name}</span>
                      </div>
                      {theme === t.id && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Actions: Auth / User Info */}
              <div className="pt-4 border-t border-white/10">
                {isAuthenticated ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 font-bold text-xs">
                        {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{user?.full_name || 'Terminal User'}</p>
                        <p className="text-[10px] font-mono text-zinc-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('login');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-sky-500/25 hover:brightness-110 transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In / Register</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
