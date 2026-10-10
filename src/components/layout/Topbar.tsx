import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getUserNotifications, markAllAsRead } from '@/services/notificationService';
import { Bell, Check, Search, Moon, Sun } from 'lucide-react';
import type { Notification } from '@/types';
import { formatDistanceToNow } from 'date-fns';

export default function Topbar() {
  const { profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    getUserNotifications(profile.uid).then(setNotifications).catch(console.error);
  }, [profile]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAll = async () => {
    if (!profile) return;
    await markAllAsRead(profile.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const darkMode = theme === 'dark';

  return (
    <header
      className="glass-panel"
      style={{
        height: 'var(--topbar-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      {/* Global Search (Left Aligned) */}
      <div style={{ flex: 1, maxWidth: 380 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              color: 'var(--color-on-surface-variant)',
              opacity: 0.7,
            }}
          />
          <input
            type="text"
            placeholder="Search meetings, rooms, or people..."
            style={{
              width: '100%',
              background: 'var(--color-surface-container-low)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px 8px 36px',
              fontSize: '0.8125rem',
              color: 'var(--color-on-surface)',
              outline: 'none',
              transition: 'all var(--transition-fast)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--meetops-purple)';
              e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border-subtle)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 10,
              display: 'flex',
              gap: 4,
              pointerEvents: 'none',
            }}
          >
            <kbd
              className="font-label-caps"
              style={{
                fontSize: '9px',
                background: 'var(--color-surface-container-highest)',
                border: '1px solid var(--color-border-subtle)',
                padding: '2px 4px',
                borderRadius: '4px',
                color: 'var(--color-on-surface-variant)',
              }}
            >
              ⌘
            </kbd>
            <kbd
              className="font-label-caps"
              style={{
                fontSize: '9px',
                background: 'var(--color-surface-container-highest)',
                border: '1px solid var(--color-border-subtle)',
                padding: '2px 4px',
                borderRadius: '4px',
                color: 'var(--color-on-surface-variant)',
              }}
            >
              K
            </kbd>
          </div>
        </div>
      </div>

      {/* Trailing Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 8,
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            color: 'var(--color-on-surface-variant)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-on-surface)'; e.currentTarget.style.background = 'var(--color-surface-container-highest)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-on-surface-variant)'; e.currentTarget.style.background = 'transparent'; }}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification Bell */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            id="notification-bell"
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              position: 'relative',
              background: 'transparent',
              border: 'none',
              padding: 8,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              color: 'var(--color-on-surface-variant)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-on-surface)'; e.currentTarget.style.background = 'var(--color-surface-container-highest)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-on-surface-variant)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'var(--color-error)',
                  color: 'var(--color-on-error-container)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 8px rgba(255, 180, 171, 0.4)',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div
              className="animate-scale-in"
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: 8,
                width: 360,
                maxHeight: 420,
                overflowY: 'auto',
                background: 'var(--color-surface-dark)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-subtle)',
                boxShadow: 'var(--shadow-ambient)',
                zIndex: 50,
              }}
            >
              <div
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--color-border-subtle)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAll}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'none',
                      border: 'none',
                      color: 'var(--meetops-purple)',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    <Check size={14} /> Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div
                  style={{
                    padding: 32,
                    textAlign: 'center',
                    color: 'var(--color-on-surface-variant)',
                    fontSize: '0.875rem',
                  }}
                >
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      background: n.read ? 'transparent' : 'rgba(139, 92, 246, 0.08)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface)', margin: 0, lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', marginTop: 4, display: 'inline-block' }}>
                      {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Separator line */}
        <div style={{ width: 1, height: 20, background: 'var(--color-border-subtle)' }} />

        {/* User profile info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--meetops-purple), #6D28D9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)',
            }}
          >
            {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div style={{ lineHeight: 1.2, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
              {profile?.name || 'User'}
            </div>
            <div
              className="font-label-caps"
              style={{
                fontSize: '9px',
                color: 'var(--color-on-surface-variant)',
                textTransform: 'uppercase',
                opacity: 0.7,
              }}
            >
              {profile?.role || 'user'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
