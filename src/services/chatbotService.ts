import { supabase } from '@/lib/supabase';
import { format, parse } from 'date-fns';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
// Guard against a missing key: GoogleGenerativeAI throws on empty/invalid keys,
// which would break every chat flow. Intent detection falls back to rules
// when the model is unavailable.
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI
  ? genAI.getGenerativeModel({
      model: import.meta.env.VITE_GEMINI_CHAT_MODEL || 'gemini-2.5-flash',
    })
  : null;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface BookingIntent {
  action: 'find_room' | 'check_availability' | 'book_room' | 'show_bookings' | 'show_today_bookings' | 'suggest_room' | 'help' | 'unknown';
  entities: {
    roomName?: string;
    capacity?: number;
    date?: Date;
    startTime?: string;
    endTime?: string;
    duration?: number;
    purpose?: string;
  };
}

const TIME_PATTERNS = [
  /(\d{1,2})\s*(am|pm|a\.?m\.?|p\.?m\.?)/i,
  /(\d{1,2}):(\d{2})\s*(am|pm|a\.?m\.?|p\.?m\.?|o'?clock)?/i,
  /(\d{1,2})\s*o'?clock/i,
];

const DATE_PATTERNS = {
  today: /today|now|current day/i,
  tomorrow: /tomorrow|next day|following day/i,
  weekday: /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
  relative: /in\s+(\d+)\s*(day|days|week|weeks)/i,
  explicit: /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/i,
};

function extractTime(text: string): string | null {
  for (const pattern of TIME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        let hour = parseInt(match[1]);
        const period = match[2].toLowerCase().startsWith('p') ? 'pm' : 'am';
        if (period === 'pm' && hour !== 12) hour += 12;
        if (period === 'am' && hour === 12) hour = 0;
        return `${hour.toString().padStart(2, '0')}:00`;
      } else if (match[2] && match[3]) {
        let hour = parseInt(match[1]);
        const minute = parseInt(match[2]);
        const period = match[3]?.toLowerCase().startsWith('p') ? 'pm' : 'am';
        if (period === 'pm' && hour !== 12) hour += 12;
        if (period === 'am' && hour === 12) hour = 0;
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
    }
  }
  return null;
}

