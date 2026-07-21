import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ChangePassword() {
  const { mustChangePassword, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/auth/change-password', { method: 'POST', body: JSON.stringify({ newPassword }) });
      await refreshProfile();
      toast.success('Password updated');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-16">
      {mustChangePassword && (
        <p className="mb-4 rounded-lg border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
          For security, set a new password before continuing.
        </p>
      )}
      <h1 className="font-display text-3xl font-bold text-cream">Set a new password</h1>
      <div className="route-line my-6"><span className="route-line-marker" style={{ left: '10%' }} /></div>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">New password</label>
          <input type="password" required minLength={8} className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <button disabled={loading} className="btn-primary w-full">{loading ? 'Saving…' : 'Update password'}</button>
      </form>
    </div>
  );
}
