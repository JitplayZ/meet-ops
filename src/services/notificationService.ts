import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types';

function toNotification(data: any): Notification {
  return {
    id: data.id,
    userId: data.user_id,
    type: data.type,
    message: data.message,
    meetingId: data.meeting_id || undefined,
    read: data.read,
    createdAt: new Date(data.created_at),
  };
}

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toNotification);
}

export async function createNotification(
  data: Omit<Notification, 'id' | 'createdAt' | 'read'>,
): Promise<void> {
  const payload = {
    user_id: data.userId,
    type: data.type,
    message: data.message,
    meeting_id: data.meetingId,
    read: false,
  };
  const { error } = await supabase.from('notifications').insert(payload);
  if (error) throw error;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}
