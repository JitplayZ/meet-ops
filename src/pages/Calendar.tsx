import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getMeetings, cancelMeeting } from '@/services/meetingService';
import { getRooms } from '@/services/roomService';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Calendar as CalendarIcon,
  Video,
  Tv,
} from 'lucide-react';
import type { Meeting, Room } from '@/types';

// Style mapping for status blocks
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  pending: { bg: 'rgba(255, 184, 105, 0.15)', border: 'var(--color-tertiary)', text: 'var(--color-tertiary)' },
  approved: { bg: 'rgba(137, 206, 255, 0.15)', border: 'var(--color-secondary)', text: 'var(--color-secondary)' },
  completed: { bg: 'rgba(255, 255, 255, 0.05)', border: 'var(--color-outline)', text: 'var(--color-on-surface-variant)' },
  cancelled: { bg: 'rgba(255, 180, 171, 0.15)', border: 'var(--color-error)', text: 'var(--color-error)' },
};

// "2026-10-25" -> local-midnight Date (avoids UTC parsing shifts)
function toDateFromInput(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlDate = searchParams.get('date') || '';
  const urlMeetingId = searchParams.get('meeting') || '';

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  // The date filter and the rendered week share one source of truth: the
  // anchor date. Picking a date (or arriving with ?date= from a booking
  // flow) moves the grid to the week containing that date.
  const [currentDate, setCurrentDate] = useState(() => toDateFromInput(urlDate) || new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  // In-page cancellation flow. The previous native window.confirm() rendered an
  // OS dialog that lives outside the page DOM (invisible to screenshots/automation
  // and auto-dismissed in E2E runs), and left no on-page confirmation. These two
  // pieces of state drive a visible confirm modal and a success notice instead.
  const [cancelTarget, setCancelTarget] = useState<Meeting | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

  // Filter checkboxes
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>(['boardroom', 'huddle']);
  const [selectedFloor, setSelectedFloor] = useState('All Floors');
  const [selectedDate, setSelectedDate] = useState(urlDate);

  const FLOOR_MATCHERS: Record<string, (room: Room) => boolean> = {
    'HQ - Floor 4': r => /floor\s*4|4th\s*floor/i.test(r.location || ''),
    'HQ - Floor 12': r => /floor\s*12|12th\s*floor/i.test(r.location || ''),
    'Executive Wing': r => /executive/i.test(r.location || '') || /executive|boardroom/i.test(r.name || ''),
  };

  useEffect(() => {
    Promise.all([getMeetings(), getRooms()])
      .then(([m, r]) => {
        setMeetings(m);
        setRooms(r);
        // Fill the details drawer with the booking named in the URL (set
        // right after scheduling), otherwise the nearest still-active
        // meeting — never an arbitrary "first row" unrelated to the view.
        const active = m.filter(item => item.status !== 'cancelled' && item.status !== 'declined');
        const fromUrl = urlMeetingId ? active.find(item => item.id === urlMeetingId) : undefined;
        if (fromUrl) {
          setSelectedMeeting(fromUrl);
          return;
        }
        const now = new Date();
        const upcoming = active
          .filter(item => item.endTime >= now)
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        if (upcoming.length > 0) setSelectedMeeting(upcoming[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [urlMeetingId, urlDate]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Starts on Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)); // Mon - Sun
  const hours = Array.from({ length: 8 }, (_, i) => i + 9); // 9 AM to 4 PM start slots (Ends at 5 PM)

  const handleDateFilterChange = (value: string) => {
    setSelectedDate(value);
    // Keep the rendered week in sync with the filter so filtered meetings
    // are always inside the visible grid range.
    const d = toDateFromInput(value);
    if (d) setCurrentDate(d);
  };

  const handleSlotBook = (day: Date, hour: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = format(day, 'yyyy-MM-dd');
    navigate(
      `/meetings/new?date=${dateStr}&startTime=${pad(hour)}:00&endTime=${pad(hour + 1)}:00`,
    );
  };

  const handleCancelMeeting = (meeting: Meeting) => {
    setCancelTarget(meeting);
  };

  const confirmCancelMeeting = async () => {
    if (!cancelTarget) return;
    const meetingId = cancelTarget.id;
    const meetingTitle = cancelTarget.title;
    try {
      await cancelMeeting(meetingId);
      setMeetings(prev =>
        prev.map(m => m.id === meetingId ? { ...m, status: 'cancelled' as const } : m)
      );
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting(prev => prev ? { ...prev, status: 'cancelled' as const } : null);
      }
      setCancelNotice(`Booking "${meetingTitle}" was cancelled and removed from the calendar.`);
    } catch (e) {
      console.error(e);
      setCancelNotice('Failed to cancel the booking. Please try again.');
    }
    setCancelTarget(null);
  };

  const handleRoomTypeToggle = (type: string) => {
    setSelectedRoomTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const roomById = new Map(rooms.map(r => [r.id, r]));

  const matchesFilters = (m: Meeting) => {
    const room = roomById.get(m.roomId);
    // Room type filter: boardroom = capacity 10+, huddle = capacity <10.
    // Meetings whose room is unknown to the inventory stay visible.
    if (selectedRoomTypes.length > 0 && room) {
      const capacity = room.capacity ?? 0;
      const isBoardroom = capacity >= 10;
      const isHuddle = capacity < 10;
      const typeMatch =
        (selectedRoomTypes.includes('boardroom') && isBoardroom) ||
        (selectedRoomTypes.includes('huddle') && isHuddle);
      if (!typeMatch) return false;
    }
    // Floor filter
    if (selectedFloor !== 'All Floors' && room) {
      const matcher = FLOOR_MATCHERS[selectedFloor];
      if (matcher && !matcher(room)) return false;
    }
    // Date filter (compare in local time)
    if (selectedDate) {
      const localDay = `${m.startTime.getFullYear()}-${String(m.startTime.getMonth() + 1).padStart(2, '0')}-${String(m.startTime.getDate()).padStart(2, '0')}`;
      if (localDay !== selectedDate) return false;
    }
    return true;
  };

  // Find meetings that occur in the weekly grid slots (Mon-Sun, between
  // 9am and 5pm). Weekend bookings must render too - E2E flows book on
  // Saturdays and Sundays.
  const getWeeklyMeetings = () => {
    return meetings.filter(m => {
      if (m.status === 'cancelled' || m.status === 'declined') return false;
      const isCorrectWeek = m.startTime >= weekStart && m.startTime < addDays(weekStart, 7);
      return isCorrectWeek && matchesFilters(m);
    });
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>Loading calendar...</div>;
  }

  const weeklyMeetings = getWeeklyMeetings();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', height: 'calc(100vh - var(--topbar-height) - 48px)', margin: '-24px', overflow: 'hidden' }}>
      
      {/* 1. Left Smart Filters Panel */}
      <aside 
        style={{ 
          width: 240, 
          background: 'var(--color-surface-container-lowest)', 
          borderRight: '1px solid var(--color-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto',
          textAlign: 'left',
        }}
      >
        {/* Floor Selection */}
        <div style={{ padding: 16, borderBottom: '1px solid var(--color-border-subtle)' }}>
          <h2 className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--color-outline)', marginBottom: 12 }}>Smart Filters</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="font-body-sm" style={{ fontWeight: 600, color: 'var(--color-on-surface)', display: 'block', marginBottom: 6 }}>Building / Floor</label>
              <select
                value={selectedFloor}
                onChange={e => setSelectedFloor(e.target.value)}
                className="input"
                style={{
                  background: 'var(--color-surface-container-low)',
                  border: '1px solid var(--color-border-subtle)',
                  color: 'var(--color-on-surface)',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  height: 36,
                }}
              >
                <option>All Floors</option>
                <option>HQ - Floor 4</option>
                <option>HQ - Floor 12</option>
                <option>Executive Wing</option>
              </select>
            </div>

            {/* Room Types */}
            <div>
              <label className="font-body-sm" style={{ fontWeight: 600, color: 'var(--color-on-surface)', display: 'block', marginBottom: 8 }}>Room Types</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedRoomTypes.includes('boardroom')}
                    onChange={() => handleRoomTypeToggle('boardroom')}
                    style={{ accentColor: 'var(--meetops-purple)' }}
                  />
                  <span className="font-body-sm" style={{ color: 'var(--color-on-surface-variant)' }}>Boardroom (10+)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedRoomTypes.includes('huddle')}
                    onChange={() => handleRoomTypeToggle('huddle')}
                    style={{ accentColor: 'var(--meetops-purple)' }}
                  />
                  <span className="font-body-sm" style={{ color: 'var(--color-on-surface-variant)' }}>Huddle Room (2-4)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Booking "Available Now" Cards list */}
        <div style={{ padding: 16, flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--color-outline)' }}>Available Now</h2>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-secondary)', animation: 'pulse 1.5s infinite', boxShadow: '0 0 6px var(--color-secondary)' }} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rooms.slice(0, 2).map((room) => (
              <div 
                key={room.id}
                className="hover:bg-surface-container-high"
                style={{ 
                  background: 'var(--color-surface-container-low)', 
                  border: '1px solid var(--color-border-subtle)', 
                  borderRadius: '12px',
                  padding: 12,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border-subtle)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{room.name}</span>
                  <span className="font-label-caps" style={{ fontSize: '8px', background: 'rgba(137, 206, 255, 0.1)', color: 'var(--color-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                    {room.capacity} Cap
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, color: 'var(--color-on-surface-variant)', fontSize: '10px', marginBottom: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Tv size={10} /> screen</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Video size={10} /> Polycom</span>
                </div>
                <Link 
                  to={`/meetings/new?roomId=${room.id}&roomName=${encodeURIComponent(room.name)}`}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', padding: '6px 0', fontSize: '11px', background: 'var(--color-surface-dark)', justifyContent: 'center' }}
                >
                  Quick Book
                </Link>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* 2. Center Calendar Weekly Schedule Grid */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', height: '100%', overflow: 'hidden' }}>
        
        {/* Calendar toolbar */}
        <div style={{ height: 64, borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', background: 'rgba(11, 12, 14, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h2 className="font-headline-lg-mobile" style={{ color: 'var(--color-on-surface)', margin: 0, fontWeight: 700 }}>
              {format(weekStart, 'MMMM yyyy')}
            </h2>
            
            {/* navigation arrows */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-container-low)', padding: 4, borderRadius: '6px', border: '1px solid var(--color-border-subtle)' }}>
              <button 
                onClick={() => { setCurrentDate(prev => subWeeks(prev, 1)); setSelectedDate(''); }}
                aria-label="Previous week"
                style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer', padding: 2, borderRadius: '4px', display: 'flex' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => { setCurrentDate(new Date()); setSelectedDate(''); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, padding: '2px 8px' }}
              >
                Today
              </button>
              <button 
                onClick={() => { setCurrentDate(prev => addWeeks(prev, 1)); setSelectedDate(''); }}
                aria-label="Next week"
                style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer', padding: 2, borderRadius: '4px', display: 'flex' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Date filter: moves the visible week to the selected date */}
            <input
              type="date"
              aria-label="Filter by date"
              value={selectedDate}
              onChange={e => handleDateFilterChange(e.target.value)}
              className="input"
              style={{
                background: 'var(--color-surface-container-low)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-on-surface)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                height: 32,
                width: 140,
              }}
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', padding: '4px 8px' }}
              >
                Clear date
              </button>
            )}
            <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
              {weeklyMeetings.length} meeting{weeklyMeetings.length === 1 ? '' : 's'} shown
            </span>
            <div style={{ display: 'flex', background: 'var(--color-surface-container-low)', padding: 4, borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
              <button className="btn btn-ghost btn-sm" style={{ padding: '4px 12px', fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>Day</button>
              <button className="btn btn-secondary btn-sm" style={{ padding: '4px 12px', fontSize: '11px', color: 'var(--color-on-surface)', background: 'var(--color-surface-container-highest)', border: 'none', boxShadow: 'none' }}>Week</button>
              <button className="btn btn-ghost btn-sm" style={{ padding: '4px 12px', fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>Month</button>
            </div>
          </div>
        </div>

        {/* Cancellation confirmation banner */}
        {cancelNotice && (
          <div
            id="cancel-notice"
            role="status"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              margin: '12px 24px 0',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(137, 206, 255, 0.12)',
              border: '1px solid var(--color-secondary)',
              color: 'var(--color-on-surface)',
              fontSize: '0.8125rem',
            }}
          >
            <span>{cancelNotice}</span>
            <button
              onClick={() => setCancelNotice(null)}
              aria-label="Dismiss cancellation notice"
              style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer', padding: 2 }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Calendar Grid wrapper */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          
          {/* Days Header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-surface)', paddingLeft: 60, zIndex: 10 }}>
            {weekDays.map((day, idx) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div 
                  key={idx} 
                  style={{ 
                    flex: 1, 
                    padding: '12px 8px', 
                    textAlign: 'center', 
                    borderRight: idx === weekDays.length - 1 ? 'none' : '1px solid var(--color-border-subtle)',
                    position: 'relative',
                  }}
                >
                  {isToday && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--meetops-purple)' }} />}
                  <span className="font-label-caps" style={{ fontSize: '10px', color: isToday ? 'var(--meetops-purple)' : 'var(--color-on-surface-variant)', fontWeight: isToday ? 700 : 500, textTransform: 'uppercase' }}>
                    {format(day, 'EEE')}
                  </span>
                  <div 
                    style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: 700, 
                      color: isToday ? 'white' : 'var(--color-on-surface)',
                      background: isToday ? 'var(--meetops-purple)' : 'transparent',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '4px auto 0',
                    }}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid lines background + event cards wrapper */}
          <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
            
            {/* Grid Container */}
            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', minHeight: 640 }}>
              
              {/* Y Axis: Time Labels */}
              <div style={{ gridColumnStart: 1, borderRight: '1px solid var(--color-border-subtle)', background: 'var(--color-surface-dim)', paddingTop: 16 }}>
                {hours.map(hour => (
                  <div key={hour} style={{ height: 80, position: 'relative', textAlign: 'right', paddingRight: 8 }}>
                    <span className="font-label-caps" style={{ fontSize: '9px', color: 'var(--color-on-surface-variant)', position: 'absolute', top: -6, right: 8 }}>
                      {format(new Date(2024, 0, 1, hour), 'h a')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns containing grid lines */}
              {weekDays.map((day, dIdx) => (
                <div 
                  key={dIdx} 
                  style={{ 
                    borderRight: dIdx === weekDays.length - 1 ? 'none' : '1px solid var(--color-border-subtle)',
                    position: 'relative',
                    height: '100%',
                    background: 'var(--color-surface-dim)',
                  }}
                >
                  {/* Clickable hour slots: book this day/hour directly */}
                  {hours.map(hour => (
                    <button
                      key={hour}
                      type="button"
                      aria-label={`Book ${format(day, 'EEE MMM d')} at ${format(new Date(2024, 0, 1, hour), 'h a')}`}
                      title={`Book ${format(day, 'EEE MMM d')} at ${format(new Date(2024, 0, 1, hour), 'h a')}`}
                      onClick={() => handleSlotBook(day, hour)}
                      style={{
                        display: 'block',
                        width: '100%',
                        height: 80,
                        borderTop: '1px solid var(--color-border-subtle)',
                        boxSizing: 'border-box',
                        background: 'transparent',
                        borderLeft: 'none',
                        borderRight: 'none',
                        borderBottom: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 6,
                          fontSize: '9px',
                          fontWeight: 700,
                          color: 'var(--meetops-purple)',
                          opacity: 0,
                        }}
                        className="slot-plus-hint"
                      >
                        + Book
                      </span>
                    </button>
                  ))}

                  {/* Dynamic absolute event cards for this day */}
                  {weeklyMeetings
                    .filter(m => isSameDay(m.startTime, day))
                    .map(m => {
                      // Calculate height & top offsets
                      const startHour = m.startTime.getHours() + m.startTime.getMinutes() / 60;
                      const endHour = m.endTime.getHours() + m.endTime.getMinutes() / 60;
                      
                      // Clamping values within 9am and 5pm (8 hour scale)
                      const scaleStart = 9;
                      const scaleEnd = 17;
                      
                      if (startHour >= scaleEnd || endHour <= scaleStart) return null;
                      
                      const topH = Math.max(startHour, scaleStart);
                      const bottomH = Math.min(endHour, scaleEnd);
                      
                      // Every hour represents 80px
                      const top = (topH - scaleStart) * 80;
                      const height = (bottomH - topH) * 80;
                      
                      const color = STATUS_COLORS[m.status] || { bg: 'rgba(255,255,255,0.05)', border: 'var(--color-outline)', text: 'white' };
                      const isSelected = selectedMeeting?.id === m.id;

                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMeeting(m)}
                          style={{
                            position: 'absolute',
                            left: 4,
                            right: 4,
                            top: top + 4,
                            height: height - 8,
                            background: color.bg,
                            borderLeft: `4px solid ${color.border}`,
                            borderRadius: '0 8px 8px 0',
                            padding: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.3), 0 0 0 1px var(--meetops-purple)' : '0 2px 4px rgba(0,0,0,0.15)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            zIndex: isSelected ? 20 : 10,
                            overflow: 'hidden',
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.25)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
                            }
                          }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-on-surface)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {m.title}
                          </span>
                          <span style={{ fontSize: '9px', color: color.text, fontWeight: 600, marginTop: 2, display: 'block' }}>
                            {format(m.startTime, 'h:mm')} - {format(m.endTime, 'h:mm')} · {m.roomName}
                          </span>
                        </div>
                      );
                    })}
                </div>
              ))}

            </div>
          </div>

        </div>

      </section>

      {/* 3. Right Booking Details Drawer Panel */}
      <aside
        style={{
          width: 320,
          background: 'var(--color-surface-container-highest)',
          borderLeft: '1px solid var(--color-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxShadow: 'var(--shadow-ambient)',
          zIndex: 30,
          textAlign: 'left',
        }}
      >
        {/* Drawer Header */}
        <div style={{ height: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid var(--color-border-subtle)', background: 'rgba(11, 12, 14, 0.3)' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: 0 }}>Event Details</h3>
          <button 
            onClick={() => setSelectedMeeting(null)}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        {selectedMeeting ? (
          <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Status and Visibility Tags */}
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <span className={`badge badge-${selectedMeeting.status}`} style={{ fontSize: '9px', padding: '2px 8px' }}>
                  {selectedMeeting.status}
                </span>
                <span className="font-label-caps" style={{ fontSize: '9px', background: 'var(--color-surface-container-low)', border: '1px solid var(--color-border-subtle)', padding: '2px 8px', borderRadius: '4px', color: 'var(--color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Internal
                </span>
              </div>
              <h2 className="font-headline-lg-mobile" style={{ color: 'var(--color-on-surface)', margin: 0, fontWeight: 700, lineHeight: 1.3 }}>
                {selectedMeeting.title}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} />
                {format(selectedMeeting.startTime, 'EEE, MMM d')} · {format(selectedMeeting.startTime, 'h:mm a')} - {format(selectedMeeting.endTime, 'h:mm a')}
              </p>
            </div>

            <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />

            {/* Room Info card */}
            <div>
              <h4 className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '9px', color: 'var(--color-outline)', marginBottom: 12 }}>Location & Resources</h4>
              <div style={{ position: 'relative', background: 'var(--color-surface-container-low)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: 12, borderLeft: '4px solid var(--meetops-purple)' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-on-surface)', display: 'block' }}>{selectedMeeting.roomName}</span>
                <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', display: 'block', marginTop: 2 }}>HQ · Operations Division</span>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  <span style={{ fontSize: '9px', background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-on-surface-variant)', padding: '2px 6px', borderRadius: '4px' }}>
                    zoom
                  </span>
                  <span style={{ fontSize: '9px', background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-on-surface-variant)', padding: '2px 6px', borderRadius: '4px' }}>
                    display
                  </span>
                </div>
              </div>
            </div>

            {/* Organizer and Attendees */}
            <div>
              <h4 className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '9px', color: 'var(--color-outline)', marginBottom: 12 }}>Attendees</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--meetops-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 700 }}>
                    {selectedMeeting.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-on-surface)', display: 'block' }}>{selectedMeeting.userName}</span>
                    <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>Organizer · Coordinator</span>
                  </div>
                </div>

                {selectedMeeting.participants && (
                  <div style={{ background: 'var(--color-surface-container-lowest)', padding: 12, borderRadius: '8px', border: '1px solid var(--color-border-subtle)', marginTop: 4 }}>
                    <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: 4 }}>Invited:</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface)' }}>{selectedMeeting.participants}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Agenda */}
            {selectedMeeting.agenda && (
              <div>
                <h4 className="font-label-caps" style={{ textTransform: 'uppercase', fontSize: '9px', color: 'var(--color-outline)', marginBottom: 12 }}>Agenda</h4>
                <div style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', padding: 12, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
                  {selectedMeeting.agenda}
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div style={{ marginTop: 'auto', display: 'flex', gap: 8, paddingTop: 16 }}>
              {selectedMeeting.status !== 'cancelled' && (
                <button
                  onClick={() => handleCancelMeeting(selectedMeeting)}
                  className="btn btn-secondary"
                  style={{ flex: 1, borderColor: 'var(--color-error)', color: 'var(--color-error)', fontSize: '0.8125rem', justifyContent: 'center' }}
                >
                  Cancel Booking
                </button>
              )}
            </div>

          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>
            <CalendarIcon size={32} style={{ opacity: 0.25, marginBottom: 16 }} />
            <span style={{ fontSize: '0.8125rem' }}>Select a meeting block from the grid to view detailed properties.</span>
          </div>
        )}
      </aside>

      {/* Show the "+ Book" affordance on hour-slot hover */}
      <style>{`button:hover > .slot-plus-hint { opacity: 1 !important; }`}</style>

      {/* Cancel confirmation modal (portal to <body> so it is not affected by
          the transformed `animate-fade-in` page container). */}
      {cancelTarget && createPortal(
        <div className="modal-overlay" onClick={() => setCancelTarget(null)}>
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            id="cancel-booking-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: 24, maxWidth: 420 }}
          >
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 12 }}>Cancel Booking</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginBottom: 24, lineHeight: 1.5 }}>
              Are you sure you want to cancel <strong>"{cancelTarget.title}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setCancelTarget(null)}>Keep Booking</button>
              <button className="btn btn-danger" id="confirm-cancel-btn" onClick={confirmCancelMeeting}>Cancel Booking</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
