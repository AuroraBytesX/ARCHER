import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, Sparkles, User, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, signup } = useUser();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  
  // Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setResetToken('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleModeSwitch = (newMode: 'login' | 'signup' | 'forgot' | 'reset') => {
    resetForm();
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters in length.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter.');
        return;
      }
    }

    if (mode === 'reset') {
      if (!resetToken.trim()) {
        setErrorMessage('Please enter the recovery token from your email.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('New password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'forgot') {
        const res = await api.forgotPassword({ email: cleanEmail });
        setSuccessMessage(res.message || `Recovery token sent to ${cleanEmail}. Please check your inbox.`);
        setTimeout(() => {
          setMode('reset');
        }, 1800);
        return;
      }

      if (mode === 'reset') {
        const res = await api.resetPassword({
          email: cleanEmail,
          token: resetToken.trim(),
          new_password: password.trim()
        });
        setSuccessMessage(res.message || 'Password updated successfully. You can now sign in.');
        setTimeout(() => {
          handleModeSwitch('login');
        }, 2000);
        return;
      }

      if (mode === 'signup') {
        const res = await api.register({
          name: name.trim() || undefined,
          email: cleanEmail,
          password: password.trim()
        });
        signup(res.email);
        onClose();
      } else {
        const res = await api.login({
          email: cleanEmail,
          password: password.trim()
        });
        login(res.email);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-6 z-10 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {mode === 'login'
                  ? 'Sign In to ARCHER'
                  : mode === 'signup'
                  ? 'Create Your Account'
                  : mode === 'forgot'
                  ? 'Forgot Password'
                  : 'Set New Password'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mode === 'login'
                  ? 'Access your private research library and inquiries'
                  : mode === 'signup'
                  ? 'Get persistent sessions and 500 PDF library capacity'
                  : mode === 'forgot'
                  ? 'Enter your email to receive recovery instructions'
                  : 'Enter your recovery token and new password'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Access Notice */}
        {mode !== 'forgot' && mode !== 'reset' && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs space-y-2">
            <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Account Privileges</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Guest access is limited
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Guest: Up to 5 PDF uploads per session and 40 queries</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Registered: Up to 500 papers and persistent inquiry history</span>
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label htmlFor="auth-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Dr. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="researcher@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {mode === 'reset' && (
            <div className="space-y-1.5">
              <label htmlFor="auth-reset-token" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                6-Digit Recovery Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="auth-reset-token"
                  name="token"
                  type="text"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  placeholder="e.g. 481920"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value.trim())}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 font-mono tracking-wider font-semibold"
                />
              </div>
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="auth-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {mode === 'reset' ? 'New Password' : 'Password'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('forgot')}
                    className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {(mode === 'signup' || mode === 'reset') && (
            <div className="space-y-1.5">
              <label htmlFor="auth-confirm-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Confirm {mode === 'reset' ? 'New Password' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="auth-confirm-password"
                  name="confirm_password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl font-bold bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {mode === 'login'
                ? 'Sign In'
                : mode === 'signup'
                ? 'Create Account'
                : mode === 'forgot'
                ? 'Send Recovery Token'
                : 'Update Password'}
            </span>
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          {mode === 'login' ? (
            <p>
              Do not have an account?{' '}
              <button
                onClick={() => handleModeSwitch('signup')}
                className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
              >
                Sign Up
              </button>
            </p>
          ) : mode === 'signup' ? (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => handleModeSwitch('login')}
                className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Remember your password?{' '}
              <button
                onClick={() => handleModeSwitch('login')}
                className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
