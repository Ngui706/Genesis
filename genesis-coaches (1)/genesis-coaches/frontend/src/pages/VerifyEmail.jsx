import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/supabase';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid verification link. Token or email is missing.');
      return;
    }

    apiFetch('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token, email }),
    })
      .then((res) => {
        setStatus('success');
        setMessage(res.message || 'Email verified successfully!');
        toast.success('Email verified!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may be expired.');
      });
  }, [token, email]);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      const res = await apiFetch('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      toast.success(res.message || 'Verification email sent!');
    } catch (err) {
      toast.error(err.message || 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-6 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Account Verification</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-cream">Email Verification</h1>
      <div className="route-line my-6"><span className="route-line-marker" style={{ left: '50%' }} /></div>

      <div className="card space-y-6 p-8">
        {status === 'verifying' && (
          <div className="space-y-4">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-amber border-t-transparent" />
            <p className="text-sm text-slate">Verifying your email address, please wait…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal/10 text-2xl text-teal-light">
              ✓
            </div>
            <p className="font-display text-lg font-semibold text-cream">{message}</p>
            <p className="text-xs text-slate">Your email address has been verified. You can now log in to access your Genesis Coaches account.</p>
            <Link to="/login" className="btn-primary inline-block w-full">
              Proceed to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-2xl text-danger">
              ✕
            </div>
            <p className="font-display text-lg font-semibold text-cream">Verification Failed</p>
            <p className="text-xs text-slate">{message}</p>
            {email && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="btn-secondary w-full"
              >
                {resending ? 'Sending…' : 'Resend Verification Email'}
              </button>
            )}
            <Link to="/login" className="inline-block text-xs text-amber hover:underline">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
