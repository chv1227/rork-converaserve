import { Ministry, Event, Announcement, Conversation, Message, Song, AudioPart, LyricLine, Organization, Membership, OrganizationRole } from "@/types";

export type UserRole = "member" | "leader" | "admin" | "super_admin";

export interface DbUser {
  id: string;
  email: string;
  password: string;
  name: string;
  avatar: string;
  role: UserRole;
  ministries: string[];
  phone?: string;
  joinedDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  organizationId?: string;
  expiresAt: string;
  createdAt: string;
}

export interface WorkflowRequest {
  id: string;
  organizationId: string;
  type: "join_ministry" | "create_event" | "create_announcement" | "role_change" | "join_organization";
  requesterId: string;
  targetId?: string;
  data: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  reviewerId?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  organizationId?: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface ReportedContent {
  id: string;
  organizationId: string;
  contentType: "post" | "comment" | "message";
  contentId: string;
  content: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  status: "pending" | "resolved" | "dismissed";
  authorId: string;
  authorName: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: OrganizationRole;
  ministries: string[];
  invitedBy: string;
  invitedByName: string;
  status: "pending" | "accepted" | "expired";
  token: string;
  expiresAt: string;
  createdAt: string;
}

interface Database {
  organizations: Organization[];
  memberships: Membership[];
  users: DbUser[];
  sessions: Session[];
  ministries: Ministry[];
  events: Event[];
  announcements: Announcement[];
  conversations: Conversation[];
  messages: Message[];
  workflowRequests: WorkflowRequest[];
  notifications: Notification[];
  songs: Song[];
  audioParts: AudioPart[];
  lyrics: LyricLine[];
  reportedContent: ReportedContent[];
  activityLogs: ActivityLog[];
  invitations: Invitation[];
}

const DEFAULT_ORG_ID = "org1";

export const db: Database = {
  organizations: [],
  memberships: [],
  users: [],
  sessions: [],
  ministries: [
    {
      id: "m1",
      organizationId: DEFAULT_ORG_ID,
      name: "Worship Team",
      description: "Leading the congregation in praise and worship through music and song.",
      color: "#0F766E",
      icon: "Music",
      memberCount: 24,
      image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop",
    },
    {
      id: "m2",
      organizationId: DEFAULT_ORG_ID,
      name: "Youth Ministry",
      description: "Empowering the next generation through faith, fellowship, and fun.",
      color: "#F59E0B",
      icon: "Users",
      memberCount: 48,
      image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop",
    },
    {
      id: "m3",
      organizationId: DEFAULT_ORG_ID,
      name: "Outreach",
      description: "Serving our community and spreading love beyond our walls.",
      color: "#10B981",
      icon: "Heart",
      memberCount: 32,
      image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=300&fit=crop",
    },
    {
      id: "m4",
      organizationId: DEFAULT_ORG_ID,
      name: "Children's Ministry",
      description: "Nurturing young hearts with biblical teachings and creative activities.",
      color: "#EC4899",
      icon: "Baby",
      memberCount: 18,
      image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop",
    },
    {
      id: "m5",
      organizationId: DEFAULT_ORG_ID,
      name: "Prayer Team",
      description: "Interceding for our church family and community needs.",
      color: "#6366F1",
      icon: "HandHeart",
      memberCount: 15,
      image: "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=400&h=300&fit=crop",
    },
    {
      id: "m6",
      organizationId: DEFAULT_ORG_ID,
      name: "Media & Tech",
      description: "Bringing excellence to our digital presence and live productions.",
      color: "#3B82F6",
      icon: "Video",
      memberCount: 12,
      image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=300&fit=crop",
    },
  ],
  events: [
    {
      id: "e1",
      organizationId: DEFAULT_ORG_ID,
      title: "Sunday Worship Service",
      description: "Join us for our weekly worship service with Pastor Michael.",
      date: "2026-01-12",
      time: "10:00 AM",
      location: "Main Sanctuary",
      ministryId: "m1",
      ministryName: "Worship Team",
      color: "#0F766E",
      attendees: 150,
    },
    {
      id: "e2",
      organizationId: DEFAULT_ORG_ID,
      title: "Youth Night",
      description: "Games, worship, and a powerful message for our youth.",
      date: "2026-01-14",
      time: "7:00 PM",
      location: "Youth Center",
      ministryId: "m2",
      ministryName: "Youth Ministry",
      color: "#F59E0B",
      attendees: 45,
    },
    {
      id: "e3",
      organizationId: DEFAULT_ORG_ID,
      title: "Community Food Drive",
      description: "Help us collect and distribute food to families in need.",
      date: "2026-01-17",
      time: "9:00 AM",
      location: "Fellowship Hall",
      ministryId: "m3",
      ministryName: "Outreach",
      color: "#10B981",
      attendees: 28,
    },
    {
      id: "e4",
      organizationId: DEFAULT_ORG_ID,
      title: "Kids Sunday School",
      description: "Fun-filled learning about Noah's Ark.",
      date: "2026-01-12",
      time: "10:00 AM",
      location: "Children's Wing",
      ministryId: "m4",
      ministryName: "Children's Ministry",
      color: "#EC4899",
      attendees: 35,
    },
    {
      id: "e5",
      organizationId: DEFAULT_ORG_ID,
      title: "Prayer & Worship Night",
      description: "An evening dedicated to prayer and intimate worship.",
      date: "2026-01-15",
      time: "7:00 PM",
      location: "Chapel",
      ministryId: "m5",
      ministryName: "Prayer Team",
      color: "#6366F1",
      attendees: 40,
    },
    {
      id: "e6",
      organizationId: DEFAULT_ORG_ID,
      title: "Tech Training Workshop",
      description: "Learn about our new streaming setup and sound equipment.",
      date: "2026-01-18",
      time: "2:00 PM",
      location: "Media Room",
      ministryId: "m6",
      ministryName: "Media & Tech",
      color: "#3B82F6",
      attendees: 10,
    },
  ],
  announcements: [
    {
      id: "a1",
      organizationId: DEFAULT_ORG_ID,
      title: "New Series Starting Next Week",
      content: "Join us as we begin our exciting new sermon series \"Unshakeable Faith\" starting next Sunday. Invite your friends and family!",
      author: "Pastor Michael",
      authorRole: "Senior Pastor",
      authorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      date: "2026-01-09",
      priority: "high",
      isPinned: true,
    },
    {
      id: "a2",
      organizationId: DEFAULT_ORG_ID,
      title: "Volunteer Appreciation Dinner",
      content: "We want to honor all our incredible volunteers! Join us for a special dinner on January 25th at 6 PM in the Fellowship Hall.",
      author: "Lisa Chen",
      authorRole: "Volunteer Coordinator",
      authorAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      date: "2026-01-08",
      priority: "normal",
      isPinned: false,
    },
    {
      id: "a3",
      organizationId: DEFAULT_ORG_ID,
      title: "Building Fund Update",
      content: "Great news! We've reached 75% of our building fund goal. Thank you for your generous contributions towards our new community center.",
      author: "David Park",
      authorRole: "Finance Team",
      authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      date: "2026-01-07",
      priority: "normal",
      isPinned: false,
    },
    {
      id: "a4",
      organizationId: DEFAULT_ORG_ID,
      title: "Worship Team Auditions",
      content: "We're looking for talented musicians and vocalists to join our worship team. Auditions will be held on January 20th. Contact the worship leader for more info.",
      author: "James Wilson",
      authorRole: "Worship Leader",
      authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      date: "2026-01-06",
      ministryId: "m1",
      ministryName: "Worship Team",
      priority: "normal",
      isPinned: false,
    },
  ],
  conversations: [
    {
      id: "c-m1",
      organizationId: DEFAULT_ORG_ID,
      name: "Worship Team",
      avatar: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=150&h=150&fit=crop",
      lastMessage: "Don't forget practice is at 6 PM tonight!",
      lastMessageTime: "10:32 AM",
      unreadCount: 3,
      isGroup: true,
      type: "ministry" as const,
      members: ["James Wilson", "Emily Brown", "Sarah Johnson", "+8 others"],
      ministryId: "m1",
      ministryColor: "#0F766E",
    },
    {
      id: "c-m2",
      organizationId: DEFAULT_ORG_ID,
      name: "Youth Ministry",
      avatar: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&h=150&fit=crop",
      lastMessage: "Who can help with setup for Friday?",
      lastMessageTime: "Yesterday",
      unreadCount: 5,
      isGroup: true,
      type: "ministry" as const,
      members: ["Marcus Lee", "Jessica Taylor", "Sarah Johnson", "+4 others"],
      ministryId: "m2",
      ministryColor: "#F59E0B",
    },
    {
      id: "c-m3",
      organizationId: DEFAULT_ORG_ID,
      name: "Outreach",
      avatar: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=150&h=150&fit=crop",
      lastMessage: "We have 50 volunteers signed up so far",
      lastMessageTime: "Monday",
      unreadCount: 0,
      isGroup: true,
      type: "ministry" as const,
      members: ["David Park", "Maria Garcia", "Sarah Johnson", "+12 others"],
      ministryId: "m3",
      ministryColor: "#10B981",
    },
    {
      id: "c-m4",
      organizationId: DEFAULT_ORG_ID,
      name: "Children's Ministry",
      avatar: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=150&h=150&fit=crop",
      lastMessage: "Sunday school materials are ready!",
      lastMessageTime: "Tuesday",
      unreadCount: 2,
      isGroup: true,
      type: "ministry" as const,
      members: ["Emily Brown", "Rachel Kim", "+6 others"],
      ministryId: "m4",
      ministryColor: "#EC4899",
    },
    {
      id: "c-m5",
      organizationId: DEFAULT_ORG_ID,
      name: "Prayer Team",
      avatar: "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=150&h=150&fit=crop",
      lastMessage: "Prayer meeting moved to 7 PM",
      lastMessageTime: "Wednesday",
      unreadCount: 0,
      isGroup: true,
      type: "ministry" as const,
      members: ["Pastor Michael", "David Park", "+8 others"],
      ministryId: "m5",
      ministryColor: "#6366F1",
    },
    {
      id: "c-m6",
      organizationId: DEFAULT_ORG_ID,
      name: "Media & Tech",
      avatar: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=150&h=150&fit=crop",
      lastMessage: "New streaming software is installed",
      lastMessageTime: "Thursday",
      unreadCount: 1,
      isGroup: true,
      type: "ministry" as const,
      members: ["Alex Chen", "Mike Johnson", "+4 others"],
      ministryId: "m6",
      ministryColor: "#3B82F6",
    },
  ],
  messages: [],
  workflowRequests: [],
  notifications: [],
  songs: [
    {
      id: "song1",
      organizationId: DEFAULT_ORG_ID,
      title: "Amazing Grace",
      artist: "Traditional Hymn",
      createdBy: "u3",
      createdAt: "2025-12-01T00:00:00Z",
      updatedAt: "2025-12-01T00:00:00Z",
      coverImage: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=400&fit=crop",
      duration: 245,
    },
    {
      id: "song2",
      organizationId: DEFAULT_ORG_ID,
      title: "How Great Is Our God",
      artist: "Chris Tomlin",
      createdBy: "u3",
      createdAt: "2025-12-05T00:00:00Z",
      updatedAt: "2025-12-05T00:00:00Z",
      coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
      duration: 312,
    },
    {
      id: "song3",
      organizationId: DEFAULT_ORG_ID,
      title: "Oceans (Where Feet May Fail)",
      artist: "Hillsong United",
      createdBy: "u3",
      createdAt: "2025-12-10T00:00:00Z",
      updatedAt: "2025-12-10T00:00:00Z",
      coverImage: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
      duration: 428,
    },
    {
      id: "song4",
      organizationId: DEFAULT_ORG_ID,
      title: "10,000 Reasons (Bless the Lord)",
      artist: "Matt Redman",
      createdBy: "u3",
      createdAt: "2025-12-15T00:00:00Z",
      updatedAt: "2025-12-15T00:00:00Z",
      coverImage: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=400&fit=crop",
      duration: 334,
    },
  ],
  audioParts: [
    { id: "ap1", songId: "song1", vocalPart: "soprano", audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", duration: 245 },
    { id: "ap2", songId: "song1", vocalPart: "alto", audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", duration: 245 },
    { id: "ap3", songId: "song1", vocalPart: "tenor", audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", duration: 245 },
    { id: "ap4", songId: "song1", vocalPart: "bass", audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", duration: 245 },
    { id: "ap5", songId: "song1", vocalPart: "full", audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", duration: 245 },
    { id: "ap6", songId: "song2", vocalPart: "soprano", audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", duration: 312 },
    { id: "ap7", songId: "song2", vocalPart: "alto", audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", duration: 312 },
    { id: "ap8", songId: "song2", vocalPart: "tenor", audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", duration: 312 },
    { id: "ap9", songId: "song2", vocalPart: "bass", audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", duration: 312 },
    { id: "ap10", songId: "song2", vocalPart: "full", audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", duration: 312 },
    { id: "ap11", songId: "song3", vocalPart: "full", audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", duration: 428 },
    { id: "ap12", songId: "song4", vocalPart: "full", audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3", duration: 334 },
  ],
  lyrics: [
    { id: "l1", songId: "song1", lineText: "Amazing grace, how sweet the sound", startTime: 0, endTime: 8, order: 1 },
    { id: "l2", songId: "song1", lineText: "That saved a wretch like me", startTime: 8, endTime: 16, order: 2 },
    { id: "l3", songId: "song1", lineText: "I once was lost, but now am found", startTime: 16, endTime: 24, order: 3 },
    { id: "l4", songId: "song1", lineText: "Was blind, but now I see", startTime: 24, endTime: 32, order: 4 },
    { id: "l5", songId: "song1", lineText: "'Twas grace that taught my heart to fear", startTime: 32, endTime: 40, order: 5 },
    { id: "l6", songId: "song1", lineText: "And grace my fears relieved", startTime: 40, endTime: 48, order: 6 },
    { id: "l7", songId: "song1", lineText: "How precious did that grace appear", startTime: 48, endTime: 56, order: 7 },
    { id: "l8", songId: "song1", lineText: "The hour I first believed", startTime: 56, endTime: 64, order: 8 },
    { id: "l9", songId: "song2", lineText: "The splendor of the King", startTime: 0, endTime: 6, order: 1 },
    { id: "l10", songId: "song2", lineText: "Clothed in majesty", startTime: 6, endTime: 12, order: 2 },
    { id: "l11", songId: "song2", lineText: "Let all the earth rejoice", startTime: 12, endTime: 18, order: 3 },
    { id: "l12", songId: "song2", lineText: "All the earth rejoice", startTime: 18, endTime: 24, order: 4 },
    { id: "l13", songId: "song2", lineText: "He wraps Himself in light", startTime: 24, endTime: 30, order: 5 },
    { id: "l14", songId: "song2", lineText: "And darkness tries to hide", startTime: 30, endTime: 36, order: 6 },
    { id: "l15", songId: "song2", lineText: "And trembles at His voice", startTime: 36, endTime: 42, order: 7 },
    { id: "l16", songId: "song2", lineText: "Trembles at His voice", startTime: 42, endTime: 48, order: 8 },
    { id: "l17", songId: "song2", lineText: "How great is our God, sing with me", startTime: 48, endTime: 56, order: 9 },
    { id: "l18", songId: "song2", lineText: "How great is our God, and all will see", startTime: 56, endTime: 64, order: 10 },
    { id: "l19", songId: "song2", lineText: "How great, how great is our God", startTime: 64, endTime: 72, order: 11 },
    { id: "l20", songId: "song3", lineText: "You call me out upon the waters", startTime: 0, endTime: 8, order: 1 },
    { id: "l21", songId: "song3", lineText: "The great unknown where feet may fail", startTime: 8, endTime: 16, order: 2 },
    { id: "l22", songId: "song3", lineText: "And there I find You in the mystery", startTime: 16, endTime: 24, order: 3 },
    { id: "l23", songId: "song3", lineText: "In oceans deep, my faith will stand", startTime: 24, endTime: 32, order: 4 },
    { id: "l24", songId: "song3", lineText: "And I will call upon Your name", startTime: 32, endTime: 40, order: 5 },
    { id: "l25", songId: "song3", lineText: "And keep my eyes above the waves", startTime: 40, endTime: 48, order: 6 },
    { id: "l26", songId: "song3", lineText: "When oceans rise, my soul will rest", startTime: 48, endTime: 56, order: 7 },
    { id: "l27", songId: "song3", lineText: "In Your embrace, for I am Yours", startTime: 56, endTime: 64, order: 8 },
    { id: "l28", songId: "song3", lineText: "And You are mine", startTime: 64, endTime: 72, order: 9 },
    { id: "l29", songId: "song4", lineText: "Bless the Lord, O my soul", startTime: 0, endTime: 6, order: 1 },
    { id: "l30", songId: "song4", lineText: "O my soul, worship His holy name", startTime: 6, endTime: 14, order: 2 },
    { id: "l31", songId: "song4", lineText: "Sing like never before, O my soul", startTime: 14, endTime: 22, order: 3 },
    { id: "l32", songId: "song4", lineText: "I'll worship Your holy name", startTime: 22, endTime: 30, order: 4 },
    { id: "l33", songId: "song4", lineText: "The sun comes up, it's a new day dawning", startTime: 30, endTime: 38, order: 5 },
    { id: "l34", songId: "song4", lineText: "It's time to sing Your song again", startTime: 38, endTime: 46, order: 6 },
    { id: "l35", songId: "song4", lineText: "Whatever may pass and whatever lies before me", startTime: 46, endTime: 54, order: 7 },
    { id: "l36", songId: "song4", lineText: "Let me be singing when the evening comes", startTime: 54, endTime: 62, order: 8 },
  ],
  reportedContent: [
    {
      id: "rc1",
      organizationId: DEFAULT_ORG_ID,
      contentType: "comment",
      contentId: "c1",
      content: "This is inappropriate content that was reported.",
      reporterId: "u4",
      reporterName: "Lisa Chen",
      reason: "Inappropriate language",
      status: "pending",
      authorId: "u1",
      authorName: "Sarah Johnson",
      createdAt: "2026-01-08T10:30:00Z",
    },
    {
      id: "rc2",
      organizationId: DEFAULT_ORG_ID,
      contentType: "post",
      contentId: "p1",
      content: "Spam post with promotional links.",
      reporterId: "u3",
      reporterName: "James Wilson",
      reason: "Spam",
      status: "pending",
      authorId: "u4",
      authorName: "Lisa Chen",
      createdAt: "2026-01-07T14:20:00Z",
    },
  ],
  activityLogs: [
    {
      id: "al1",
      organizationId: DEFAULT_ORG_ID,
      userId: "u2",
      userName: "Pastor Michael",
      action: "user_created",
      details: "Created new user account for Lisa Chen",
      createdAt: "2026-01-09T08:00:00Z",
    },
    {
      id: "al2",
      organizationId: DEFAULT_ORG_ID,
      userId: "u3",
      userName: "James Wilson",
      action: "event_created",
      details: "Created event: Tech Training Workshop",
      createdAt: "2026-01-08T15:30:00Z",
    },
    {
      id: "al3",
      organizationId: DEFAULT_ORG_ID,
      userId: "u2",
      userName: "Pastor Michael",
      action: "role_updated",
      details: "Updated James Wilson role to admin",
      createdAt: "2026-01-07T11:00:00Z",
    },
  ],
  invitations: [],
};

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}


