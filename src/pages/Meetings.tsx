import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMeetings, getUserMeetings, cancelMeeting } from '@/services/meetingService';
import { getRooms } from '@/services/roomService';
import { format, isAfter, isBefore } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Plus,
  Calendar,
  XCircle,
  ChevronRight,
  ChevronDown,
  Search,
  Download,
  FileText,
  Users,
  CheckSquare,
  Square,
  MoreVertical,
} from 'lucide-react';
import type { Meeting } from '@/types';

// Mock avatars for attendee list
const ATTENDEE_AVATARS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC0K57XTiEbCF-dz7xl_-KsjX-s7wAwR_TxOYEDfLu0L5lY45l-6QzQnLW3gRXqBfPxYRg6LOD1DFneXemb0tyJTTcxO9dEbNiZFCiknqsrrmbcHNuB4bBJbgwdTU64URfJtfmBx3moDzKW6sIsqjkRuTf2NOpWWsckvIczGfjSTaOE-MKOyOYYMzi7v9tKuBwX7yOcJko6fQmpV4aNdNcxF3zIm5CH8GSMpH6B2byLkEPoIaAum_HgRmBjZRE2PCB7K0EQV9nDAKc",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuARFWWPNNpnvhlBIbFz771cEPWJeqdmseKWoQKL_ZFRoKgesvy4uTH-jKLYcCmF-HH-aWFzV4LPv9M7QbFPXepsbkw7RfJ7L8k8-qGlMxrHj4GNPJynzwywxXuA_1CJ0BUyt8Fr67RPVa97jhuWh3rpTwvmNOtk_ulLVxeuduxoZyyoz5CI6QAWsKuhxaWObvpZI0OIEUSM7iEfZiuPWTZyY0l4KoHOO62dc4GfArGW_daKpoDuZIHlIL9CB0UKSOw3J8KwFtaINwg",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC1wEK0i7qxhV81bJHX9-NMSbiAv7PR_9tySVtqkPFeEM3_tWaDN2YzMhDW4iPO3jvbRoAKKGvOkDE-NE1Zl_Q29hfgfrK3TGH_CXAD7PV_4CH2Co1af6GW3NgNmWh0PaJNE4cHvvzwPflSmWg-RZr7M0N9u5WNeahzeC56WPBTr8JWv_5v0pG7MqqaS5afJxoSgtdh526SrAFaCh2M2EgHe3WvTcS8wbKLQ61izDfYja9Ko2InWAPHS83SNgbqN_HSw0ltyuxsyUo",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBvwhKwYY3y9V4o5z_c3ObmLygrDfOgJrzjfr7s-avMBPdhwXBr1BWTnMG21-dl439b4bW6EAJILH8yS7zFBWu8SwXwGNtJgBPUdnTBweV8GYY9Maervyp8NjEConEk7VmWTVhoLgSsPr0eRmZ9w862FJX0DfnrT6VT7q1lpVMFEshvREkilZhXuAcXBCWh9L2icSJJoMTkjVQC4tvvhIl4ZT2UL7ahmAE2c5yqsgJbB7lNUg0liqcqfT_wAHFEKOoTRkbW4vXXmSI"
];

