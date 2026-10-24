import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User, Lock, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const { profile } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const { error: apiError } = await supabase.auth.updateUser({ password: newPassword });
      if (apiError) throw apiError;
      setSuccess('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch { setError('Failed to update password. You may need to re-authenticate.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24 }}>Settings</h1>

      {/* Profile */}
      <div className="bento-card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <User size={20} color="var(--meetops-purple)" />
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 600 }}>Profile</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Name</label>
            <input className="input" value={profile?.name || ''} readOnly style={{ background: 'var(--color-surface-container-highest)' }} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={profile?.email || ''} readOnly style={{ background: 'var(--color-surface-container-highest)' }} />
          </div>
          <div>
            <label className="label">Role</label>
            <input className="input" value={profile?.role || ''} readOnly style={{ background: 'var(--color-surface-container-highest)', textTransform: 'capitalize' }} />
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bento-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Lock size={20} color="var(--meetops-purple)" />
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 600 }}>Change Password</h2>
        </div>
        {error && <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 180, 171, 0.15)', color: 'var(--color-error)', fontSize: '0.8125rem', marginBottom: 16 }}>{error}</div>}
        {success && <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(137, 206, 255, 0.15)', color: 'var(--color-secondary)', fontSize: '0.8125rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={16} />{success}</div>}
        <form onSubmit={handleChangePassword}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">New Password</label>
              <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 20 }}>
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
