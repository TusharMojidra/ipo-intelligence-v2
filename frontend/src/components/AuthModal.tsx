import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, AuthMode } from '../context/AuthContext';
import { 
  X, Lock, Mail, User, ShieldCheck, ArrowRight, Loader2, 
  CheckCircle2, AlertCircle, 
  ArrowLeft, Check, Monitor
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalMode, 
    openAuthModal,
    login, 
    register, 
    continueWithGoogle, 
    triggerGoogleLoginRedirect,
    googleConfig,
    forgotPassword,
    resetPassword,
    resetTokenParam,
    activeSessions,
    fetchSessions,
    revokeSession,
    revokeAllOtherSessions
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // UI states
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Live password strength checklist calculations
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isPasswordStrong = hasMinLen && hasUpper && hasLower && hasDigit && hasSpecial;

  useEffect(() => {
    setMode(authModalMode);
    setError(null);
    setSuccessMsg(null);
    if (authModalMode === 'sessions') {
      fetchSessions();
    }
  }, [authModalMode, isAuthModalOpen]);

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

  // Handle Google Sign-In with real browser redirect to Google
  const handleGoogleSignIn = () => {
    setError(null);
    setIsGoogleLoading(true);
    if (googleConfig?.configured) {
      triggerGoogleLoginRedirect();
    } else {
      // Direct redirect to backend endpoint which handles state generation
      window.location.href = '/api/auth/google/login';
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
        if (!email.trim() || !email.includes('@')) {
          setError('Please provide a valid email address.');
          setIsSubmitting(false);
          return;
        }
        if (!password) {
          setError('Please enter your password.');
          setIsSubmitting(false);
          return;
        }
        const res = await login(email.trim(), password, rememberMe);
        if (!res.success) {
          setError(res.error || 'Invalid email or password.');
        }
      } else if (mode === 'register') {
        if (!email.trim() || !email.includes('@')) {
          setError('Please provide a valid email address.');
          setIsSubmitting(false);
          return;
        }
        if (!isPasswordStrong) {
          setError('Password does not meet the enterprise security standards shown below.');
          setIsSubmitting(false);
          return;
        }
        const res = await register(
          email.trim(), 
          password, 
          fullName.trim() || undefined
        );
        if (!res.success) {
          setError(res.error || 'Registration failed.');
        } else {
          setSuccessMsg('Account created successfully! A verification link has been dispatched to your email.');
        }
      } else if (mode === 'forgot_password') {
        if (!email.trim() || !email.includes('@')) {
          setError('Please provide a valid email address.');
          setIsSubmitting(false);
          return;
        }
        const res = await forgotPassword(email.trim());
        setSuccessMsg(res.message);
      } else if (mode === 'reset_password') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setIsSubmitting(false);
          return;
        }
        if (!isPasswordStrong) {
          setError('New password must satisfy all security requirements.');
          setIsSubmitting(false);
          return;
        }
        const tokenToUse = resetTokenParam;
        if (!tokenToUse) {
          setError('Missing password reset token. Please request a new link.');
          setIsSubmitting(false);
          return;
        }
        const res = await resetPassword(tokenToUse, password);
        if (res.success) {
          setSuccessMsg('Password updated successfully! All other active sessions were terminated.');
          setTimeout(() => {
            setMode('login');
          }, 1500);
        } else {
          setError(res.error || 'Failed to reset password.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md motion-safe:animate-in motion-safe:fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-7 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accent-primary)]"></div>

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none cursor-pointer"
          aria-label="Close"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* ===================== ACTIVE SESSIONS VIEW ===================== */}
        {mode === 'sessions' ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setMode('login')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>

            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-2">
                <Monitor size={22} />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Active Security Sessions</h2>
              <p className="text-xs text-slate-400 mt-1">Review authenticated devices and revoke unauthorized access.</p>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <span className="text-slate-400 font-mono">{activeSessions.length} active sessions found</span>
              {activeSessions.length > 1 && (
                <button
                  type="button"
                  onClick={async () => {
                    await revokeAllOtherSessions();
                    await fetchSessions();
                  }}
                  className="text-rose-400 hover:underline font-mono text-[11px] cursor-pointer"
                >
                  Terminate All Others
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {activeSessions.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 font-mono">Loading active sessions...</div>
              ) : (
                activeSessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white font-semibold">{s.ip_address || '127.0.0.1'}</span>
                        {s.is_current && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                            Current Device
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate max-w-[200px] mt-0.5">
                        {s.user_agent || 'Web Browser Client'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Expires: {new Date(s.expires_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>

                    {!s.is_current && (
                      <button
                        type="button"
                        onClick={async () => {
                          await revokeSession(s.id);
                          await fetchSessions();
                        }}
                        className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-mono cursor-pointer"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={closeAuthModal}
              className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          /* ===================== STANDARD AUTH VIEWS ===================== */
          <>
            {/* Header */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2.5">
                <ShieldCheck size={22} aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {mode === 'login' && 'Sign In'}
                {mode === 'register' && 'Create Account'}
                {mode === 'forgot_password' && 'Reset Account Password'}
                {mode === 'reset_password' && 'Set New Password'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'login' && 'Sign in to access your saved watchlists and predictions'}
                {mode === 'register' && 'Create an account to save simulations and custom watchlists'}
                {mode === 'forgot_password' && 'Enter your email to receive a secure password reset link'}
                {mode === 'reset_password' && 'Choose a new password. All other active sessions will be terminated'}
              </p>
            </div>

            {/* Google Button (Only on login & register) */}
            {(mode === 'login' || mode === 'register') && (
              <>
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-3 transition-colors duration-200 active:scale-[0.98] border border-slate-300 disabled:opacity-60 cursor-pointer"
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
                    <span className="bg-slate-900 px-3 text-slate-500 font-semibold">or authenticate with email & password</span>
                  </div>
                </div>

                {/* Mode Toggle Tabs */}
                <div className="flex bg-slate-800/80 p-1 rounded-xl mb-4 border border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
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
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      mode === 'register'
                        ? 'bg-slate-900 text-emerald-400 shadow-sm border border-slate-700/80'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              </>
            )}

            {/* Back to Sign In button for Forgot / Reset password */}
            {(mode === 'forgot_password' || mode === 'reset_password') && (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-4 transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back to Sign In</span>
              </button>
            )}

            {/* Error Alert */}
            {error && (
              <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <span className="font-semibold text-rose-300">Notice: </span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Success Alert */}
            {successMsg && (
              <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'login' && (
                <>
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

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">Password</label>
                      <button
                        type="button"
                        onClick={() => { setMode('forgot_password'); setError(null); setSuccessMsg(null); }}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                      >
                        Forgot password?
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

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="remember_me_check"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                    <label htmlFor="remember_me_check" className="text-xs text-slate-400 cursor-pointer select-none">
                      Remember me on this device for 7 days
                    </label>
                  </div>
                </>
              )}

              {mode === 'register' && (
                <>
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

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Lock size={16} />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create strong password"
                        className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
                      />
                    </div>

                    {/* Live Password Complexity Checklist */}
                    <div className="mt-2.5 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-[11px] space-y-1 font-mono">
                      <div className={`flex items-center gap-1.5 ${hasMinLen ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                        <Check size={12} className={hasMinLen ? 'text-emerald-400' : 'text-slate-600'} />
                        <span>Minimum 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                        <Check size={12} className={hasUpper ? 'text-emerald-400' : 'text-slate-600'} />
                        <span>At least one uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                        <Check size={12} className={hasLower ? 'text-emerald-400' : 'text-slate-600'} />
                        <span>At least one lowercase letter (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasDigit ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                        <Check size={12} className={hasDigit ? 'text-emerald-400' : 'text-slate-600'} />
                        <span>At least one number (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                        <Check size={12} className={hasSpecial ? 'text-emerald-400' : 'text-slate-600'} />
                        <span>At least one special symbol (!@#$%^&*)</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {mode === 'forgot_password' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Account Email</label>
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
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      We will dispatch a secure 1-hour reset link to your email.
                    </p>
                  </div>
                </>
              )}

              {mode === 'reset_password' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
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

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Lock size={16} />
                      </div>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
                      />
                    </div>

                    {/* Live Password Complexity Checklist */}
                    <div className="mt-2.5 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-[11px] space-y-1 font-mono">
                      <div className={`flex items-center gap-1.5 ${hasMinLen ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                        <Check size={12} className={hasMinLen ? 'text-emerald-400' : 'text-slate-600'} />
                        <span>Minimum 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                        <Check size={12} className={hasUpper ? 'text-emerald-400' : 'text-slate-600'} />
                        <span>Uppercase & lowercase letters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasDigit && hasSpecial ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                        <Check size={12} className={hasDigit && hasSpecial ? 'text-emerald-400' : 'text-slate-600'} />
                        <span>Number and special symbol</span>
                      </div>
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
                      {mode === 'login' && 'Sign In'}
                      {mode === 'register' && 'Create Account'}
                      {mode === 'forgot_password' && 'Send Reset Link'}
                      {mode === 'reset_password' && 'Save New Password & Log In'}
                    </span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
