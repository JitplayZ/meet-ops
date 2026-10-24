import { supabase } from '@/lib/supabase';
import type { Meeting, MeetingStatus } from '@/types';

function toMeeting(data: any): Meeting {
  return {
    id: data.id,
    roomId: data.room_id,
    roomName: data.room_name,
    userId: data.user_id,
    userName: data.user_name,
    title: data.title || 'Meeting',
    startTime: new Date(data.start_time),
    endTime: new Date(data.end_time),
    agenda: data.agenda,
    participants: data.participants || '',
    status: data.status as MeetingStatus,
    createdAt: new Date(data.created_at),
    reviewedBy: data.reviewed_by || undefined,
    reviewedAt: data.reviewed_at ? new Date(data.reviewed_at) : undefined,
  };
}

export async function getMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toMeeting);
}

export async function getUserMeetings(userId: string): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toMeeting);
}

export async function getRoomMeetings(roomId: string): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('room_id', roomId)
    .in('status', ['pending', 'approved']);
  if (error) throw error;
  return data.map(toMeeting);
}

export function hasConflict(
  existingMeetings: Meeting[],
  newStart: Date,
  newEnd: Date,
  excludeId?: string,
): boolean {
  return existingMeetings.some((m) => {
    if (excludeId && m.id === excludeId) return false;
    if (m.status === 'cancelled' || m.status === 'declined') return false;
    return newStart < m.endTime && newEnd > m.startTime;
  });
}

// Find the earliest slot of the same duration, from requestedStart onward, in
// which the room has no conflicting active meeting. Steps in 30-minute
// increments up to 3 days out.
export function findNextFreeSlot(
  existingMeetings: Meeting[],
  requestedStart: Date,
  requestedEnd: Date,
): { start: Date; end: Date } | null {
  const durationMs = requestedEnd.getTime() - requestedStart.getTime();
  if (!(durationMs > 0)) return null;
  const limit = requestedStart.getTime() + 3 * 24 * 60 * 60 * 1000;
  const busy = existingMeetings.filter(
    (m) => m.status !== 'cancelled' && m.status !== 'declined',
  );

  let candidate = new Date(requestedStart);
  for (let i = 0; i < 100 && candidate.getTime() < limit; i++) {
    const candidateEnd = new Date(candidate.getTime() + durationMs);
    const clash = busy.find((m) => candidate < m.endTime && candidateEnd > m.startTime);
    if (!clash) return { start: candidate, end: candidateEnd };
    // Jump just past the conflicting meeting, aligned to the next 30-min mark
    candidate = new Date(clash.endTime);
    candidate.setMinutes(candidate.getMinutes() % 30 === 0 ? candidate.getMinutes() : 30 - (candidate.getMinutes() % 30) + candidate.getMinutes(), 0, 0);
  }
  return null;
}

export async function createMeeting(
  data: Omit<Meeting, 'id' | 'createdAt' | 'status'>,
): Promise<string> {
  const existing = await getRoomMeetings(data.roomId);
  if (hasConflict(existing, data.startTime, data.endTime)) {
    const suggestion = findNextFreeSlot(existing, data.startTime, data.endTime);
    const fmt = (d: Date) =>
      d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    throw new Error(
      suggestion
        ? `This room is already booked during this time. Next available slot: ${fmt(suggestion.start)} – ${fmt(suggestion.end)}.`
        : 'This room is already booked during this time.',
    );
  }

  const payload = {
    room_id: data.roomId,
    room_name: data.roomName,
    user_id: data.userId,
    user_name: data.userName,
    title: data.title,
    start_time: data.startTime.toISOString(),
    end_time: data.endTime.toISOString(),
    agenda: data.agenda,
    participants: data.participants,
    status: 'pending',
  };

  const { data: result, error } = await supabase
    .from('meetings')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;
  return result.id;
}

export async function updateMeetingStatus(
  meetingId: string,
  status: MeetingStatus,
  reviewedBy?: string,
): Promise<void> {
  const payload: any = { status };
  if (reviewedBy) {
    payload.reviewed_by = reviewedBy;
    payload.reviewed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('meetings')
    .update(payload)
    .eq('id', meetingId);
  
  if (error) throw error;
}

export async function cancelMeeting(meetingId: string): Promise<void> {
  const { error } = await supabase
    .from('meetings')
    .update({ status: 'cancelled' })
    .eq('id', meetingId);
  if (error) throw error;
}
