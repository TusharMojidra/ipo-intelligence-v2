import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, WatchlistItem, SavedSimulationItem } from '../types';

export interface SessionItem {
  id: number;
  ip_address?: string | null;
  user_agent?: string | null;
  expires_at: string;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
}

export interface GoogleConfig {
  configured: boolean;
  client_id?: string;
}

export type AuthMode = 'login' | 'register' | 'forgot_password' | 'reset_password' | 'sessions';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  googleConfig: GoogleConfig | null;
  isAuthModalOpen: boolean;
  authModalMode: AuthMode;
  resetTokenParam: string | null;
  verifySuccessMsg: string | null;
  authErrorMsg: string | null;
  clearAuthMessages: () => void;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  continueWithGoogle: (credential: string, userInfo?: any) => Promise<{ success: boolean; error?: string }>;
  triggerGoogleLoginRedirect: () => void;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message: string; error?: string }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message: string; error?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message: string; error?: string }>;
  activeSessions: SessionItem[];
  fetchSessions: () => Promise<void>;
  revokeSession: (sessionId: number) => Promise<boolean>;
  revokeAllOtherSessions: () => Promise<boolean>;
  logout: () => void;
  watchlist: WatchlistItem[];
  isWatchlisted: (companyName: string) => boolean;
  toggleWatchlist: (companyName: string, symbol?: string) => Promise<boolean>;
  savedSimulations: SavedSimulationItem[];
  saveSimulation: (title: string, inputs: any, results: any) => Promise<boolean>;
  deleteSimulation: (id: number) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'ipo_terminal_auth_token';
