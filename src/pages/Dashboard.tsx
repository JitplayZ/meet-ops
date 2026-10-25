import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUserMeetings } from '@/services/meetingService';
import { getRooms } from '@/services/roomService';
import {
  CalendarDays,
  DoorOpen,
  TrendingUp,
  Activity,
  ArrowRight,
  MoreHorizontal,
  ArrowUpRight,
  Video,
  FolderOpen,
  Plus,
} from 'lucide-react';
import { format, isAfter, isBefore } from 'date-fns';
import type { Meeting, Room } from '@/types';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return; // Auth provider still resolving session
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([getUserMeetings(user.id), getRooms()])
      .then(([m, r]) => {
        setMeetings(m);
        setRooms(r);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Refetch when the AI assistant creates a booking so the timeline and
    // KPI counters reflect the new meeting without requiring a page reload.
    const handler = () => {
      getUserMeetings(user.id).then(setMeetings).catch(console.error);
    };
    window.addEventListener('meetops:booking-created', handler);
    return () => window.removeEventListener('meetops:booking-created', handler);
  }, [user, authLoading]);

  const upcoming = meetings.filter(
    (m) => isAfter(m.endTime, new Date()) && m.status !== 'cancelled' && m.status !== 'declined',
  );
  const pending = meetings.filter((m) => m.status === 'pending');
  const approved = meetings.filter((m) => m.status === 'approved');

  // Display status derivation
  function getDisplayStatus(m: Meeting): string {
    if (m.status === 'approved' && isBefore(m.endTime, new Date())) {
      return 'completed';
    }
    return m.status;
  }

  // Calculate simple mock utilization rate based on bookings
  const utilizationRate = meetings.length > 0 ? Math.min(Math.round((approved.length / (rooms.length || 1) * 35) + 40), 95) : 0;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 60 }}>
      {/* Overview Dashboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:font-headline-lg text-on-surface mb-1">Overview</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Real-time metrics for today, {format(new Date(), 'EEEE, MMM d')}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => window.print()}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem', padding: '8px 16px' }}
          >
            Export Report
          </button>
        </div>
      </div>

      {/* Bento Grid KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
          marginBottom: 32,
        }}
      >
        {/* Total Meetings */}
        <div className="bento-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 128 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>Total Meetings</span>
            <CalendarDays size={18} style={{ color: 'var(--meetops-purple)', opacity: 0.8 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-on-surface)', lineHeight: 1 }}>{meetings.length}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', display: 'flex', alignItems: 'center' }}>
              <TrendingUp size={12} style={{ marginRight: 2 }} /> 12%
            </span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bento-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 128 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>Pending Approvals</span>
            <Activity size={18} style={{ color: 'var(--color-tertiary)', opacity: 0.8 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-on-surface)', lineHeight: 1 }}>{pending.length}</span>
            {pending.length > 0 ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-tertiary)' }}>requires attention</span>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>all caught up</span>
            )}
          </div>
        </div>

        {/* Available Rooms */}
        <div className="bento-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 128 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>Available Rooms</span>
            <DoorOpen size={18} style={{ color: 'var(--color-secondary)', opacity: 0.8 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-on-surface)', lineHeight: 1 }}>{rooms.length}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>active in network</span>
          </div>
        </div>

        {/* Utilization Rate with Sparkline */}
        <div className="bento-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 128, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 10 }}>
            <span className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>Utilization Rate</span>
            <TrendingUp size={18} style={{ color: 'var(--meetops-purple)', opacity: 0.8 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, position: 'relative', zIndex: 10 }}>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-on-surface)', lineHeight: 1 }}>{utilizationRate}%</span>
          </div>
          {/* Sparkline Overlay */}
          <svg
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '50px',
              opacity: 0.25,
              pointerEvents: 'none',
            }}
            preserveAspectRatio="none"
            viewBox="0 0 100 30"
          >
            <path
              className="sparkline"
              d="M0,30 L10,24 L20,27 L30,12 L40,18 L50,8 L60,16 L70,4 L80,10 L90,2 L100,7"
              fill="none"
              stroke="var(--meetops-purple)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M0,30 L10,24 L20,27 L30,12 L40,18 L50,8 L60,16 L70,4 L80,10 L90,2 L100,7 L100,30 L0,30 Z"
              fill="url(#sparkline-grad)"
            />
            <defs>
              <linearGradient id="sparkline-grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--meetops-purple)" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--meetops-purple)" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Main Bento Grid Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="lg:grid-cols-12">
        
        {/* Left Column (col-span-8) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="lg:col-span-8">
          
          {/* Room Occupancy Insights Chart mockup */}
          <div className="bento-card" style={{ padding: 24, minHeight: 312, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="font-body-md" style={{ fontWeight: 700, color: 'var(--color-on-surface)' }}>Room Occupancy Insights</h3>
              <select
                style={{
                  background: 'var(--color-surface-container-highest)',
                  border: 'none',
                  color: 'var(--color-on-surface-variant)',
                  fontSize: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option>This Week</option>
                <option>Last Week</option>
              </select>
            </div>
            
            {/* Visual Occupancy Bar Chart */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 12, paddingTop: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', width: '100%', height: 1, background: 'var(--color-border-subtle)', top: 0 }} />
              <div style={{ position: 'absolute', width: '100%', height: 1, background: 'var(--color-border-subtle)', top: '50%' }} />
              
              {/* Bars */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 10 }}>
                <div style={{ width: '100%', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '4px 4px 0 0', height: '40%', transition: 'background-color 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.4)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.2)'} />
                <span className="font-label-caps" style={{ fontSize: '9px', color: 'var(--color-on-surface-variant)' }}>MON</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 10 }}>
                <div style={{ width: '100%', background: 'var(--meetops-purple)', borderRadius: '4px 4px 0 0', height: '85%', opacity: 0.8 }} />
                <span className="font-label-caps" style={{ fontSize: '9px', color: 'var(--color-on-surface-variant)' }}>TUE</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 10 }}>
                <div style={{ width: '100%', background: 'var(--meetops-purple)', borderRadius: '4px 4px 0 0', height: '65%', opacity: 0.7 }} />
                <span className="font-label-caps" style={{ fontSize: '9px', color: 'var(--color-on-surface-variant)' }}>WED</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 10 }}>
                <div style={{ width: '100%', background: 'var(--meetops-purple)', borderRadius: '4px 4px 0 0', height: '90%', opacity: 0.95 }} />
                <span className="font-label-caps" style={{ fontSize: '9px', color: 'var(--color-on-surface-variant)' }}>THU</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 10 }}>
                <div style={{ width: '100%', background: 'rgba(139, 92, 246, 0.3)', borderRadius: '4px 4px 0 0', height: '50%' }} />
                <span className="font-label-caps" style={{ fontSize: '9px', color: 'var(--color-on-surface-variant)' }}>FRI</span>
              </div>
            </div>
          </div>

          {/* Meetings Timeline Panel */}
          <div className="bento-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="font-body-md" style={{ fontWeight: 700, color: 'var(--color-on-surface)' }}>Upcoming Timeline</h3>
              <Link to="/meetings" style={{ fontSize: '0.8125rem', color: 'var(--meetops-purple)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
                <span style={{ fontSize: '0.875rem' }}>No upcoming bookings scheduled</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, textAlign: 'left' }}>
                {upcoming.slice(0, 3).map((m, i) => (
                  <div key={m.id} className="timeline-block" style={{ paddingLeft: 20, borderLeftColor: i === upcoming.slice(0, 3).length - 1 ? 'transparent' : 'var(--meetops-purple)' }}>
                    {/* Circle Dot */}
                    <div style={{ position: 'absolute', left: -4, top: 2, width: 8, height: 8, borderRadius: '50%', background: 'var(--meetops-purple)', boxShadow: '0 0 6px var(--meetops-purple)' }} />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{m.title}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
                          Room: <strong style={{ color: 'var(--color-on-surface)' }}>{m.roomName}</strong> · Organized by {m.userName}
                        </p>
                      </div>
                      <span className="font-label-caps" style={{ fontSize: '9px', background: 'var(--color-surface-container-high)', border: '1px solid var(--color-border-subtle)', padding: '4px 8px', borderRadius: '4px', color: 'var(--color-on-surface)' }}>
                        {format(m.startTime, 'h:mm a')} - {format(m.endTime, 'h:mm a')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column (col-span-4) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="lg:col-span-4">
          
          {/* Quick Actions Panel */}
          <div className="bento-card" style={{ padding: 20 }}>
            <h3 className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '9px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.1em', marginBottom: 16, textAlign: 'left' }}>Quick Actions</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button
                onClick={() => navigate('/meetings/new')}
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: 16,
                  background: 'var(--color-surface-container-low)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '12px',
                  color: 'var(--color-on-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--meetops-purple)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border-subtle)'}
              >
                <Plus size={18} color="var(--meetops-purple)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>New Meeting</span>
              </button>

              <button
                onClick={() => navigate('/rooms')}
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: 16,
                  background: 'var(--color-surface-container-low)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '12px',
                  color: 'var(--color-on-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--meetops-purple)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border-subtle)'}
              >
                <FolderOpen size={18} color="var(--color-secondary)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Browse Rooms</span>
              </button>

              <button
                onClick={() => navigate('/settings')}
                className="btn btn-secondary"
                style={{
                  gridColumn: 'span 2',
                  padding: 12,
                  background: 'var(--color-surface-container-low)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--color-on-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--meetops-purple)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border-subtle)'}
              >
                System Settings <ArrowUpRight size={14} />
              </button>
            </div>
          </div>

          {/* Activity Log Panel */}
          <div className="bento-card" style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="font-body-md" style={{ fontWeight: 700, color: 'var(--color-on-surface)' }}>Activity Log</h3>
              <MoreHorizontal size={16} style={{ color: 'var(--color-on-surface-variant)', cursor: 'pointer' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left', overflowY: 'auto', flex: 1 }}>
              {meetings.slice(0, 4).map((m) => {
                const status = getDisplayStatus(m);
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      paddingBottom: 12,
                      borderBottom: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: status === 'approved' ? 'rgba(137, 206, 255, 0.1)' : status === 'pending' ? 'rgba(255, 184, 105, 0.1)' : 'var(--color-surface-container-high)',
                        color: status === 'approved' ? 'var(--color-secondary)' : status === 'pending' ? 'var(--color-tertiary)' : 'var(--color-outline)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Video size={14} />
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface)', margin: 0, lineHeight: 1.3 }}>
                        <strong>{m.roomName}</strong> status set to <span className={`badge badge-${status}`} style={{ padding: '0 6px', fontSize: '9px', textTransform: 'lowercase', border: 'none', marginLeft: 4 }}>{status}</span> for "{m.title}"
                      </p>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-outline)', marginTop: 4, display: 'inline-block' }}>
                        Organized by {m.userName}
                      </span>
                    </div>
                  </div>
                );
              })}
              {meetings.length === 0 && (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>
                  No recent activities recorded
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
