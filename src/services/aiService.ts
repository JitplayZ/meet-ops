import { GoogleGenerativeAI, SchemaType, ChatSession } from '@google/generative-ai';
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
      const meetingId = await createMeeting({
        roomId: args.roomId,
        roomName: args.roomName,
        title: args.title,
        agenda: args.title,
        participants: '',
        startTime: new Date(args.startTime),
        endTime: new Date(args.endTime),
        userId: userId,
        userName: userName,
      });
      return { success: true, message: 'Room booked successfully', meetingId };
    }

    return { error: 'Function not found' };
  } catch (error: any) {
    return { error: error.message || 'An error occurred while executing the function.' };
  }
}
