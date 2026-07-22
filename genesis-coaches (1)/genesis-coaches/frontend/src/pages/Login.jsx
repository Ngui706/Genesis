import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/supabase';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUnverifiedEmail(null);
    try {
      await signIn(email, password);
      toast.success('Welcome back!');
      navigate(location.state?.from?.pathname || '/');
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('not confirmed') || msg.toLowerCase().includes('email_not_confirmed')) {
        setUnverifiedEmail(email);
        toast.error('Email not verified. Please verify your email before logging in.');
      } else {
        toast.error(msg || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      const res = await apiFetch('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      toast.success(res.message || 'Verification link sent to your email!');
    } catch (err) {
      toast.error(err.message || 'Failed to send verification email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Welcome back</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-cream">Log in to your account</h1>
      <div className="route-line my-6"><span className="route-line-marker" style={{ left: '10%' }} /></div>

      {unverifiedEmail && (
        <div className="mb-6 rounded-xl border border-amber/30 bg-amber/10 p-4 text-left">
          <p className="font-semibold text-amber">Email Verification Required</p>
          <p className="mt-1 text-xs text-slate">
            Your email address (<span className="text-cream">{unverifiedEmail}</span>) has not been verified yet. Please check your inbox for the verification link.
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="btn-secondary mt-3 w-full text-xs"
          >
            {resending ? 'Sending email…' : 'Resend Verification Email'}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Email</label>
          <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              className="input pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-cream focus:outline-none"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.05 10.05 0 013.122-.444c4.478 0 8.268 2.943 9.542 7a9.97 9.97 0 01-2.49 4.15m-4.006 2.012a3 3 0 01-4.243-4.243m4.243 4.243L3 3l18 18" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <button disabled={loading} className="btn-primary w-full">{loading ? 'Signing in…' : 'Log in'}</button>
      </form>

      <p className="mt-6 text-center text-sm text-slate">
        New to Genesis Coaches? <Link to="/register" className="text-amber hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
