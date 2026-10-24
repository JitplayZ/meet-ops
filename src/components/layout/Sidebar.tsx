import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Box,
  CalendarDays,
  BookOpen,
  Shield,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rooms', label: 'Rooms', icon: Box },
  { to: '/meetings', label: 'Meetings', icon: BookOpen },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
];

const adminItems = [
  { to: '/admin', label: 'Admin Panel', icon: Shield },
];

export default function Sidebar() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    // Complete the async Supabase sign-out first so localStorage/sessionStorage
    // tokens are cleared before we hard-navigate. A full page navigation (not
    // react-router's `navigate`) sidesteps ProtectedRoute's race: when the
    // auth-state update fires during logout, the guard would otherwise replace
    // our `/` redirect with a `/login` navigation. Reloading also remounts
    // AuthProvider against a clean session, so Landing renders unauthenticated.
    try {
      await logout();
    } catch {
      // Even if signOut throws, force the URL change below.
    }
    window.location.assign('/');
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <aside
      className="sidebar"
      style={{
        width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        minHeight: '100vh',
        background: 'var(--color-surface-container-low)',
        borderRight: '1px solid var(--color-border-subtle)',
        color: 'var(--color-on-surface)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--transition-base)',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 40,
        overflow: 'hidden',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: collapsed ? '20px 16px' : '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--meetops-purple), #6D28D9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0,
            boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)',
          }}
        >
          <Sparkles size={18} />
        </div>
        {!collapsed && (
          <div>
            <span style={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.02em', color: 'var(--color-on-surface)', display: 'block', lineHeight: 1.1 }}>
              MeetOps
            </span>
            <span className="font-label-caps" style={{ fontSize: '9px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Enterprise Ops
            </span>
          </div>
        )}
      </div>

      {/* Primary Action Button (New Meeting) */}
      <div style={{ padding: collapsed ? '12px 8px' : '16px' }}>
        <button
          onClick={() => navigate('/meetings/new')}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: collapsed ? '10px 0' : '10px 16px',
            justifyContent: 'center',
            gap: collapsed ? 0 : 8,
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)',
          }}
          title="New Meeting"
        >
          <Plus size={16} />
          {!collapsed && <span>New Meeting</span>}
        </button>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '0 8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              color: isActive ? 'var(--meetops-purple)' : 'var(--color-on-surface-variant)',
              background: isActive ? 'var(--color-surface-container-highest)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--meetops-purple)' : '2px solid transparent',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 400,
              transition: 'all var(--transition-fast)',
              whiteSpace: 'nowrap',
              position: 'relative',
            })}
          >
            <item.icon size={18} style={{ flexShrink: 0 }} />
            {!collapsed && item.label}
          </NavLink>
        ))}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div
              style={{
                margin: '16px 16px 8px',
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--color-outline)',
              }}
            >
              {!collapsed && 'Admin'}
            </div>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? 'var(--meetops-purple)' : 'var(--color-on-surface-variant)',
                  background: isActive ? 'var(--color-surface-container-highest)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--meetops-purple)' : '2px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all var(--transition-fast)',
                  whiteSpace: 'nowrap',
                })}
              >
                <item.icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer Navigation */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavLink
          to="/settings"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            color: isActive ? 'var(--meetops-purple)' : 'var(--color-on-surface-variant)',
            background: isActive ? 'var(--color-surface-container-highest)' : 'transparent',
            borderLeft: isActive ? '2px solid var(--meetops-purple)' : '2px solid transparent',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: isActive ? 600 : 400,
            transition: 'all var(--transition-fast)',
            whiteSpace: 'nowrap',
          })}
        >
          <Settings size={18} style={{ flexShrink: 0 }} />
          {!collapsed && 'Settings'}
        </NavLink>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-on-surface-variant)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            transition: 'all var(--transition-fast)',
            whiteSpace: 'nowrap',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-on-surface)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-on-surface-variant)'; }}
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          {!collapsed && 'Logout'}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-end',
            width: '100%',
            padding: '8px 16px',
            color: 'var(--color-outline)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-on-surface)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-outline)'; }}
          aria-label="Toggle Sidebar"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
