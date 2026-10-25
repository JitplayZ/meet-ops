import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getMeetings, updateMeetingStatus } from '@/services/meetingService';
import { getRooms } from '@/services/roomService';
import { useAuth } from '@/contexts/AuthContext';
import { createNotification } from '@/services/notificationService';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Shield } from 'lucide-react';
import type { Meeting, Room } from '@/types';

export default function Admin() {
  const { profile } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'meetings' | 'rooms'>('meetings');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    Promise.all([getMeetings(), getRooms()])
      .then(([m, r]) => { setMeetings(m); setRooms(r); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(meeting: Meeting) {
    await updateMeetingStatus(meeting.id, 'approved', profile?.uid);
    setMeetings((prev) => prev.map((m) => m.id === meeting.id ? { ...m, status: 'approved' as const } : m));
    await createNotification({ userId: meeting.userId, type: 'meeting_approved', message: `Your meeting for "${meeting.roomName}" has been approved.`, meetingId: meeting.id });
  }

  async function handleReject(meeting: Meeting) {
    await updateMeetingStatus(meeting.id, 'declined', profile?.uid);
    setMeetings((prev) => prev.map((m) => m.id === meeting.id ? { ...m, status: 'declined' as const } : m));
    await createNotification({ userId: meeting.userId, type: 'meeting_declined', message: `Your meeting for "${meeting.roomName}" has been declined.`, meetingId: meeting.id });
  }

  const pendingMeetings = meetings.filter((m) => m.status === 'pending');

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>Loading...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--meetops-purple)' }}>
          <Shield size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Admin Panel</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>{pendingMeetings.length} pending approvals</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--color-neutral-100)' }}>
        {(['meetings', 'rooms'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: tab === t ? '2px solid var(--meetops-purple)' : '2px solid transparent', marginBottom: -2, color: tab === t ? 'var(--meetops-purple)' : 'var(--color-on-surface-variant)', fontWeight: tab === t ? 600 : 400, fontSize: '0.875rem', cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {tab === 'meetings' ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Organizer</th><th>Meeting Title</th><th>Room</th><th>Date & Time</th><th>Agenda</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.userName}</td>
                  <td style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--meetops-purple)' }} onClick={() => setSelectedMeeting(m)} id={`meeting-title-${m.id}`}>{m.title}</td>
                  <td>{m.roomName}</td>
                  <td>
                    <div>{format(m.startTime, 'MMM d, yyyy')}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{format(m.startTime, 'h:mm a')} – {format(m.endTime, 'h:mm a')}</div>
                  </td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.agenda || '—'}</td>
                  <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedMeeting(m)} id={`view-btn-${m.id}`}>View</button>
                      {m.status === 'pending' && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleApprove(m)} style={{ color: 'var(--color-secondary)' }}><CheckCircle2 size={14} /> Approve</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleReject(m)} style={{ color: 'var(--color-error)' }}><XCircle size={14} /> Decline</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {meetings.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--color-on-surface-variant)' }}>No meetings scheduled</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Location</th><th>Capacity</th><th>Availability</th></tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{r.location || '—'}</td>
                  <td>{r.capacity}</td>
                  <td>{r.availabilityStart} – {r.availabilityEnd}</td>
                </tr>
              ))}
              {rooms.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--color-on-surface-variant)' }}>No rooms</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {/* Detail Modal — rendered through a portal to <body>. The page root
          carries the `animate-fade-in` animation, whose final `transform`
          makes it the containing block for position:fixed descendants, which
          previously pushed the centered panel off-screen while only the dark
          overlay stayed visible. Portaling escapes that ancestor. */}
      {selectedMeeting && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedMeeting(null)}>
          <div className="modal-content" role="dialog" aria-modal="true" id="meeting-details-panel" onClick={(e) => e.stopPropagation()} style={{ padding: 24, width: 480 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>Meeting Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><strong>Organizer:</strong> {selectedMeeting.userName}</div>
              <div><strong>Title:</strong> {selectedMeeting.title}</div>
              <div><strong>Room:</strong> {selectedMeeting.roomName}</div>
              <div><strong>Date:</strong> {format(selectedMeeting.startTime, 'MMM d, yyyy')}</div>
              <div><strong>Time:</strong> {format(selectedMeeting.startTime, 'h:mm a')} – {format(selectedMeeting.endTime, 'h:mm a')}</div>
              <div><strong>Agenda:</strong> {selectedMeeting.agenda || '—'}</div>
              <div><strong>Status:</strong> <span className={`badge badge-${selectedMeeting.status}`}>{selectedMeeting.status}</span></div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedMeeting(null)}>Close</button>
              {selectedMeeting.status === 'pending' && (
                <>
                  <button className="btn btn-danger" onClick={() => { handleReject(selectedMeeting); setSelectedMeeting(null); }}>Decline</button>
                  <button className="btn btn-primary" onClick={() => { handleApprove(selectedMeeting); setSelectedMeeting(null); }} id="modal-approve-btn">Approve</button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
