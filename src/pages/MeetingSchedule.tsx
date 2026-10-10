import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createMeeting } from '@/services/meetingService';
import { getRooms } from '@/services/roomService';
import { createNotification } from '@/services/notificationService';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { useEffect } from 'react';
import type { Room } from '@/types';

export default function MeetingSchedule() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState(searchParams.get('roomId') || '');
  const [roomName, setRoomName] = useState(searchParams.get('roomName') || '');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [agenda, setAgenda] = useState('');
  const [participants, setParticipants] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRooms().then(setRooms).catch(console.error);
  }, []);

  function handleRoomChange(id: string) {
    setRoomId(id);
    const found = rooms.find((r) => r.id === id);
    setRoomName(found?.name || '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dummyDate = date || '2000-01-01';
    const startDate = new Date(`${dummyDate}T${startTime}`);
    const endDate = new Date(`${dummyDate}T${endTime}`);

    if (startTime && endTime && endDate <= startDate) {
      setError('End time must be after start time.');
      return;
    }

    if (!profile || !roomId || !date) {
      setError('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await createMeeting({
        roomId,
        roomName,
        userId: profile.uid,
        userName: profile.name,
        title,
        startTime: startDate,
        endTime: endDate,
        agenda,
        participants,
      });

      await createNotification({
        userId: profile.uid,
        type: 'meeting_scheduled',
        message: `Your meeting for "${roomName}" on ${date} has been submitted for approval.`,
      });

      navigate('/meetings');
    } catch (err: any) {
      setError(err.message || 'Failed to schedule meeting');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600 }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16 }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="bento-card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-primary-50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary-600)',
            }}
          >
            <CalendarDays size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-neutral-900)' }}>
              Schedule Meeting
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-neutral-500)' }}>
              Reserve a meeting room for your team
            </p>
          </div>
        </div>

        {error && (
          <div
            id="error-message"
            className="error-message"
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-error-50)',
              color: 'var(--color-error-600)',
              fontSize: '0.8125rem',
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="label">Meeting Title *</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Team Sync / Project Kickoff"
                required
              />
            </div>

            <div>
              <label className="label">Room *</label>
              <select
                className="input"
                value={roomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                required
              >
                <option value="">Select a room</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.location ? `– ${r.location}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Date *</label>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Start Time *</label>
                <input
                  className="input"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">End Time *</label>
                <input
                  className="input"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Meeting Agenda</label>
              <textarea
                className="input"
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder="Describe the items to discuss..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div>
              <label className="label">Participants (comma separated)</label>
              <input
                className="input"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                placeholder="e.g., John, Sarah, Mike"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
