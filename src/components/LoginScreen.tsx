import React, { useState } from 'react';
import { Eye, EyeOff, Sun, Moon, ShieldCheck, User } from 'lucide-react';
import { UserAccount } from '../types';
import { pwOk } from '../utils/helpers';

interface LoginScreenProps {
  users: UserAccount[];
  companies: string[];
  onSignInSuccess: (user: UserAccount, remember: boolean) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  companies,
  onSignInSuccess,
  isDarkMode,
  onToggleTheme
}) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const id = loginId.trim().toLowerCase();

    if (!id || !password) {
      setErrorMsg('Please enter both User ID and Password.');
      return;
    }

    setLoading(true);
    try {
      // Find user by loginId, empId, id, or name
      const matchedUser = users.find(u => {
        if (u.loginId && u.loginId.toLowerCase() === id) return true;
        if (u.empId && u.empId.toLowerCase() === id) return true;
        if (u.id.toLowerCase() === id) return true;
        if (u.name.toLowerCase() === id) return true;
        return false;
      });

      if (!matchedUser) {
        setErrorMsg('User ID not found. Use your company user ID or click a demo user below.');
        setLoading(false);
        return;
      }

      const isValid = await pwOk(matchedUser.id, matchedUser.pwHash, password);
      if (!isValid) {
        setErrorMsg('Invalid password. Default password is blms123');
        setLoading(false);
        return;
      }

      onSignInSuccess(matchedUser, rememberMe);
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoSelect = (u: UserAccount) => {
    setLoginId(u.loginId || u.id);
    setPassword('blms123');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--color-background-primary)]">
      {/* Left Navy Brand Banner */}
      <div className="bg-[var(--brand)] text-white p-8 md:p-12 md:w-5/12 flex flex-col justify-between select-none">
        <div>
          <div className="text-2xl font-bold tracking-tight mb-8">
            Bitopi <span className="opacity-80 font-normal">Group</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
              Business Licenses Monitoring System (BLMS)
            </h1>
            <p className="text-sm opacity-85 leading-relaxed max-w-md">
              Centralized compliance register, dynamic traffic-light status monitoring, regulatory audit tracking, and automated renewal reminders across all industrial units.
            </p>

            <div className="pt-4 flex flex-wrap gap-2">
              {companies.map(c => (
                <span
                  key={c}
                  className="px-2.5 py-1 text-[11px] font-semibold border border-white/30 rounded-md tracking-wider bg-white/5"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs opacity-75 flex items-center justify-between border-t border-white/20 pt-4">
          <span>Bitopi Group Corporate Compliance</span>
          <span>BLMS v2.4</span>
        </div>
      </div>

      {/* Right Sign-in Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative bg-[var(--color-background-secondary)]">
        {/* Theme toggle on login */}
        <button
          onClick={onToggleTheme}
          className="absolute top-6 right-6 p-2 rounded-full border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-secondary)] cursor-pointer"
          title="Toggle Theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              Sign In to BLMS
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Enter your Bitopi Group authorized credentials to proceed.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 text-xs rounded-md bg-[#FCEBEB] text-[#A32D2D] border border-[#F2B8B8] flex items-center gap-2">
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-[var(--color-background-primary)] p-6 rounded-xl border border-[var(--color-border-secondary)] shadow-sm space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                User ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  placeholder="e.g. admin or rahul.tal"
                  required
                  className="w-full px-3 py-2 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] focus:outline-hidden focus:border-[var(--brand-text)]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] focus:outline-hidden focus:border-[var(--brand-text)] pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-[10px] text-[var(--color-text-tertiary)]">
                Default password for all accounts: <code className="font-mono bg-black/5 px-1 py-0.5 rounded">blms123</code>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-[var(--color-text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-[var(--color-border-secondary)] text-[var(--brand)] accent-[var(--brand)]"
                />
                Remember me on this browser
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-hover)] rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Sign-in Helper */}
          <div className="p-4 rounded-lg border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] space-y-2">
            <div className="text-[11px] font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--brand)]" />
              Quick Demo Login (Select Role):
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {users.slice(0, 4).map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickDemoSelect(u)}
                  className="text-left p-2 rounded border border-[var(--color-border-tertiary)] hover:border-[var(--brand-text)] hover:bg-[var(--brand-light)] transition-colors text-[11px] cursor-pointer"
                >
                  <div className="font-semibold text-[var(--color-text-primary)] truncate flex items-center gap-1">
                    <User className="w-3 h-3 text-[var(--brand)] shrink-0" />
                    <span className="truncate">{u.name}</span>
                  </div>
                  <div className="text-[10px] text-[var(--color-text-secondary)] truncate">
                    {u.role}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