const USER_KEY = 'ipo_terminal_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // In-memory authentication state (Tokens are NEVER persisted to browser localStorage)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [googleConfig, setGoogleConfig] = useState<GoogleConfig | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');
  const [resetTokenParam, setResetTokenParam] = useState<string | null>(null);
  const [verifySuccessMsg, setVerifySuccessMsg] = useState<string | null>(null);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<SessionItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulationItem[]>([]);

  const openAuthModal = (mode: AuthMode = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => setIsAuthModalOpen(false);

  const clearAuthMessages = () => {
    setVerifySuccessMsg(null);
    setAuthErrorMsg(null);
  };

  const setAuthData = (newToken: string | null, newUser: UserProfile | null) => {
    setToken(newToken);
    setUser(newUser);
    // Explicitly purge any legacy localStorage tokens
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {}
  };

  // Check Google OAuth configuration
  useEffect(() => {
    fetch('/api/auth/google/config')
      .then(res => res.json())
      .then(data => setGoogleConfig(data))
      .catch(() => setGoogleConfig({ configured: false }));
  }, []);

  // Initialize authentication & parse redirected tokens / reset links
  useEffect(() => {
    const initializeAuth = async () => {
      // Purge any legacy tokens from localStorage to ensure HttpOnly cookie security
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } catch (e) {}

      let initialToken: string | null = null;

      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);

        // Check for error redirect
        const queryErr = urlParams.get('auth_error');
        if (queryErr) {
          setAuthErrorMsg(decodeURIComponent(queryErr));
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Check for Google OAuth callback token
        const queryToken = urlParams.get('auth_token');
        if (queryToken) {
          initialToken = queryToken;
          setToken(queryToken);
          setVerifySuccessMsg('Successfully authenticated with Google!');
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Check for password reset link (strip from URL immediately to prevent referrer/history leakage)
        const resetTok = urlParams.get('reset_token');
        if (resetTok) {
          setResetTokenParam(resetTok);
          setAuthModalMode('reset_password');
          setIsAuthModalOpen(true);
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Check for email verification link
        const verifyTok = urlParams.get('verify_token');
        if (verifyTok) {
          window.history.replaceState({}, document.title, window.location.pathname);
          try {
            const res = await fetch('/api/auth/verify-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
              credentials: 'include',
              body: JSON.stringify({ token: verifyTok })
            });
            if (res.ok) {
              setVerifySuccessMsg('Email address verified successfully! You now have full access.');
              if (user) {
                setUser({ ...user, is_verified: true });
              }
            } else {
              setAuthErrorMsg('Verification link is invalid or has expired.');
            }
          } catch (e) {
            console.error('Error verifying email:', e);
            setAuthErrorMsg('Unable to verify email at this time.');
          }
        }
      }

      // Check authenticated session with server via HttpOnly cookie
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            ...(initialToken ? { Authorization: `Bearer ${initialToken}` } : {})
          }
        });
        if (res.ok) {
          const userData: UserProfile | null = await res.json();
          if (userData && userData.id) {
            setUser(userData);
            await fetchUserData(initialToken || undefined);
          } else {
            setAuthData(null, null);
          }
        } else {
          setAuthData(null, null);
        }
      } catch (err) {
        console.error("Failed to verify session", err);
        setAuthData(null, null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const fetchUserData = async (authToken?: string) => {
    const activeTok = authToken || token || localStorage.getItem('ipo_auth_token');
    if (!activeTok) {
      return;
    }
    const reqHeaders: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (activeTok) {
      reqHeaders['Authorization'] = `Bearer ${activeTok}`;
    }
    try {
      const [wlRes, simRes] = await Promise.all([
        fetch('/api/user/watchlist', { credentials: 'include', headers: reqHeaders }),
        fetch('/api/user/simulations', { credentials: 'include', headers: reqHeaders })
      ]);
      if (wlRes.ok) {
        const wl = await wlRes.json();
        setWatchlist(wl);
      }
      if (simRes.ok) {
        const sims = await simRes.json();
        setSavedSimulations(sims);
      }
    } catch (err) {
      console.error("Failed to fetch user data", err);
    }
  };

  const triggerGoogleLoginRedirect = () => {
    window.location.href = '/api/auth/google/login';
  };

  const login = async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          email,
          password,
          remember_me: rememberMe
        })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Invalid email or password.' };
      }
      setAuthData(data.access_token, data.user);
      await fetchUserData(data.access_token);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName
        })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Registration failed.' };
      }
      setAuthData(data.access_token, data.user);
      await fetchUserData(data.access_token);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration' };
    }
  };

  const continueWithGoogle = async (credential: string, userInfo?: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ credential, user_info: userInfo })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Google authentication failed.' };
      }
      setAuthData(data.access_token, data.user);
      await fetchUserData(data.access_token);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during Google authentication' };
    }
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; message: string; error?: string }> => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      return { success: true, message: data.message || 'If an account exists, a reset link was sent.' };
    } catch (err: any) {
      return { success: false, message: '', error: err.message || 'Network error during forgot password' };
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<{ success: boolean; message: string; error?: string }> => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ token, new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: '', error: data.detail || 'Password reset failed.' };
      }
      return { success: true, message: data.message || 'Password successfully updated.' };
    } catch (err: any) {
      return { success: false, message: '', error: err.message || 'Network error during password reset' };
    }
  };

  const verifyEmail = async (token: string): Promise<{ success: boolean; message: string; error?: string }> => {
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: '', error: data.detail || 'Verification failed.' };
      }
      return { success: true, message: data.message || 'Email verified successfully.' };
    } catch (err: any) {
      return { success: false, message: '', error: err.message || 'Network error during verification' };
    }
  };

  const resendVerification = async (email: string): Promise<{ success: boolean; message: string; error?: string }> => {
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      return { success: true, message: data.message || 'If an account exists, a link was dispatched.' };
    } catch (err: any) {
      return { success: false, message: '', error: err.message || 'Network error' };
    }
  };

  const fetchSessions = async () => {
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch('/api/auth/sessions', {
        credentials: 'include',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSessions(data);
      }
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    }
  };

  const revokeSession = async (sessionId: number): Promise<boolean> => {
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers
      });
      if (res.ok) {
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
        return true;
      }
    } catch (err) {
      console.error('Failed to revoke session', err);
    }
    return false;
  };

  const revokeAllOtherSessions = async (): Promise<boolean> => {
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        credentials: 'include',
        headers
      });
      if (res.ok) {
        setActiveSessions(prev => prev.filter(s => s.is_current));
        return true;
      }
    } catch (err) {
      console.error('Failed to revoke sessions', err);
    }
    return false;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
    } catch (e) {
      // Ignore network errors on logout
    }
    setAuthData(null, null);
    setWatchlist([]);
    setSavedSimulations([]);
    setActiveSessions([]);
  };

  const isWatchlisted = (companyName: string) => {
    return watchlist.some(item => item.company_name.toLowerCase().trim() === companyName.toLowerCase().trim());
  };

  const toggleWatchlist = async (companyName: string, symbol?: string): Promise<boolean> => {
    if (!user) {
      openAuthModal('login');
      return false;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const exists = isWatchlisted(companyName);
    try {
      if (exists) {
        const res = await fetch(`/api/user/watchlist/${encodeURIComponent(companyName)}`, {
          method: 'DELETE',
          credentials: 'include',
          headers
        });
        if (res.ok) {
          setWatchlist(prev => prev.filter(item => item.company_name.toLowerCase().trim() !== companyName.toLowerCase().trim()));
          return true;
        }
      } else {
        const res = await fetch('/api/user/watchlist', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ company_name: companyName, symbol: symbol || null })
        });
        if (res.ok) {
          const newItem = await res.json();
          setWatchlist(prev => [newItem, ...prev]);
          return true;
        }
      }
    } catch (err) {
      console.error("Failed to toggle watchlist", err);
    }
    return false;
  };

  const saveSimulation = async (title: string, inputs: any, results: any): Promise<boolean> => {
    if (!user) {
      openAuthModal('login');
      return false;
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch('/api/user/simulations', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ title, inputs, results })
      });
      if (res.ok) {
        const newSim = await res.json();
        setSavedSimulations(prev => [newSim, ...prev]);
        return true;
      }
    } catch (err) {
      console.error("Failed to save simulation", err);
    }
    return false;
  };

  const deleteSimulation = async (id: number): Promise<boolean> => {
    if (!user) return false;
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`/api/user/simulations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers
      });
      if (res.ok) {
        setSavedSimulations(prev => prev.filter(s => s.id !== id));
        return true;
      }
    } catch (err) {
      console.error("Failed to delete simulation", err);
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        googleConfig,
        isAuthModalOpen,
        authModalMode,
        resetTokenParam,
        verifySuccessMsg,
        authErrorMsg,
        clearAuthMessages,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        continueWithGoogle,
        triggerGoogleLoginRedirect,
        forgotPassword,
        resetPassword,
        verifyEmail,
        resendVerification,
        activeSessions,
        fetchSessions,
        revokeSession,
        revokeAllOtherSessions,
        logout,
        watchlist,
        isWatchlisted,
        toggleWatchlist,
        savedSimulations,
        saveSimulation,
        deleteSimulation
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
