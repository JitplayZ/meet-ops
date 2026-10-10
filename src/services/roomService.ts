import { supabase } from '@/lib/supabase';
import type { Room } from '@/types';

function toRoom(data: any): Room {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    location: data.location,
    capacity: data.capacity,
    equipment: data.equipment || [],
    availabilityStart: data.availability_start,
    availabilityEnd: data.availability_end,
    availableDays: data.available_days || [],
    rules: data.rules || '',
    createdBy: data.created_by,
    createdAt: new Date(data.created_at),
  };
}

export async function getRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toRoom);
}

export async function getRoom(id: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; 
    throw error;
  }
  return data ? toRoom(data) : null;
}

export async function createRoom(data: Omit<Room, 'id' | 'createdAt'>): Promise<string> {
  const payload = {
    name: data.name,
    description: data.description,
    location: data.location,
    capacity: data.capacity,
    equipment: data.equipment,
    availability_start: data.availabilityStart,
    availability_end: data.availabilityEnd,
    available_days: data.availableDays,
    rules: data.rules,
    created_by: data.createdBy,
  };

  const { data: result, error } = await supabase
    .from('rooms')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;
  return result.id;
}

export async function updateRoom(id: string, data: Partial<Room>): Promise<void> {
  const payload: any = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.location !== undefined) payload.location = data.location;
  if (data.capacity !== undefined) payload.capacity = data.capacity;
  if (data.equipment !== undefined) payload.equipment = data.equipment;
  if (data.availabilityStart !== undefined) payload.availability_start = data.availabilityStart;
  if (data.availabilityEnd !== undefined) payload.availability_end = data.availabilityEnd;
  if (data.availableDays !== undefined) payload.available_days = data.availableDays;
  if (data.rules !== undefined) payload.rules = data.rules;

  const { error } = await supabase
    .from('rooms')
    .update(payload)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteRoom(id: string): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
