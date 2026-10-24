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
  
  if (lowerText.includes('book') || lowerText.includes('reserve') || lowerText.includes('schedule') || lowerText.includes('create')) {
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
        
        const { data: room, error } = await supabase
          .from('rooms')
          .select('*')
          .ilike('name', `%${intent.entities.roomName}%`)
          .single();
        
        if (error || !room) {
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
        
        if (!intent.entities.date) {
          return { response: 'Which date would you like to book the room for? Please specify a date (e.g., "tomorrow", "Monday", "Dec 15").' };
        }
        
        if (!intent.entities.startTime) {
          return { response: 'What time would you like to start the meeting? (e.g., "2 PM", "14:00")' };
        }
        
        let roomId = '';
        let roomName = '';
        
        if (intent.entities.roomName) {
          const { data: room } = await supabase
            .from('rooms')
            .select('id, name')
            .ilike('name', `%${intent.entities.roomName}%`)
            .single();
          
          if (!room) {
            return { response: `I couldn't find a room named "${intent.entities.roomName}". Would you like me to find available rooms instead?` };
          }
          roomId = room.id;
          roomName = room.name;
        } else {
          const rooms = await findRooms({ capacity: intent.entities.capacity });
          if (rooms.length === 0) {
            return { response: "I couldn't find any available rooms. Please try different criteria." };
          }
          roomId = rooms[0].id;
          roomName = rooms[0].name;
        }
        
        const endTime = new Date(`${format(intent.entities.date, 'yyyy-MM-dd')}T${intent.entities.startTime}`);
        endTime.setHours(endTime.getHours() + 1);
        const endTimeStr = format(endTime, 'HH:mm');
        
        try {
          await createBooking(
            userId,
            userName,
            roomId,
            roomName,
            intent.entities.date,
            intent.entities.startTime,
            endTimeStr,
            intent.entities.purpose,
          );
          
          return {
            response: `✅ Meeting booked successfully!\n\n**Room:** ${roomName}\n**Date:** ${format(intent.entities.date, 'EEEE, MMMM d')}\n**Time:** ${intent.entities.startTime} - ${endTimeStr}\n**Status:** Pending approval\n\nYour booking request has been submitted for approval.`,
            metadata: { success: true, roomId, roomName },
          };
        } catch (err: any) {
          return {
            response: `Sorry, I couldn't book the room: ${err.message || 'Unknown error'}. The room might already be booked at that time.`,
          };
        }
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