export default function Meetings() {
  const { profile } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Meeting | null>(null);

  // Expanded details rows list
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  // Multi-select rows list
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  useEffect(() => {
    getRooms().then(setRooms).catch(console.error);
    if (!profile) {
      const t = setTimeout(() => {
        setError('Failed to load user profile. Please try again.');
        setLoading(false);
      }, 8000);
      return () => clearTimeout(t);
    }
    const fetchFn = profile.role === 'admin' ? getMeetings : () => getUserMeetings(profile.uid);
    fetchFn()
      .then(setMeetings)
      .catch((e: any) => setError(e.message || 'Failed to load meetings'))
      .finally(() => setLoading(false));
  }, [profile]);

  const now = new Date();

  // Display status derivation
  function getDisplayStatus(m: Meeting): string {
    if (m.status === 'approved' && isBefore(m.endTime, now)) {
      return 'completed';
    }
    return m.status;
  }

  const isUpcoming = (m: Meeting) =>
    isAfter(m.endTime, now) && m.status !== 'cancelled' && m.status !== 'declined';
  const upcoming = meetings.filter(isUpcoming);
  const past = meetings.filter((m) => !isUpcoming(m));
  const hasActiveFilters = Boolean(searchQuery || selectedRoom || selectedDate);

  const matchesFilters = (m: Meeting) => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRoom = !selectedRoom || m.roomId === selectedRoom;
    const matchesDate = !selectedDate || format(new Date(m.startTime), 'yyyy-MM-dd') === selectedDate;
    return matchesSearch && matchesRoom && matchesDate;
  };

  // Filters and search always apply within the active tab, so the Past view
  // can never surface future/pending items (and vice versa).
  const filtered = (tab === 'upcoming' ? upcoming : past).filter(matchesFilters);

  // A just-created booking may only match the other tab; switch to it rather
  // than pretending the search found nothing.
  useEffect(() => {
    if (!hasActiveFilters || filtered.length > 0) return;
    const other = tab === 'upcoming' ? past : upcoming;
    if (other.some(matchesFilters)) {
      setTab(tab === 'upcoming' ? 'past' : 'upcoming');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveFilters, searchQuery, selectedRoom, selectedDate, tab, meetings]);

  const toggleRowExpansion = (meetingId: string) => {
    setExpandedRows(prev => 
      prev.includes(meetingId) ? prev.filter(id => id !== meetingId) : [...prev, meetingId]
    );
  };

  const handleSelectRow = (meetingId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedRowIds(prev =>
      prev.includes(meetingId) ? prev.filter(id => id !== meetingId) : [...prev, meetingId]
    );
  };

  const handleSelectAllRows = () => {
    if (selectedRowIds.length === filtered.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filtered.map(m => m.id));
    }
  };

  function handleCancelClick(m: Meeting, event?: React.MouseEvent) {
    if (event) event.stopPropagation();
    if (profile && m.userId !== profile.uid && profile.role !== 'admin') {
      setError('Unauthorized action: You can only cancel your own meetings.');
      return;
    }
    if (getDisplayStatus(m) === 'completed') {
      setError('Cannot cancel completed meeting.');
      return;
    }
    setCancelTarget(m);
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    try {
      await cancelMeeting(cancelTarget.id);
      setMeetings((prev) =>
        prev.map((m) => (m.id === cancelTarget.id ? { ...m, status: 'cancelled' as const } : m)),
      );
      setSelectedRowIds(prev => prev.filter(id => id !== cancelTarget.id));
    } catch (e: any) {
      setError(e.message || 'Failed to cancel meeting');
    }
    setCancelTarget(null);
  }

  // Bulk cancel selected meetings
  const handleBulkCancel = async () => {
    if (selectedRowIds.length === 0) return;
    if (!confirm(`Are you sure you want to cancel the ${selectedRowIds.length} selected meetings?`)) return;

    try {
      for (const id of selectedRowIds) {
        await cancelMeeting(id);
      }
      setMeetings(prev =>
        prev.map(m => selectedRowIds.includes(m.id) ? { ...m, status: 'cancelled' as const } : m)
      );
      setSelectedRowIds([]);
    } catch (e: any) {
      setError(e.message || 'Failed to cancel some meetings');
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>Loading meetings...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 60, textAlign: 'left' }}>
      
      {/* Error Alert Box */}
      {error && (
        <div 
          id="error-message" 
          style={{ 
            marginBottom: 24, 
            padding: '12px 16px', 
            borderRadius: 'var(--radius-md)', 
            background: 'var(--color-error-container)', 
            border: '1px solid var(--color-error)',
            color: 'var(--color-on-error-container)', 
            fontSize: '0.8125rem', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}
        >
          <span>{error}</span>
          <button 
            onClick={() => setError('')} 
            className="btn btn-ghost btn-sm" 
            style={{ padding: 2, color: 'var(--color-on-error-container)' }}
          >
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold tracking-tight mb-2">Meetings</h2>
          <p className="text-on-surface-variant font-body-sm">Manage your organization's schedule, rooms, and approvals.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary flex items-center gap-2" style={{ fontSize: '0.8125rem' }}>
            <Download size={14} /> Export
          </button>
          <Link to="/meetings/new" className="btn btn-primary flex items-center gap-2" style={{ fontSize: '0.8125rem' }}>
            <Plus size={14} /> Schedule
          </Link>
        </div>
      </div>

      {/* Filter and Tab Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }} className="md:flex-row md:justify-between md:items-center border-b border-border-subtle pb-4">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 24 }}>
          <button
            onClick={() => { setTab('upcoming'); setSelectedRowIds([]); }}
            style={{
              paddingBottom: 8,
              background: 'transparent',
              border: 'none',
              borderBottom: tab === 'upcoming' ? '2px solid var(--meetops-purple)' : '2px solid transparent',
              color: tab === 'upcoming' ? 'var(--meetops-purple)' : 'var(--color-on-surface-variant)',
              fontWeight: tab === 'upcoming' ? 600 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            Upcoming ({upcoming.length})
          </button>
          <button
            onClick={() => { setTab('past'); setSelectedRowIds([]); }}
            style={{
              paddingBottom: 8,
              background: 'transparent',
              border: 'none',
              borderBottom: tab === 'past' ? '2px solid var(--meetops-purple)' : '2px solid transparent',
              color: tab === 'past' ? 'var(--color-on-surface-variant)' : 'var(--color-on-surface-variant)',
              fontWeight: tab === 'past' ? 600 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            Past ({past.length})
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          
          {/* Bulk Actions Panel */}
          {selectedRowIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 12 }}>
              <span className="font-body-sm" style={{ fontWeight: 600, color: 'var(--meetops-purple)' }}>{selectedRowIds.length} selected</span>
              <button 
                onClick={handleBulkCancel}
                className="btn btn-secondary btn-sm" 
                style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)', fontSize: '0.75rem', padding: '6px 12px' }}
              >
                Cancel Selected
              </button>
              <div style={{ width: 1, height: 16, background: 'var(--color-border-subtle)' }} />
            </div>
          )}

          {/* Search bar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--color-on-surface-variant)' }} />
            <input
              placeholder="Search meetings..."
              className="input"
              style={{ width: 200, paddingLeft: 32, paddingRight: 12, height: 36, fontSize: '0.8125rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Room filter select */}
          <select
            className="input"
            style={{ width: 150, height: 36, fontSize: '0.8125rem', cursor: 'pointer' }}
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
          >
            <option value="">All Rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          {/* Date Picker filter */}
          <input
            type="date"
            className="input"
            style={{ width: 150, height: 36, fontSize: '0.8125rem', cursor: 'pointer' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />

          {(searchQuery || selectedRoom || selectedDate) && (
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => { setSearchQuery(''); setSelectedRoom(''); setSelectedDate(''); }}
              style={{ padding: '8px 12px', height: 36 }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Redesigned Expandable Table Grid */}
      {filtered.length === 0 ? (
        <div className="bento-card" style={{ padding: 60, textAlign: 'center' }}>
          <Calendar size={36} style={{ color: 'var(--color-outline)', marginBottom: 12, opacity: 0.5 }} />
          {hasActiveFilters ? (
            <>
              <p style={{ color: 'var(--color-on-surface-variant)' }} id="no-filter-matches">
                No {tab} meetings match your current filters.
              </p>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem', marginTop: 6 }}>
                Try a different room or date, or clear the filters.
              </p>
            </>
          ) : (
            <p style={{ color: 'var(--color-on-surface-variant)' }}>No {tab} meetings found</p>
          )}
          {tab === 'upcoming' && !hasActiveFilters && (
            <Link to="/meetings/new" className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
              <Plus size={14} /> Schedule a Meeting
            </Link>
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-container-lowest)' }}>
                <th style={{ width: 48, textAlign: 'center' }}>
                  <button 
                    onClick={handleSelectAllRows}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center', margin: '0 auto' }}
                  >
                    {selectedRowIds.length === filtered.length ? <CheckSquare size={16} color="var(--meetops-purple)" /> : <Square size={16} />}
                  </button>
                </th>
                <th>Meeting Title</th>
                <th>Organizer</th>
                <th>Room & Location</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            
            <tbody style={{ fontSize: '0.8125rem' }}>
              {filtered.map((m) => {
                const displayStatus = getDisplayStatus(m);
                const isExpanded = expandedRows.includes(m.id);
                const isSelected = selectedRowIds.includes(m.id);
                const isOwner = profile && m.userId === profile.uid;
                const isAdmin = profile?.role === 'admin';
                const canCancel = (isOwner || isAdmin) && (displayStatus === 'pending' || displayStatus === 'approved');

                return (
                  <>
                    {/* Primary Row */}
                    <tr 
                      key={m.id}
                      onClick={() => toggleRowExpansion(m.id)}
                      style={{ 
                        cursor: 'pointer',
                        background: isExpanded ? 'var(--color-surface-container-low)' : 'transparent',
                        transition: 'background-color 0.2s',
                      }}
                      className="hover:bg-surface-container-low"
                    >
                      {/* Checkbox cell */}
                      <td style={{ textAlign: 'center' }} onClick={(e) => handleSelectRow(m.id, e)}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          {isSelected ? <CheckSquare size={16} color="var(--meetops-purple)" /> : <Square size={16} style={{ color: 'var(--color-outline)' }} />}
                        </div>
                      </td>

                      {/* Title & Chevron cell */}
                      <td style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ display: 'flex', alignItems: 'center', color: 'var(--color-on-surface-variant)' }}>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </span>
                          <span>{m.title}</span>
                        </div>
                      </td>

                      {/* Organizer info */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img
                            src={ATTENDEE_AVATARS[0]}
                            alt={m.userName}
                            style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border-subtle)' }}
                          />
                          <span>{m.userName}</span>
                        </div>
                      </td>

                      {/* Room & Location info */}
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-on-surface-variant)' }}>meeting_room</span>
                          {m.roomName}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{format(m.startTime, 'MMM d, yyyy')}</span>
                          <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', marginTop: 2 }}>
                            {format(m.startTime, 'h:mm a')} – {format(m.endTime, 'h:mm a')}
                          </span>
                        </div>
                      </td>

                      {/* Status badge */}
                      <td>
                        <span className={`badge badge-${displayStatus}`}>{displayStatus}</span>
                      </td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          {canCancel && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={(e) => handleCancelClick(m, e)}
                              style={{ color: 'var(--color-error)', borderColor: 'rgba(255, 180, 171, 0.2)', padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              Cancel
                            </button>
                          )}
                          <button className="btn btn-ghost btn-sm" style={{ padding: 4, color: 'var(--color-on-surface-variant)' }}>
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Details Panel Row */}
                    {isExpanded && (
                      <tr key={`${m.id}-expanded`} style={{ background: 'var(--color-surface-dark)' }}>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div style={{ padding: '20px 24px 20px 56px', display: 'grid', gridTemplateColumns: '1fr 240px', gap: 32, borderLeft: '4px solid var(--meetops-purple)' }}>
                            
                            {/* Left: Agenda timeline */}
                            <div>
                              <h4 className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--color-on-surface-variant)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FileText size={12} /> Agenda Details
                              </h4>
                              <div style={{ background: 'var(--color-surface-container-lowest)', padding: 16, borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                                  {m.agenda || "No agenda details specified. Add meeting targets in your next scheduling session."}
                                </p>
                              </div>
                            </div>

                            {/* Right: Attendees stacked list */}
                            <div>
                              <h4 className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--color-on-surface-variant)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Users size={12} /> Attendees ({m.participants ? m.participants.split(',').length + 1 : 1})
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  {/* Stacked Avatars */}
                                  <div style={{ display: 'flex', alignItems: 'center', marginRight: 8 }}>
                                    {ATTENDEE_AVATARS.map((avatar, idx) => (
                                      <img
                                        key={idx}
                                        src={avatar}
                                        alt="Attendee"
                                        style={{
                                          width: 28,
                                          height: 28,
                                          borderRadius: '50%',
                                          objectFit: 'cover',
                                          border: '2px solid var(--color-surface-dark)',
                                          marginLeft: idx === 0 ? 0 : -8,
                                          zIndex: 10 - idx,
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                                    {m.participants ? `+${m.participants.split(',').length} others` : 'Organizer only'}
                                  </span>
                                </div>

                                <div style={{ height: 1, background: 'var(--color-border-subtle)', margin: '4px 0' }} />
                                
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  style={{ width: '100%', fontSize: '0.75rem', justifyContent: 'center', gap: 6 }}
                                  onClick={() => alert('Accessing collaborative meeting workspace notes...')}
                                >
                                  Join Meeting Notes
                                </button>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Redesigned In-page Cancel Confirmation Modal — portaled to <body> so the
          transformed `animate-fade-in` page container does not push it off-screen. */}
      {cancelTarget && createPortal(
        <div className="modal-overlay" onClick={() => setCancelTarget(null)} style={{ zIndex: 100 }}>
          <div 
            className="modal-content glass-panel" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              padding: 24, 
              maxWidth: 420,
              borderRadius: '16px',
              border: '1px solid var(--color-border-subtle)',
              boxShadow: 'var(--shadow-ambient)',
              background: 'var(--color-surface-container-low)',
            }}
          >
            <h2 className="font-headline-lg-mobile" style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 12, color: 'var(--color-on-surface)' }}>Cancel Meeting</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginBottom: 24, lineHeight: 1.5 }}>
              Are you sure you want to cancel <strong>"{cancelTarget.title}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setCancelTarget(null)}>Keep Meeting</button>
              <button className="btn btn-danger" id="confirm-cancel-btn" onClick={confirmCancel}>
                <XCircle size={14} /> Cancel Meeting
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
