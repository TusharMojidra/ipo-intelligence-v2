import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, WatchlistItem, SavedSimulationItem } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  login: (identifier: string, password?: string, otpCode?: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName?: string, phoneNumber?: string, otpCode?: string) => Promise<{ success: boolean; error?: string }>;
  continueWithGoogle: (credential: string, userInfo?: any) => Promise<{ success: boolean; error?: string }>;
  sendOtp: (target: string, purpose?: 'login' | 'register' | 'verify') => Promise<{ success: boolean; message?: string; devOtp?: string; error?: string }>;
  verifyOtp: (target: string, otpCode: string, purpose?: 'login' | 'register' | 'verify', fullName?: string) => Promise<{ success: boolean; error?: string }>;
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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulationItem[]>([]);

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => setIsAuthModalOpen(false);

  // Sync token & user in state & local storage
  const setAuthData = (newToken: string | null, newUser: UserProfile | null) => {
    setToken(newToken);
    setUser(newUser);
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    if (newUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  };

  // Fetch current user and their data if token exists
  useEffect(() => {
    const initializeAuth = async () => {
      // Check if redirected from Google OAuth callback with auth_token in query string
      let storedToken = localStorage.getItem(TOKEN_KEY);
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const queryToken = urlParams.get('auth_token');
        if (queryToken) {
          storedToken = queryToken;
          localStorage.setItem(TOKEN_KEY, queryToken);
          // Clean URL without page reload
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        if (res.ok) {
          const userData: UserProfile = await res.json();
          setUser(userData);
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
          await fetchUserData(storedToken);
        } else {
          // Token expired or invalid
          setAuthData(null, null);
        }
      } catch (err) {
        console.error("Failed to verify authentication token", err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const fetchUserData = async (authToken: string) => {
    try {
      const [wlRes, simRes] = await Promise.all([
        fetch('/api/user/watchlist', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/user/simulations', { headers: { Authorization: `Bearer ${authToken}` } })
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

  const login = async (identifier: string, password?: string, otpCode?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, otp_code: otpCode })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Login failed. Please check your credentials.' };
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
    fullName?: string,
    phoneNumber?: string,
    otpCode?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          phone_number: phoneNumber,
          otp_code: otpCode
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
        headers: { 'Content-Type': 'application/json' },
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

  const sendOtp = async (
    target: string,
    purpose: 'login' | 'register' | 'verify' = 'login'
  ): Promise<{ success: boolean; message?: string; devOtp?: string; error?: string }> => {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, purpose })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Failed to dispatch verification code.' };
      }
      return { success: true, message: data.message, devOtp: data.dev_otp };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while requesting OTP' };
    }
  };

  const verifyOtp = async (
    target: string,
    otpCode: string,
    purpose: 'login' | 'register' | 'verify' = 'login',
    fullName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, otp_code: otpCode, purpose, full_name: fullName })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Verification failed. Please check the code.' };
      }
      if (data.access_token) {
        setAuthData(data.access_token, data.user);
        await fetchUserData(data.access_token);
        setIsAuthModalOpen(false);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during verification' };
    }
  };

  const logout = () => {
    setAuthData(null, null);
    setWatchlist([]);
    setSavedSimulations([]);
  };

  const isWatchlisted = (companyName: string) => {
    return watchlist.some(item => item.company_name.toLowerCase().trim() === companyName.toLowerCase().trim());
  };

  const toggleWatchlist = async (companyName: string, symbol?: string): Promise<boolean> => {
    if (!token) {
      openAuthModal('login');
      return false;
    }

    const exists = isWatchlisted(companyName);
    try {
      if (exists) {
        const res = await fetch(`/api/user/watchlist/${encodeURIComponent(companyName)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setWatchlist(prev => prev.filter(item => item.company_name.toLowerCase().trim() !== companyName.toLowerCase().trim()));
          return true;
        }
      } else {
        const res = await fetch('/api/user/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
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
    if (!token) {
      openAuthModal('login');
      return false;
    }
    try {
      const res = await fetch('/api/user/simulations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
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
    if (!token) return false;
    try {
      const res = await fetch(`/api/user/simulations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
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
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        continueWithGoogle,
        sendOtp,
        verifyOtp,
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
