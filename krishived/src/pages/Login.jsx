import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Leaf,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  MailCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const {
    user,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    isDemoMode,
  } = useAuth();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function switchMode(newMode) {
    setMode(newMode);
    setError('');
    setSuccessInfo('');
    setPassword('');
    setConfirmPassword('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessInfo('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      setLoading(true);
      try {
        const { data, error: err } = await signUpWithPassword(email.trim(), password);
        if (err) {
          setError(err.message || 'Failed to create account.');
        } else if (data?.user && !data.session) {
          setSuccessInfo(
            `Verification email sent to ${email.trim()}! Please click the confirmation link in your email to verify your signup, then log in here with your email & password.`
          );
          // Pre-populate signin and reset form
          setPassword('');
          setConfirmPassword('');
        }
      } catch (err) {
        setError(err.message || 'Error creating account');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Sign In Mode: only takes email and password
    setLoading(true);
    try {
      const { error: err } = await signInWithPassword(email.trim(), password);
      if (err) {
        if (err.message?.toLowerCase().includes('email not confirmed')) {
          setError('Please confirm your email using the link sent during signup before logging in.');
        } else {
          setError(err.message || 'Invalid email or password');
        }
      }
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError('');
    setSuccessInfo('');
    try {
      const { error: err } = await signInWithGoogle();
      if (err) {
        setError(err.message || 'Failed to initiate Google Sign-In');
      }
    } catch (err) {
      setError(err.message || 'Google sign-in error');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-soil-50 via-white to-soil-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-white/90 rounded-2xl border border-soil-200/80 shadow-md shadow-soil-100 mb-3 backdrop-blur">
            <img
              src="/assets/logo-transparent.png"
              alt="KRISHIVEDA"
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </div>
          <p className="text-sm font-medium text-soil-500 max-w-xs">
            Empowering farmers with early AI crop diagnostics & advisory
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-soil-200/80 shadow-xl shadow-soil-200/50 p-6 sm:p-8">
          {isDemoMode && (
            <div className="text-xs text-turmeric-800 bg-turmeric-50/90 border border-turmeric-200 rounded-2xl p-3.5 mb-6 space-y-2.5 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-turmeric-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="font-semibold block mb-0.5">Demo Mode Active</strong>
                  Explore all app features with mock farm data.
                </div>
              </div>
              <button
                type="button"
                onClick={() => signInWithPassword('demo.farmer@krishived.ai', 'demo123')}
                className="w-full py-2 px-3 rounded-xl bg-turmeric-600 hover:bg-turmeric-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-[0.99] cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-turmeric-200" />
                <span>One-Tap Demo Login (Farmer Account)</span>
              </button>
            </div>
          )}

          {/* Google Sign-In Option */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-soil-300 bg-white hover:bg-soil-50 text-soil-800 font-semibold text-sm transition-all shadow-sm active:scale-[0.99] disabled:opacity-60"
          >
            {googleLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin text-soil-500" />
            ) : (
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-soil-200 w-full" />
            <span className="bg-white px-3 text-xs font-semibold uppercase tracking-wider text-soil-400 absolute">
              or with email & password
            </span>
          </div>

          {/* Mode Switcher Tabs: Sign In / Sign Up */}
          <div className="flex bg-soil-100 p-1 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-white text-canopy-900 shadow-sm'
                  : 'text-soil-500 hover:text-soil-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white text-canopy-900 shadow-sm'
                  : 'text-soil-500 hover:text-soil-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-alert-high rounded-xl text-xs font-medium leading-snug">
              {error}
            </div>
          )}

          {/* Success / Email Verification Info */}
          {successInfo && (
            <div className="mb-4 p-4 bg-canopy-50 border border-canopy-200 text-canopy-900 rounded-2xl text-xs font-medium space-y-2">
              <div className="flex items-center gap-2 font-bold text-canopy-800">
                <MailCheck className="h-4 w-4 text-canopy-600" />
                <span>Verification Link Sent!</span>
              </div>
              <p className="leading-relaxed text-soil-600">{successInfo}</p>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-xs font-bold text-canopy-700 hover:text-canopy-900 underline pt-1 block"
              >
                Go to Sign In
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label flex items-center gap-1.5 text-xs font-bold text-soil-700 mb-1.5">
                <Mail className="h-3.5 w-3.5 text-canopy-600" />
                Email Address
              </label>
              <input
                className="input w-full px-4 py-2.5 text-sm"
                type="email"
                placeholder="farmer@krishived.ai"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="label flex items-center gap-1.5 text-xs font-bold text-soil-700 mb-1.5">
                <Lock className="h-3.5 w-3.5 text-canopy-600" />
                Password
              </label>
              <div className="relative">
                <input
                  className="input w-full px-4 py-2.5 pr-10 text-sm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-soil-400 hover:text-soil-600 p-1"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="label flex items-center gap-1.5 text-xs font-bold text-soil-700 mb-1.5">
                  <Lock className="h-3.5 w-3.5 text-canopy-600" />
                  Confirm Password
                </label>
                <input
                  className="input w-full px-4 py-2.5 text-sm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <p className="text-[11px] text-soil-500 mt-1.5">
                  We&apos;ll send a verification link to your email to activate your account.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold shadow-md shadow-canopy-600/20 mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{mode === 'signup' ? 'Creating Account…' : 'Signing In…'}</span>
                </>
              ) : mode === 'signup' ? (
                <>
                  <span>Sign Up & Send Verification Link</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-soil-400 mt-6">
          By signing in, you agree to KrishiVed Terms of Service & Privacy Policy.
        </p>
      </div>
    </div>
  );
}
