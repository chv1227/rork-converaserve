export type OrganizationRole = 'super_admin' | 'organization_admin' | 'member';

export interface Organization {
  id: string;
  name: string;
  description: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  joinedAt: string;
  isActive: boolean;
}

export interface Ministry {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  memberCount: number;
  image: string;
}

export interface Event {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  ministryId: string;
  ministryName: string;
  color: string;
  attendees: number;
}

export interface Announcement {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  author: string;
  authorRole: string;
  authorAvatar: string;
  date: string;
  ministryId?: string;
  ministryName?: string;
  priority: 'high' | 'normal' | 'low';
  isPinned: boolean;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  timestamp: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  organizationId: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isGroup: boolean;
  members?: string[];
  ministryId?: string;
  ministryColor?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  ministries: string[];
  phone?: string;
  joinedDate: string;
}

export type VocalPart = 'soprano' | 'alto' | 'tenor' | 'bass' | 'full';

export interface Song {
  id: string;
  organizationId: string;
  title: string;
  artist?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  coverImage?: string;
  duration: number;
}

export interface AudioPart {
  id: string;
  songId: string;
  vocalPart: VocalPart;
  audioFileUrl: string;
  duration: number;
}

export interface LyricLine {
  id: string;
  songId: string;
  lineText: string;
  startTime: number;
  endTime: number;
  order: number;
}
