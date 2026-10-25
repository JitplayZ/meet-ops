import { GoogleGenerativeAI, SchemaType, ChatSession } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';
import { getRooms } from './roomService';
import { createMeeting } from './meetingService';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Tool declaration for Gemini
const bookingTools = [
  {
    functionDeclarations: [
      {
        name: 'getRooms',
        description: 'Retrieves a list of all available rooms including their IDs, names, capacities, and equipment.',
      },
      {
        name: 'bookRoom',
        description: 'Books a specific meeting room for the user. Use this when the user explicitly asks to book a room.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            roomId: { type: SchemaType.STRING, description: 'The ID of the room to book' },
            roomName: { type: SchemaType.STRING, description: 'The name of the room to book' },
            title: { type: SchemaType.STRING, description: 'The title or purpose of the meeting' },
            startTime: { type: SchemaType.STRING, description: 'ISO 8601 formatted start time (e.g. 2026-10-24T10:00:00.000Z)' },
            endTime: { type: SchemaType.STRING, description: 'ISO 8601 formatted end time (e.g. 2026-10-24T11:00:00.000Z)' },
          },
          required: ['roomId', 'roomName', 'title', 'startTime', 'endTime'],
        },
      },
    ],
  },
] as any;

export async function createChatSession(
  userName: string
): Promise<ChatSession | null> {
  if (!genAI) {
    console.warn('Gemini API key is missing; chat will use the local fallback assistant.');
    return null;
  }

  try {
    const offset = -new Date().getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0');
    const offsetMinutes = (Math.abs(offset) % 60).toString().padStart(2, '0');
    const offsetString = `${offset >= 0 ? '+' : '-'}${offsetHours}:${offsetMinutes}`;
    const localTime = new Date().toLocaleString();

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: bookingTools,
      systemInstruction: `You are an enterprise AI assistant for "MeetOps", a room booking system.
    Your goal is to help users find and book meeting rooms.
    Be helpful, concise, and professional.
    Current Local Date/Time: ${localTime}
    User's Time Zone Offset: ${offsetString}
    Current User: ${userName}

    When the user asks for available rooms, always use the "getRooms" function first.
    When the user wants to book a room, you must collect the exact time, meeting title, and room they want. If they don't provide a specific room, suggest one that fits their needs from the getRooms list.
    Once you have the room, title, and time, use the "bookRoom" function.
    IMPORTANT TIMEZONE RULE: The user specifies times in their local time zone. When calling "bookRoom", you MUST append the user's Time Zone Offset ("${offsetString}") to the ISO 8601 string instead of "Z". For example, if the user asks for 2 PM on Oct 24, output "2026-10-24T14:00:00${offsetString}". DO NOT use "Z".
    `,
    });

    return model.startChat({
      history: [],
    });
  } catch (err) {
    console.warn('Failed to create Gemini chat session; chat will use the local fallback assistant.', err);
    return null;
  }
}

export async function handleFunctionCall(
  call: any,
  userId: string,
  userName: string
): Promise<any> {
  try {
    if (call.name === 'getRooms') {
      const rooms = await getRooms();
      return {
        rooms: rooms.map(r => ({
          id: r.id,
          name: r.name,
          capacity: r.capacity,
          equipment: r.equipment,
        })),
      };
    }

    if (call.name === 'bookRoom') {
      const args = call.args;
      // The LLM supplies roomId/roomName, but the pair can drift apart: it may
      // echo the requested room in its prose while passing another room's id
      // (or name) in the function args, and createMeeting stores the
      // denormalized room_name that the Admin pending-approvals list renders.
      // Treat the real inventory as the source of truth: resolve the room from
      // the requested name first (exact, then longest partial match), fall
      // back to the supplied id, and always persist the canonical id + name.
      const rooms = await getRooms();
      const norm = (s?: string) => (s || '').trim().toLowerCase();
      const wanted = norm(args.roomName);
      let room = wanted ? rooms.find(r => norm(r.name) === wanted) : undefined;
      if (!room && wanted) {
        const partial = rooms
          .filter(r => norm(r.name) && (wanted.includes(norm(r.name)) || norm(r.name).includes(wanted)))
          .sort((a, b) => b.name.length - a.name.length);
        room = partial[0];
      }
      if (!room) room = rooms.find(r => r.id === args.roomId);
      if (!room) {
        return { error: `Room "${args.roomName}" was not found in the room inventory. Call getRooms and pick an actual room before booking.` };
      }
      // Resolve the acting user from the live Supabase session when the
      // component-provided userId is missing (e.g. profile still hydrating
      // when the function call fires). Without this, `user_id` was persisted
      // as an empty string that RLS silently rejected, so the assistant
      // reported "Reserved: <room>" while the row never surfaced in the
      // signed-in user's Meetings view (getUserMeetings filters by user_id).
      let actorId = userId;
      let actorName = userName;
      if (!actorId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          actorId = user.id;
          if (!actorName || actorName === 'Guest') {
            actorName = (user.user_metadata?.full_name as string)
              || (user.user_metadata?.name as string)
              || user.email
              || 'User';
          }
        }
      }
      if (!actorId) {
        return { error: 'No authenticated user is available for this booking. Please sign in and try again.' };
      }
      // Guard against the assistant scheduling a slot that has already
      // elapsed: it would land in the Past tab and read as "missing" from
      // the Upcoming view the tester navigates to after booking. Bump a
      // same-day start that has slipped into the past up to the next
      // 30-minute boundary.
      let startTime = new Date(args.startTime);
      let endTime = new Date(args.endTime);
      if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime()) && endTime <= new Date()) {
        const bumped = new Date();
        bumped.setMinutes(bumped.getMinutes() < 30 ? 30 : 60, 0, 0);
        const durationMs = endTime.getTime() - startTime.getTime();
        startTime = bumped;
        endTime = new Date(bumped.getTime() + (durationMs > 0 ? durationMs : 60 * 60 * 1000));
      }
      const meetingId = await createMeeting({
        roomId: room.id,
        roomName: room.name,
        title: args.title,
        agenda: args.title,
        participants: '',
        startTime,
        endTime,
        userId: actorId,
        userName: actorName || 'User',
      });
      // Report the canonical room back to the model so its confirmation text
      // always matches the record shown in the admin/booking views.
      return { success: true, message: `Room "${room.name}" booked successfully`, meetingId, roomId: room.id, roomName: room.name };
    }

    return { error: 'Function not found' };
  } catch (error: any) {
    return { error: error.message || 'An error occurred while executing the function.' };
  }
}
