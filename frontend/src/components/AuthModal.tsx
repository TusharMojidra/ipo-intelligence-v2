import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, Lock, Mail, User, ShieldCheck, ArrowRight, Loader2, 
  Bookmark, Cpu, Phone, KeyRound, CheckCircle2, AlertCircle, 
  ExternalLink, ArrowLeft 
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalMode, 
    login, 
    register, 
    continueWithGoogle, 
    sendOtp, 
    verifyOtp 
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Form fields
  const [identifier, setIdentifier] = useState(''); // Email or Mobile for login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  // Verification states
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  
  // Google Chooser states
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  
  // UI states
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    setMode(authModalMode);
    setError(null);
    setSuccessMsg(null);
    setIsOtpSent(false);
    setDevOtpHint(null);
    setShowGoogleChooser(false);
  }, [authModalMode, isAuthModalOpen]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  // Handle Google Sign-In with real redirection or Google Chooser
  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      // 1. Check if backend has live Google OAuth credentials configured
      const configRes = await fetch('/api/auth/google/config');
      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.configured) {
          // Redirect directly to official Google OAuth sign-in tab
          window.location.href = '/api/auth/google/login';
          return;
        }
      }

      // 2. Check if official Google Identity Services SDK is present on window
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        const google = (window as any).google;
        google.accounts.id.initialize({
          client_id: (window as any).GOOGLE_CLIENT_ID || "mock-google-client-id.apps.googleusercontent.com",
          callback: async (response: any) => {
            if (response.credential) {
              const res = await continueWithGoogle(response.credential);
              if (!res.success) setError(res.error || 'Google authentication failed');
            }
          }
        });
        google.accounts.id.prompt();
        setIsGoogleLoading(false);
        return;
      }

      // 3. In local environment without Google Cloud Client ID set:
      // Show elegant, native Google Account Chooser screen (no browser prompt!)
      setShowGoogleChooser(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google Sign-In');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Perform 1-click Google Profile creation for selected account
  const handleSelectGoogleAccount = async (selectedEmail: string, selectedName?: string) => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const trimmedEmail = selectedEmail.trim().toLowerCase();
      const profileName = selectedName?.trim() || trimmedEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      const googleToken = `google_jwt.${btoa(JSON.stringify({
        email: trimmedEmail,
        name: profileName,
        sub: `google_${Date.now()}`,
        picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${trimmedEmail}`
      }))}.sig`;

      const res = await continueWithGoogle(googleToken);
      if (!res.success) {
        setError(res.error || 'Google authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate Google account');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Handle Dispatching OTP Code
  const handleSendOtp = async (targetVal: string, purpose: 'login' | 'register' = 'login') => {
    setError(null);
    setSuccessMsg(null);
    if (!targetVal.trim()) {
      setError(`Please enter your ${purpose === 'register' ? 'mobile number or email' : 'email or mobile number'} to receive the code.`);
      return;
    }

    setIsSendingOtp(true);
    const res = await sendOtp(targetVal.trim(), purpose);
    setIsSendingOtp(false);

    if (res.success) {
      setIsOtpSent(true);
      setSuccessMsg(res.message || 'Verification code dispatched successfully.');
      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
      }
      setOtpCountdown(60);
    } else {
      setError(res.error || 'Failed to dispatch verification code.');
    }
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        if (loginMethod === 'otp') {
          if (!otpCode.trim()) {
            setError('Please enter the 6-digit verification code.');
            setIsSubmitting(false);
            return;
          }
          const res = await verifyOtp(identifier.trim(), otpCode.trim(), 'login');
          if (!res.success) {
            setError(res.error || 'Failed to verify code.');
          }
        } else {
          if (!identifier.trim()) {
            setError('Please enter your email or mobile number.');
            setIsSubmitting(false);
            return;
          }
          if (!password) {
            setError('Please enter your password.');
            setIsSubmitting(false);
            return;
          }
          const res = await login(identifier.trim(), password);
          if (!res.success) {
            setError(res.error || 'Failed to authenticate');
          }
        }
      } else {
        // Register Mode (Manual Details Entry)
        if (!email.trim() || !email.includes('@')) {
          setError('Please provide a valid email address.');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters long.');
          setIsSubmitting(false);
          return;
        }
        const res = await register(
          email.trim(), 
          password, 
          fullName.trim() || undefined, 
          phoneNumber.trim() || undefined,
          otpCode.trim() || undefined
        );
        if (!res.success) {
          setError(res.error || 'Failed to create account.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md motion-safe:animate-in motion-safe:fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-7 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Accent Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accent-primary)]"></div>

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          aria-label="Close"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* ===================== GOOGLE ACCOUNT CHOOSER VIEW ===================== */}
        {showGoogleChooser ? (
          <div className="motion-safe:animate-in motion-safe:fade-in duration-150">
            {/* Back button */}
            <button
              type="button"
              onClick={() => setShowGoogleChooser(false)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-4 transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Back to Sign In</span>
            </button>

            {/* Google Header */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-md p-2 mb-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden="true" role="img">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Choose a Google Account</h3>
              <p className="text-xs text-slate-400 mt-1">to continue to IPO Intelligence Terminal</p>
            </div>

            {/* Error in Chooser */}
            {error && (
              <div className="mb-4 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Pre-configured Quick Select Profiles */}
            <div className="space-y-2 mb-4">
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={() => handleSelectGoogleAccount('investor.pro@gmail.com', 'Investor Pro')}
                className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-slate-600 flex items-center justify-between text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/40">
                    IP
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition">Investor Pro</p>
                    <p className="text-[11px] font-mono text-slate-400">investor.pro@gmail.com</p>
                  </div>
                </div>
                <ArrowRight size={15} className="text-slate-500 group-hover:text-emerald-400 transition" />
              </button>

              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={() => handleSelectGoogleAccount('rohan.trader@gmail.com', 'Rohan Sharma')}
                className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-slate-600 flex items-center justify-between text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-sm border border-cyan-500/40">
                    RS
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition">Rohan Sharma</p>
                    <p className="text-[11px] font-mono text-slate-400">rohan.trader@gmail.com</p>
                  </div>
                </div>
                <ArrowRight size={15} className="text-slate-500 group-hover:text-cyan-400 transition" />
              </button>
            </div>

            {/* Custom Google Account Entry Option */}
            <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2 mb-4">
              <label className="block text-[11px] font-medium text-slate-300">Or use your personal Google account:</label>
              <input
                type="email"
                value={customGoogleEmail}
                onChange={(e) => setCustomGoogleEmail(e.target.value)}
                placeholder="your.google.account@gmail.com"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                disabled={isGoogleLoading || !customGoogleEmail.includes('@')}
                onClick={() => handleSelectGoogleAccount(customGoogleEmail, customGoogleName)}
                className="w-full py-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-lg transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isGoogleLoading ? <Loader2 size={14} className="animate-spin" /> : <span>Continue as {customGoogleEmail || 'Google User'}</span>}
              </button>
            </div>

            {/* Developer note */}
            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              Note: To enable full browser redirection to <code className="text-slate-400">accounts.google.com</code>, provide <code className="text-emerald-400">GOOGLE_CLIENT_ID</code> and <code className="text-emerald-400">GOOGLE_CLIENT_SECRET</code> in your server environment.
            </p>
          </div>
        ) : (
          /* ===================== STANDARD LOGIN / REGISTER VIEW ===================== */
          <>
            {/* Header */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2.5">
                <ShieldCheck size={22} aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {mode === 'login' ? 'Trader Access' : 'Create Trader Profile'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'login' 
                  ? 'Authenticate to unlock your personal watchlist & simulation vault' 
                  : 'Join India\'s institutional IPO intelligence terminal'}
              </p>
            </div>

            {/* 1. Continue with Google Button (Prominent 1-Click First Entry) */}
            <div className="mb-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-3 transition-colors duration-200 active:scale-[0.98] border border-slate-300 disabled:opacity-60 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
                id="continue-with-google-btn"
              >
                {isGoogleLoading ? (
                  <Loader2 size={16} className="motion-safe:animate-spin text-slate-700" aria-hidden="true" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true" role="img">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span className="font-bold tracking-tight">Continue with Google</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700/60"></div>
              </div>
              <div className="relative flex justify-center text-xs font-sans">
                <span className="bg-slate-900 px-3 text-slate-500 font-semibold">or enter details manually</span>
              </div>
            </div>

            {/* Mode Toggle Tabs (Sign In vs Create Account) */}
            <div className="flex bg-slate-800/80 p-1 rounded-xl mb-4 border border-slate-700/50">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
                  mode === 'login'
                    ? 'bg-slate-900 text-emerald-400 shadow-sm border border-slate-700/80'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
                  mode === 'register'
                    ? 'bg-slate-900 text-emerald-400 shadow-sm border border-slate-700/80'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start gap-2 animate-in fade-in">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <span className="font-semibold text-rose-300">Notice: </span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Success Alert */}
            {successMsg && (
              <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Dev OTP Helper Banner */}
            {devOtpHint && (
              <div 
                onClick={() => setOtpCode(devOtpHint)}
                className="mb-3 p-2 bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-400/60 rounded-xl text-xs text-cyan-300 flex items-center justify-between cursor-pointer transition select-none"
                title="Click to auto-fill verification code"
              >
                <div className="flex items-center gap-1.5">
                  <KeyRound size={14} className="text-cyan-400" aria-hidden="true" />
                  <span>Verification Code: <strong className="font-mono text-cyan-200">{devOtpHint}</strong></span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold">
                  Tap to fill
                </span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'login' ? (
                /* =================== SIGN IN MODE =================== */
                <>
                  {/* Login Method Sub-Toggle: Password vs OTP */}
                  <div className="flex items-center justify-between text-xs mb-1">
                    <label className="font-medium text-slate-300">Email or Mobile Number</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setLoginMethod('password'); setError(null); }}
                        className={`text-[11px] font-semibold transition ${
                          loginMethod === 'password' ? 'text-emerald-400 underline underline-offset-2' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Password
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => { setLoginMethod('otp'); setError(null); }}
                        className={`text-[11px] font-semibold transition ${
                          loginMethod === 'otp' ? 'text-emerald-400 underline underline-offset-2' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        OTP Code
                      </button>
                    </div>
                  </div>

                  {/* Identifier Field (Email or Mobile) */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      {identifier.includes('@') ? <Mail size={16} /> : <Phone size={16} />}
                    </div>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="name@email.com or +91 98765 43210"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
                    />
                  </div>

                  {/* Password Field (If Password Login) */}
                  {loginMethod === 'password' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300">Password</label>
                        <button
                          type="button"
                          onClick={() => setLoginMethod('otp')}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300"
                        >
                          Login via OTP instead?
                        </button>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <Lock size={16} />
                        </div>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
                        />
                      </div>
                    </div>
                  )}

                  {/* OTP Field & Send Button (If OTP Login) */}
                  {loginMethod === 'otp' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-300">6-Digit Verification Code</label>
                        <button
                          type="button"
                          disabled={isSendingOtp || otpCountdown > 0 || !identifier.trim()}
                          onClick={() => handleSendOtp(identifier, 'login')}
                          className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition cursor-pointer"
                        >
                          {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : isSendingOtp ? 'Sending...' : 'Get OTP Code'}
                        </button>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <KeyRound size={16} />
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 849201"
                          className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* =================== CREATE ACCOUNT MODE (MANUAL ENTRY) =================== */
                <>
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <User size={16} />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Rohan Sharma"
                        className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Mail size={16} />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">Mobile Number (Verification)</label>
                      <button
                        type="button"
                        disabled={isSendingOtp || otpCountdown > 0 || !phoneNumber.trim()}
                        onClick={() => handleSendOtp(phoneNumber, 'register')}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 disabled:opacity-40 transition cursor-pointer"
                      >
                        {otpCountdown > 0 ? `Resend (${otpCountdown}s)` : isSendingOtp ? 'Sending...' : 'Verify Phone'}
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-xs font-mono">
                        +91
                      </div>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="98765 43210"
                        className="w-full pl-11 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  {/* OTP Field for Register if code sent */}
                  {isOtpSent && (
                    <div className="space-y-1 animate-in fade-in">
                      <label className="block text-[11px] font-medium text-emerald-400">Mobile Verification Code</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <KeyRound size={16} />
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="Enter 6-digit OTP"
                          className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-emerald-500/50 rounded-xl text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                        />
                      </div>
                    </div>
                  )}

                  {/* Password Field */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Create Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Lock size={16} />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Action Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'login' 
                        ? (loginMethod === 'otp' ? 'Verify Code & Enter Terminal' : 'Authenticate & Enter') 
                        : 'Create Trader Profile'}
                    </span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Feature perks */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-center gap-5 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <Bookmark size={13} className="text-amber-400" />
                <span>Watchlist</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Cpu size={13} className="text-cyan-400" />
                <span>Simulation Vault</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>OTP & OAuth Safe</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