function extractDate(text: string): Date | null {
  const now = new Date();
  
  if (DATE_PATTERNS.today.test(text)) {
    return now;
  }
  
  if (DATE_PATTERNS.tomorrow.test(text)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  const weekdayMatch = text.match(DATE_PATTERNS.weekday);
  if (weekdayMatch) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(weekdayMatch[1].toLowerCase());
    const currentDay = now.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysUntil);
    return targetDate;
  }
  
  const relativeMatch = text.match(DATE_PATTERNS.relative);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    const relativeDate = new Date(now);
    if (unit.startsWith('week')) {
      relativeDate.setDate(relativeDate.getDate() + (amount * 7));
    } else {
      relativeDate.setDate(relativeDate.getDate() + amount);
    }
    return relativeDate;
  }
  
  const explicitMatch = text.match(DATE_PATTERNS.explicit);
  if (explicitMatch) {
    const day = parseInt(explicitMatch[1]);
    const month = parseInt(explicitMatch[2]) - 1;
    let year = parseInt(explicitMatch[3]);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
  
  // Month-name forms such as "October 26, 2026", "Oct 26", "Nov 3rd",
  // "26 October 2026". The explicit pattern above only matched numeric
  // dates, so a natural-language reply to "which date?" was never understood
  // and the booking flow stalled in the rule-based fallback.
  const MONTH_INDEX: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const MONTH_TOKEN = '(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)';
  const monthFirst = text.match(new RegExp(`\\b${MONTH_TOKEN}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,?\\s*(\\d{2,4}))?\\b`, 'i'));
  if (monthFirst) {
    const month = MONTH_INDEX[monthFirst[1].toLowerCase().slice(0, 3)];
    const day = parseInt(monthFirst[2], 10);
    let year = monthFirst[3] ? parseInt(monthFirst[3], 10) : now.getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, month, day, 0, 0, 0, 0);
    // No explicit year and already past -> assume they meant next occurrence.
    if (!monthFirst[3] && d.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      d.setFullYear(d.getFullYear() + 1);
    }
    if (!isNaN(d.getTime())) return d;
  }
  const dayFirst = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_TOKEN}\\.?(?:\\s*,?\\s*(\\d{2,4}))?\\b`, 'i'));
  if (dayFirst) {
    const month = MONTH_INDEX[dayFirst[2].toLowerCase().slice(0, 3)];
    const day = parseInt(dayFirst[1], 10);
    let year = dayFirst[3] ? parseInt(dayFirst[3], 10) : now.getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, month, day, 0, 0, 0, 0);
    if (!dayFirst[3] && d.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      d.setFullYear(d.getFullYear() + 1);
    }
    if (!isNaN(d.getTime())) return d;
  }
  
  return null;
}

function extractCapacity(text: string): number | null {
  const capacityMatch = text.match(/(\d+)\s*(people|person|attendees|capacity|seats?|pax)/i);
  if (capacityMatch) {
    return parseInt(capacityMatch[1]);
  }
  
  const sizeMatch = text.match(/(small|medium|large|xlarge|extra\s*large)/i);
  if (sizeMatch) {
    const size = sizeMatch[1].toLowerCase();
    if (size === 'small') return 4;
    if (size === 'medium') return 8;
    if (size === 'large') return 15;
    if (size === 'xlarge' || size === 'extra large') return 30;
  }
  
  return null;
}

function extractRoomName(text: string): string | null {
  const roomMatch = text.match(/(?:room|conference\s*room|meeting\s*room|board\s*room)\s*(?:number|named|called)?\s*([a-zA-Z0-9\s\-_]+)/i);
  if (roomMatch) {
    return roomMatch[1].trim();
  }
  
  const namedRoom = text.match(/(?:in|at|for)\s+(?:the\s+)?([A-Z][a-zA-Z0-9\s\-_]+(?:Room|Hall|Center|Centre))/i);
  if (namedRoom) {
    return namedRoom[1].trim();
  }
  
  return null;
}

function detectIntent(text: string): BookingIntent {
  const lowerText = text.toLowerCase();
  
  // "Show my bookings" / "my upcoming meetings" contains the substring "book"/
  // "schedule" but is a VIEW request, not a new booking. Guard so these fall
  // through to the show_bookings branches below instead of starting a booking.
  const isViewingBookings = /(my bookings?|show (me )?(my )?bookings?|list (my )?bookings?|upcoming bookings?|my upcoming|my schedule|my meetings?)/i.test(lowerText);

  if (!isViewingBookings && (lowerText.includes('book') || lowerText.includes('reserve') || lowerText.includes('schedule') || lowerText.includes('create'))) {
    return {
      action: 'book_room',
      entities: {
        capacity: extractCapacity(text) ?? undefined,
        date: extractDate(text) ?? undefined,
        startTime: extractTime(text) || undefined,
        roomName: extractRoomName(text) || undefined,
        purpose: extractPurpose(text),
      },
    };
  }
  
  if (lowerText.includes('available') || lowerText.includes('free') || lowerText.includes('vacant')) {
    return {
      action: 'check_availability',
      entities: {
        roomName: extractRoomName(text) || undefined,
        date: extractDate(text) || new Date(),
        startTime: extractTime(text) || undefined,
      },
    };
  }
  
  if (lowerText.includes('find') || lowerText.includes('search') || lowerText.includes('look for') || lowerText.includes('need a room')) {
    return {
      action: 'find_room',
      entities: {
        capacity: extractCapacity(text) ?? undefined,
        date: extractDate(text) ?? undefined,
        startTime: extractTime(text) || undefined,
      },
    };
  }
  
  if (lowerText.includes('suggest') || lowerText.includes('recommend') || lowerText.includes('good room')) {
    return {
      action: 'suggest_room',
      entities: {
        capacity: extractCapacity(text) ?? undefined,
        purpose: extractPurpose(text),
      },
    };
  }
  
  if (lowerText.includes('my meeting') || lowerText.includes('my booking') || lowerText.includes('my upcoming') || lowerText.includes('my schedule')) {
    return {
      action: 'show_bookings',
      entities: {},
    };
  }
  
  if (lowerText.includes('today') && (lowerText.includes('booking') || lowerText.includes('meeting') || lowerText.includes('schedule'))) {
    return {
      action: 'show_today_bookings',
      entities: {},
    };
  }
  
  if (lowerText.includes('help') || lowerText.includes('what can you do') || lowerText.includes('how to')) {
    return {
      action: 'help',
      entities: {},
    };
  }
  
  return {
    action: 'unknown',
    entities: {},
  };
}

function extractPurpose(text: string): string | undefined {
  const purposeMatch = text.match(/(?:for|purpose|type)\s+(?:of\s+)?(?:a\s+)?([\w\s\-_]+)/i);
  if (purposeMatch) {
    return purposeMatch[1].trim();
  }
  return undefined;
}

async function findRooms(filters?: { capacity?: number }) {
  let query = supabase.from('rooms').select('*');
  
  if (filters?.capacity) {
    query = query.gte('capacity', filters.capacity);
  }
  
  const { data, error } = await query.order('capacity', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

async function checkRoomAvailability(roomId: string, date: Date, startTime?: string) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const startIso = startOfDay.toISOString();
  const endIso = endOfDay.toISOString();
  
  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('start_time, end_time, status')
    .eq('room_id', roomId)
    .gte('start_time', startIso)
    .lte('start_time', endIso)
    .in('status', ['pending', 'approved']);
  
  if (error) throw error;
  
  if (!startTime) {
    return {
      available: meetings.length === 0,
      bookedSlots: meetings.map(m => ({
        start: format(new Date(m.start_time), 'h:mm a'),
        end: format(new Date(m.end_time), 'h:mm a'),
      })),
    };
  }
  
  const requestedStart = parse(`${format(date, 'yyyy-MM-dd')}T${startTime}`, 'yyyy-MM-dd\'T\'HH:mm', new Date());
  const requestedEnd = new Date(requestedStart);
  requestedEnd.setHours(requestedEnd.getHours() + 1);
  
  const isAvailable = !meetings.some(m => {
    const mStart = new Date(m.start_time);
    const mEnd = new Date(m.end_time);
    return requestedStart < mEnd && requestedEnd > mStart;
  });
  
  return {
    available: isAvailable,
    bookedSlots: meetings.map(m => ({
      start: format(new Date(m.start_time), 'h:mm a'),
      end: format(new Date(m.end_time), 'h:mm a'),
    })),
  };
}

async function getTodayBookings(userId?: string) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  
  let query = supabase
    .from('meetings')
    .select('*, rooms(name, location)')
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString())
    .in('status', ['pending', 'approved'])
    .order('start_time', { ascending: true });
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  return data.map(m => ({
    ...m,
    roomName: m.rooms?.name || 'Unknown',
    roomLocation: m.rooms?.location || '',
  }));
}

async function getUserBookings(userId: string, upcoming = true) {
  const now = new Date();
  
  let query = supabase
    .from('meetings')
    .select('*, rooms(name, location)')
    .eq('user_id', userId)
    .in('status', ['pending', 'approved'])
    .order('start_time', { ascending: upcoming ? true : false });
  
  if (upcoming) {
    query = query.gte('start_time', now.toISOString());
  }
  
  const { data, error } = await query.limit(10);
  if (error) throw error;
  
  return data.map(m => ({
    ...m,
    roomName: m.rooms?.name || 'Unknown',
    roomLocation: m.rooms?.location || '',
  }));
}

async function createBooking(userId: string, userName: string, roomId: string, roomName: string, date: Date, startTime: string, endTime: string, purpose?: string) {
  const startDateTime = parse(`${format(date, 'yyyy-MM-dd')}T${startTime}`, 'yyyy-MM-dd\'T\'HH:mm', new Date());
  const endDateTime = parse(`${format(date, 'yyyy-MM-dd')}T${endTime}`, 'yyyy-MM-dd\'T\'HH:mm', new Date());
  
  const { data: existingMeetings, error: fetchError } = await supabase
    .from('meetings')
    .select('start_time, end_time')
    .eq('room_id', roomId)
    .in('status', ['pending', 'approved']);
  
  if (fetchError) throw fetchError;
  
  const hasConflict = existingMeetings.some(m => {
    const mStart = new Date(m.start_time);
    const mEnd = new Date(m.end_time);
    return startDateTime < mEnd && endDateTime > mStart;
  });
  
  if (hasConflict) {
    throw new Error('This room is already booked during this time.');
  }
  
  const payload = {
    room_id: roomId,
    room_name: roomName,
    user_id: userId,
    user_name: userName,
    title: purpose || 'Meeting',
    start_time: startDateTime.toISOString(),
    end_time: endDateTime.toISOString(),
    agenda: purpose || '',
    participants: '',
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

// The rule-based fallback assistant is otherwise stateless: it could start a
// booking but lost the room/purpose as soon as it asked a follow-up ("Which
// date?"), so a bare "October 26, 2026" reply was never understood and the flow
// stalled. This per-user store lets a booking span multiple turns.
interface PendingBooking {
  roomId?: string;
  roomName?: string;
  date?: Date;
  startTime?: string;
  purpose?: string;
}
const pendingBookings = new Map<string, PendingBooking>();

// Resolve a room by (partial) name. Some rooms share the same name in the
// inventory, so `.single()` would error out on ambiguous names; pick the
// earliest-created match deterministically instead.
async function resolveRoomByName(name: string) {
  const { data } = await supabase
    .from('rooms')
    .select('id, name')
    .ilike('name', `%${name}%`)
    .order('created_at', { ascending: true })
    .limit(1);
  return data?.[0] || null;
}

// Match the *full* room name actually mentioned in the free text. `extractRoomName`
// keys on the literal word "Room", so "book E2E Test Room A" collapses to just
// "A" and a partial ILIKE then resolves to an unrelated room (e.g. "Boardroom
// 305"). Comparing against the real inventory and preferring the longest
// (most specific) matching name books the room the user actually named.
async function findRoomByMention(text: string) {
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name')
    .order('created_at', { ascending: true });
  if (!rooms || rooms.length === 0) return null;
  const lower = text.toLowerCase();
  const matched = rooms
    .filter(r => r.name && lower.includes(r.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length);
  return matched[0] || null;
}

// Resolve the room referenced by a user message: first by an exact known room
// name contained in the text, then by the regex-extracted/partial name.
async function resolveRoomFromText(text: string, fallbackName?: string) {
  const direct = await findRoomByMention(text);
  if (direct) return direct;
  const name = fallbackName || extractRoomName(text);
  if (name) return await resolveRoomByName(name);
  return null;
}

// Drive the booking conversation: ask for the next missing detail (persisting
// partial state) or, once room + date + start time are known, complete it.
async function advanceBooking(
  userId: string,
  userName: string | undefined,
  pending: PendingBooking,
): Promise<{ response: string; metadata?: any }> {
  if (!pending.roomId) {
    pendingBookings.set(userId, pending);
    return { response: 'Which room would you like to book? You can give me the room name, or ask me to find an available one.' };
  }
  if (!pending.date) {
    pendingBookings.set(userId, pending);
    return { response: `Which date would you like to book ${pending.roomName} for? (e.g. "October 26, 2026", "tomorrow", "next Friday")` };
  }
  if (!pending.startTime) {
    pendingBookings.set(userId, pending);
    return { response: `What time should your ${pending.roomName} meeting on ${format(pending.date, 'MMMM d, yyyy')} start? (e.g. "2 PM", "14:00")` };
  }

  const endTime = new Date(`${format(pending.date, 'yyyy-MM-dd')}T${pending.startTime}`);
  endTime.setHours(endTime.getHours() + 1);
  const endTimeStr = format(endTime, 'HH:mm');

  try {
    await createBooking(
      userId,
      userName || 'User',
      pending.roomId,
      pending.roomName || '',
      pending.date,
      pending.startTime,
      endTimeStr,
      pending.purpose,
    );
    pendingBookings.delete(userId);
    return {
      response: `✅ Meeting booked successfully!\n\n**Room:** ${pending.roomName}\n**Date:** ${format(pending.date, 'EEEE, MMMM d, yyyy')}\n**Time:** ${pending.startTime} - ${endTimeStr}\n**Status:** Pending approval\n\nYour booking request has been submitted for approval.`,
      metadata: { success: true, roomId: pending.roomId, roomName: pending.roomName },
    };
  } catch (err: any) {
    pendingBookings.delete(userId);
    return {
      response: `Sorry, I couldn't book the room: ${err.message || 'Unknown error'}. The room might already be booked at that time.`,
    };
  }
}

