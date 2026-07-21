import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/supabase';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Account created — please log in');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Join the network</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-cream">Create your account</h1>
      <div className="route-line my-6"><span className="route-line-marker" style={{ left: '10%' }} /></div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Full name</label>
          <input required className="input" value={form.fullName} onChange={update('fullName')} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" required className="input" value={form.email} onChange={update('email')} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={update('phone')} />
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" required minLength={8} className="input" value={form.password} onChange={update('password')} />
        </div>
        <button disabled={loading} className="btn-primary w-full">{loading ? 'Creating account…' : 'Register'}</button>
      </form>

      <p className="mt-6 text-center text-sm text-slate">
        Already have an account? <Link to="/login" className="text-amber hover:underline">Log in</Link>
      </p>
    </div>
  );
}
