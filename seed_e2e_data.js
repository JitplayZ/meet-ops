// Provisions a deterministic E2E test account with upcoming meetings so that
// automated flows ("Open meetings list after signing in", calendar scheduling,
// quick booking) have fresh, non-conflicting future data to assert against.
//
// Usage: node seed_e2e_data.js
// Re-runnable: logs in with the known credentials if the account already
// exists, and skips seeding when upcoming meetings are already present.

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const EMAIL = process.env.E2E_TEST_EMAIL || 'e2e.robot@resourceflow.test';
const PASSWORD = process.env.E2E_TEST_PASSWORD || 'Password123!';
const NAME = 'E2E Robot';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function authenticate() {
  const signIn = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (signIn.data.session) return signIn.data.session.user;

  const signUp = await supabase.auth.signUp({
    email: EMAIL,
    password: PASSWORD,
    options: { data: { full_name: NAME, name: NAME } },
  });
  if (signUp.error || !signUp.data.user) {
    console.error('Could not create/sign in test user:', signUp.error?.message);
    process.exit(1);
  }
  if (!signUp.data.session) {
    // Email confirmation may be on; try signing in after a short wait
    await new Promise(r => setTimeout(r, 1500));
    const retry = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    if (!retry.data.session) {
      console.error('Account created but sign-in failed (email confirmation enabled?).');
      process.exit(1);
    }
    return retry.data.user;
  }
  return signUp.data.user;
}

function toLocalISO(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

async function seedUpcomingMeeting(userId, userName, room, dayOffset, startHour, title, status) {
  const start = new Date();
  start.setDate(start.getDate() + dayOffset);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  // Avoid conflicts with existing active bookings for this room
  const { data: busy } = await supabase
    .from('meetings')
    .select('start_time, end_time')
    .eq('room_id', room.id)
    .in('status', ['pending', 'approved']);
  const clash = (busy || []).some(
    m => start < new Date(m.end_time) && end > new Date(m.start_time),
  );
  if (clash) {
    console.log(`  "${title}" clashes with an existing booking; trying next hour`);
    return seedUpcomingMeeting(userId, userName, room, dayOffset, Math.min(startHour + 1, 15), title, status);
  }

  const { error } = await supabase.from('meetings').insert({
    room_id: room.id,
    room_name: room.name,
    user_id: userId,
    user_name: userName,
    title,
    start_time: toLocalISO(start),
    end_time: toLocalISO(end),
    agenda: 'Seeded for automated E2E verification',
    participants: '',
    status,
  });
  if (error) {
    console.error(`  Failed to seed "${title}":`, error.message);
    return false;
  }
  console.log(`  Seeded "${title}" (${room.name}, +${dayOffset}d ${startHour}:00-${startHour + 1}:00, ${status})`);
  return true;
}

async function ensureProfileRow(userId) {
  // Mirror the auth user into the public users table in case the DB trigger
  // has not run yet (some flows read role from it).
  const { data: existing } = await supabase.from('users').select('id').eq('id', userId).single();
  if (!existing) {
    await supabase.from('users').insert({ id: userId, name: NAME, email: EMAIL, role: 'user' });
  }
}

async function main() {
  console.log('E2E data provisioning');

  const user = await authenticate();
  console.log(`Test account ready: ${EMAIL} / ${PASSWORD} (uid ${user.id})`);
  await ensureProfileRow(user.id);

  const { data: upcoming } = await supabase
    .from('meetings')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved'])
    .gt('end_time', new Date().toISOString());
  if ((upcoming || []).length > 0) {
    console.log(`Account already has ${upcoming.length} upcoming meeting(s); skipping seed.`);
    return;
  }

  let { data: rooms } = await supabase.from('rooms').select('id, name').order('created_at', { ascending: true });
  if (!rooms || rooms.length === 0) {
    console.log('No rooms found; creating a default E2E room...');
    const { data: created, error } = await supabase
      .from('rooms')
      .insert({ name: 'E2E Boardroom', location: 'HQ - Floor 4', capacity: 12, description: 'Seeded for E2E tests', equipment: ['screen', 'whiteboard'] })
      .select('id, name')
      .single();
    if (error) {
      console.error('Cannot create room (admin RLS on inserts?). Aborting.', error.message);
      return;
    }
    rooms = [created];
  }

  console.log('Seeding upcoming meetings for the test account:');
  await seedUpcomingMeeting(user.id, NAME, rooms[0], 1, 10, 'E2E Upcoming Standup', 'approved');
  await seedUpcomingMeeting(user.id, NAME, rooms[0], 2, 14, 'E2E Sprint Review', 'pending');
  if (rooms[1]) {
    await seedUpcomingMeeting(user.id, NAME, rooms[1], 3, 9, 'E2E Cross-room Sync', 'approved');
  }

  console.log('Done. The Meetings page "Upcoming" tab and Calendar will now show data for this account.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
