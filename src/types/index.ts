export type UserRole = 'admin' | 'manager' | 'user';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  location: string;
  capacity: number;
  equipment: string[];
  availabilityStart: string; // HH:mm
  availabilityEnd: string;   // HH:mm
  availableDays: number[];   // 0=Sun..6=Sat
  rules: string;
  createdBy: string;
  createdAt: Date;
}

export type MeetingStatus = 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed';

export interface Meeting {
  id: string;
  roomId: string; // previously resourceId
  roomName: string; // previously resourceName
  userId: string;
  userName: string;
  title: string;
  startTime: Date;
  endTime: Date;
  agenda: string; // previously purpose
  participants: string; // previously attendees
  status: MeetingStatus;
  createdAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'meeting_scheduled' | 'meeting_approved' | 'meeting_declined' | 'meeting_cancelled';
  message: string;
  meetingId?: string;
  read: boolean;
  createdAt: Date;
}
