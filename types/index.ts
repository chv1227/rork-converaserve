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
  conversationId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  timestamp: string;
  isRead: boolean;
  readBy?: string[];
  messageType?: 'text' | 'image' | 'system';
}

export type ConversationType = 'direct' | 'group' | 'ministry';

export interface Conversation {
  id: string;
  organizationId: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageTimestamp?: string;
  unreadCount: number;
  isGroup: boolean;
  type: ConversationType;
  members?: string[];
  memberIds?: string[];
  participantIds?: string[];
  ministryId?: string;
  ministryColor?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  isArchived?: boolean;
  isMuted?: boolean;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  joinedAt: string;
  lastReadAt?: string;
  role?: 'admin' | 'member';
}

export interface DirectMessageRequest {
  recipientId: string;
  recipientName: string;
  recipientAvatar: string;
  organizationId: string;
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

export type MinistryRole = 'leader' | 'admin' | 'member';

export interface MinistryMember {
  id: string;
  name: string;
  avatar: string;
  role: MinistryRole;
  joinedAt: string;
  email?: string;
  phone?: string;
}

export interface DiscussionPost {
  id: string;
  ministryId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: MinistryRole;
  title: string;
  content: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  isPinned: boolean;
}

export interface PrayerRequest {
  id: string;
  ministryId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  title: string;
  content: string;
  createdAt: string;
  prayerCount: number;
  isAnonymous: boolean;
  isAnswered: boolean;
}

export interface MinistryAnnouncement {
  id: string;
  ministryId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: MinistryRole;
  title: string;
  content: string;
  createdAt: string;
  priority: 'high' | 'normal' | 'low';
}

export interface MinistryEvent {
  id: string;
  ministryId: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  attendeesCount: number;
  maxAttendees?: number;
  isRecurring: boolean;
  recurrencePattern?: string;
}

export type GivingType = 'tithe' | 'offering';
export type GivingFrequency = 'one_time' | 'weekly' | 'bi_weekly' | 'monthly';
export type GivingStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface Donation {
  id: string;
  userId: string;
  organizationId: string;
  type: GivingType;
  amount: number;
  currency: string;
  frequency: GivingFrequency;
  note?: string;
  status: GivingStatus;
  paymentMethod?: string;
  transactionId?: string;
  nextScheduledDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringGiving {
  id: string;
  userId: string;
  organizationId: string;
  type: GivingType;
  amount: number;
  currency: string;
  frequency: GivingFrequency;
  note?: string;
  isActive: boolean;
  nextDate: string;
  lastProcessedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GivingStats {
  totalGiven: number;
  totalTithes: number;
  totalOfferings: number;
  thisMonthTotal: number;
  thisYearTotal: number;
  donationCount: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voterIds: string[];
}

export interface Poll {
  id: string;
  ministryId: string;
  organizationId: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdByName: string;
  createdByAvatar: string;
  createdAt: string;
  endsAt?: string;
  isActive: boolean;
  allowMultiple: boolean;
  isAnonymous: boolean;
  totalVotes: number;
}