function formatFieldName(field: string): string {
  const fieldNames: Record<string, string> = {
    date: 'Date',
    startTime: 'Start time',
    endTime: 'End time',
    roomName: 'Room name',
    capacity: 'Number of people',
    purpose: 'Meeting purpose',
  };
  return fieldNames[field] || field;
}

export async function processChatMessage(
  message: string,
  userId?: string,
  userName?: string,
): Promise<{ response: string; metadata?: any }> {
  // Resume an in-progress booking before doing fresh intent detection, so a
  // short answer like "October 26, 2026" or "2 PM" is interpreted in context
  // instead of falling through to "I'm not sure I understood".
  if (userId) {
    const pending = pendingBookings.get(userId);
    if (pending) {
      if (/\b(cancel|never ?mind|stop|forget it|quit|start over)\b/i.test(message)) {
        pendingBookings.delete(userId);
        return { response: "No problem — I've cancelled that booking request. What else can I help you with?" };
      }
      const d = extractDate(message);
      const t = extractTime(message);
      const purpose = extractPurpose(message);
      if (d) pending.date = d;
      if (t) pending.startTime = t;
      if (purpose) pending.purpose = purpose;
      // Only override the room when this message actually names one (matched
      // against the real inventory), so a bare "October 29, 2026" reply keeps
      // the room chosen on an earlier turn.
      const room = await resolveRoomFromText(message);
      if (room) { pending.roomId = room.id; pending.roomName = room.name; }
      return await advanceBooking(userId, userName, pending);
    }
  }

  let intent: BookingIntent;
  
  try {
    if (!model) throw new Error('Gemini model not configured');
    const geminiResponse = await model.generateContent(
      `You are an AI Meeting Booking Assistant for MeetOps. Help users find rooms, check availability, book meetings, and view their bookings.
      
Available actions:
- find_room: Find rooms based on capacity, date, time
- check_availability: Check if a specific room is available
- book_room: Book a room for a meeting
- show_bookings: Show user's upcoming bookings
- show_today_bookings: Show today's scheduled meetings
- suggest_room: Suggest rooms based on needs
- help: Show available commands

User message: "${message}"
User ID: ${userId || 'not logged in'}
User Name: ${userName || 'Guest'}

Extract the intent and entities from the message. Respond in JSON format:
{
  "action": "action_name",
  "entities": {
    "roomName": "string or null",
    "capacity": number or null,
    "date": "YYYY-MM-DD or null",
    "startTime": "HH:mm or null",
    "endTime": "HH:mm or null",
    "purpose": "string or null"
  },
  "needsMoreInfo": boolean,
  "missingFields": ["field1", "field2"]
}

If the user is asking to book but hasn't provided date/time/room, set needsMoreInfo to true and list missingFields.`
    );
    
    const responseText = geminiResponse.response.text();
    let parsedIntent;
    
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedIntent = JSON.parse(jsonMatch[0]);
      } else {
        parsedIntent = JSON.parse(responseText);
      }
    } catch (e) {
      console.error('Failed to parse Gemini response:', e);
      parsedIntent = null;
    }
    
    if (parsedIntent) {
      intent = {
        action: parsedIntent.action || 'unknown',
        entities: {
          roomName: parsedIntent.entities?.roomName || undefined,
          capacity: parsedIntent.entities?.capacity || undefined,
          date: parsedIntent.entities?.date ? new Date(parsedIntent.entities.date) : undefined,
          startTime: parsedIntent.entities?.startTime || undefined,
          endTime: parsedIntent.entities?.endTime || undefined,
          purpose: parsedIntent.entities?.purpose || undefined,
        },
      };
      
      if (parsedIntent.needsMoreInfo) {
        const missingFields = parsedIntent.missingFields || [];
        if (missingFields.length > 0) {
          return {
            response: `I'd be happy to help you with that! To proceed, I need a bit more information:\n\n${missingFields.map((f: string) => `• ${formatFieldName(f)}`).join('\n')}\n\nPlease provide these details.`,
          };
        }
      }
    } else {
      intent = detectIntent(message);
    }
  } catch (err: any) {
    console.warn('Gemini API failed, falling back to rule-based detection:', err.message);
    intent = detectIntent(message);
  }
  
  try {
    switch (intent.action) {
      case 'find_room': {
        const rooms = await findRooms({
          capacity: intent.entities.capacity,
        });
        
        if (rooms.length === 0) {
          return {
            response: "I couldn't find any rooms matching your criteria. Try adjusting the capacity or check a different time.",
          };
        }
        
        const roomList = rooms.slice(0, 5).map(r => {
          let info = `• **${r.name}** (Capacity: ${r.capacity}`;
          if (r.location) info += `, Location: ${r.location}`;
          info += ')';
          return info;
        }).join('\n');
        
        return {
          response: `I found ${rooms.length} available room(s):\n\n${roomList}\n\nWould you like me to check availability for a specific room or help you book one?`,
          metadata: { rooms },
        };
      }
      
      case 'check_availability': {
        if (!intent.entities.roomName) {
          const rooms = await findRooms();
          if (rooms.length === 0) {
            return { response: "I couldn't find any rooms in the system." };
          }
          return {
            response: `Please specify which room you'd like to check. Available rooms: ${rooms.map(r => r.name).join(', ')}`,
          };
        }
        
        const room = await resolveRoomFromText(message, intent.entities.roomName);
        
        if (!room) {
          return { response: `I couldn't find a room named "${intent.entities.roomName}". Please check the room name and try again.` };
        }
        
        const availability = await checkRoomAvailability(
          room.id,
          intent.entities.date || new Date(),
          intent.entities.startTime,
        );
        
        if (availability.available) {
          return {
            response: `Good news! **${room.name}** is available on ${format(intent.entities.date || new Date(), 'MMMM d')}${intent.entities.startTime ? ` from ${intent.entities.startTime}` : ''}. Would you like to book it?`,
            metadata: { room, available: true },
          };
        } else {
          const bookedTimes = availability.bookedSlots.map(s => `${s.start} - ${s.end}`).join(', ');
          return {
            response: `**${room.name}** is not available at that time. Existing bookings: ${bookedTimes}`,
            metadata: { room, available: false, bookedSlots: availability.bookedSlots },
          };
        }
      }
      
      case 'book_room': {
        if (!userId || !userName) {
          return { response: 'Please log in to book a room.' };
        }
        
        // Collect what we have and hand off to advanceBooking, which either
        // asks for the next missing detail (remembering state so the follow-up
        // answer is understood) or completes the booking. Resolve the room from
        // the actual message so a full room name mentioned by the user wins over
        // the regex-truncated fragment.
        const pending: PendingBooking = { purpose: intent.entities.purpose };
        const room = await resolveRoomFromText(message, intent.entities.roomName);
        if (room) {
          pending.roomId = room.id;
          pending.roomName = room.name;
        } else if (intent.entities.roomName) {
          return { response: `I couldn't find a room named "${intent.entities.roomName}". Would you like me to find available rooms instead?` };
        } else {
          const rooms = await findRooms({ capacity: intent.entities.capacity });
          if (rooms.length === 0) {
            return { response: "I couldn't find any available rooms. Please try different criteria." };
          }
          pending.roomId = rooms[0].id;
          pending.roomName = rooms[0].name;
        }
        if (intent.entities.date) pending.date = intent.entities.date;
        if (intent.entities.startTime) pending.startTime = intent.entities.startTime;
        
        return await advanceBooking(userId, userName, pending);
      }
      
      case 'show_bookings': {
        if (!userId) {
          return { response: 'Please log in to view your bookings.' };
        }
        
        const bookings = await getUserBookings(userId, true);
        
        if (bookings.length === 0) {
          return { response: "You don't have any upcoming meetings scheduled." };
        }
        
        const bookingList = bookings.slice(0, 5).map(b => {
          return `• **${b.title}**\n  Room: ${b.roomName}\n  Date: ${format(new Date(b.start_time), 'EEEE, MMMM d')}\n  Time: ${format(new Date(b.start_time), 'h:mm a')} - ${format(new Date(b.end_time), 'h:mm a')}\n  Status: ${b.status}`;
        }).join('\n\n');
        
        return {
          response: `You have ${bookings.length} upcoming meeting(s):\n\n${bookingList}`,
          metadata: { bookings },
        };
      }
      
      case 'show_today_bookings': {
        const bookings = await getTodayBookings(userId);
        
        if (bookings.length === 0) {
          return { response: 'There are no meetings scheduled for today.' };
        }
        
        const bookingList = bookings.map(b => {
          return `• **${b.title}** by ${b.user_name}\n  Room: ${b.roomName}${b.roomLocation ? ` (${b.roomLocation})` : ''}\n  Time: ${format(new Date(b.start_time), 'h:mm a')} - ${format(new Date(b.end_time), 'h:mm a')}\n  Status: ${b.status}`;
        }).join('\n\n');
        
        return {
          response: `Today's meetings (${bookings.length}):\n\n${bookingList}`,
          metadata: { bookings },
        };
      }
      
      case 'suggest_room': {
        const rooms = await findRooms({ capacity: intent.entities.capacity });
        
        if (rooms.length === 0) {
          return { response: "I couldn't find any rooms to suggest. Try specifying a different capacity." };
        }
        
        const topRooms = rooms.slice(0, 3);
        const suggestions = topRooms.map(r => {
          let desc = `• **${r.name}** - Capacity: ${r.capacity}`;
          if (r.equipment && r.equipment.length > 0) {
            desc += `, Equipment: ${r.equipment.slice(0, 3).join(', ')}`;
          }
          if (r.location) {
            desc += `, Location: ${r.location}`;
          }
          return desc;
        }).join('\n');
        
        return {
          response: `Based on your requirements, I recommend:\n\n${suggestions}\n\nWould you like to check availability or book any of these rooms?`,
          metadata: { rooms: topRooms },
        };
      }
      
      case 'help': {
        return {
          response: `I'm your AI Meeting Booking Assistant! I can help you with:\n\n• **Find rooms** - "Find a room for 8 people"\n• **Check availability** - "Is Conference Room 101 available today?"\n• **Book rooms** - "Book a room for 10 people from 2 PM to 3 PM"\n• **View bookings** - "Show my upcoming meetings"\n• **Today's schedule** - "Show today's bookings"\n• **Get suggestions** - "Suggest a room for a team meeting"\n\nJust ask me in natural language!`,
        };
      }
      
      default: {
        return {
          response: "I'm not sure I understood that. I can help you find rooms, check availability, book meetings, or show your bookings. Try asking something like:\n• \"Find a room for 8 people tomorrow\"\n• \"Is Conference Room 101 available today?\"\n• \"Show my upcoming meetings\"",
        };
      }
    }
  } catch (err: any) {
    console.error('Chat processing error:', err);
    return {
      response: `Sorry, I encountered an error: ${err.message || 'Please try again.'}`,
    };
  }
}
