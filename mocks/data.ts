import { Ministry, Event, Announcement, Conversation, User } from '@/types';

const DEFAULT_ORG_ID = "org1";

export const currentUser: User = {
  id: 'u1',
  name: 'Sarah Johnson',
  email: 'sarah.johnson@email.com',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
  role: 'Ministry Leader',
  ministries: ['m1', 'm2', 'm3'],
  phone: '+1 (555) 123-4567',
  joinedDate: 'March 2022',
};

export const ministries: Ministry[] = [
  {
    id: 'm1',
    organizationId: DEFAULT_ORG_ID,
    name: 'Worship Team',
    description: 'Leading the congregation in praise and worship through music and song.',
    color: '#0F766E',
    icon: 'Music',
    memberCount: 24,
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
  },
  {
    id: 'm2',
    organizationId: DEFAULT_ORG_ID,
    name: 'Youth Ministry',
    description: 'Empowering the next generation through faith, fellowship, and fun.',
    color: '#F59E0B',
    icon: 'Users',
    memberCount: 48,
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop',
  },
  {
    id: 'm3',
    organizationId: DEFAULT_ORG_ID,
    name: 'Outreach',
    description: 'Serving our community and spreading love beyond our walls.',
    color: '#10B981',
    icon: 'Heart',
    memberCount: 32,
    image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=300&fit=crop',
  },
  {
    id: 'm4',
    organizationId: DEFAULT_ORG_ID,
    name: 'Children\'s Ministry',
    description: 'Nurturing young hearts with biblical teachings and creative activities.',
    color: '#EC4899',
    icon: 'Baby',
    memberCount: 18,
    image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop',
  },
  {
    id: 'm5',
    organizationId: DEFAULT_ORG_ID,
    name: 'Prayer Team',
    description: 'Interceding for our church family and community needs.',
    color: '#6366F1',
    icon: 'HandHeart',
    memberCount: 15,
    image: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=400&h=300&fit=crop',
  },
  {
    id: 'm6',
    organizationId: DEFAULT_ORG_ID,
    name: 'Media & Tech',
    description: 'Bringing excellence to our digital presence and live productions.',
    color: '#3B82F6',
    icon: 'Video',
    memberCount: 12,
    image: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=300&fit=crop',
  },
];

export const events: Event[] = [
  {
    id: 'e1',
    organizationId: DEFAULT_ORG_ID,
    title: 'Sunday Worship Service',
    description: 'Join us for our weekly worship service with Pastor Michael.',
    date: '2026-01-12',
    time: '10:00 AM',
    location: 'Main Sanctuary',
    ministryId: 'm1',
    ministryName: 'Worship Team',
    color: '#0F766E',
    attendees: 150,
  },
  {
    id: 'e2',
    organizationId: DEFAULT_ORG_ID,
    title: 'Youth Night',
    description: 'Games, worship, and a powerful message for our youth.',
    date: '2026-01-14',
    time: '7:00 PM',
    location: 'Youth Center',
    ministryId: 'm2',
    ministryName: 'Youth Ministry',
    color: '#F59E0B',
    attendees: 45,
  },
  {
    id: 'e3',
    organizationId: DEFAULT_ORG_ID,
    title: 'Community Food Drive',
    description: 'Help us collect and distribute food to families in need.',
    date: '2026-01-17',
    time: '9:00 AM',
    location: 'Fellowship Hall',
    ministryId: 'm3',
    ministryName: 'Outreach',
    color: '#10B981',
    attendees: 28,
  },
  {
    id: 'e4',
    organizationId: DEFAULT_ORG_ID,
    title: 'Kids Sunday School',
    description: 'Fun-filled learning about Noah\'s Ark.',
    date: '2026-01-12',
    time: '10:00 AM',
    location: 'Children\'s Wing',
    ministryId: 'm4',
    ministryName: 'Children\'s Ministry',
    color: '#EC4899',
    attendees: 35,
  },
  {
    id: 'e5',
    organizationId: DEFAULT_ORG_ID,
    title: 'Prayer & Worship Night',
    description: 'An evening dedicated to prayer and intimate worship.',
    date: '2026-01-15',
    time: '7:00 PM',
    location: 'Chapel',
    ministryId: 'm5',
    ministryName: 'Prayer Team',
    color: '#6366F1',
    attendees: 40,
  },
  {
    id: 'e6',
    organizationId: DEFAULT_ORG_ID,
    title: 'Tech Training Workshop',
    description: 'Learn about our new streaming setup and sound equipment.',
    date: '2026-01-18',
    time: '2:00 PM',
    location: 'Media Room',
    ministryId: 'm6',
    ministryName: 'Media & Tech',
    color: '#3B82F6',
    attendees: 10,
  },
];

export const announcements: Announcement[] = [
  {
    id: 'a1',
    organizationId: DEFAULT_ORG_ID,
    title: 'New Series Starting Next Week',
    content: 'Join us as we begin our exciting new sermon series "Unshakeable Faith" starting next Sunday. Invite your friends and family!',
    author: 'Pastor Michael',
    authorRole: 'Senior Pastor',
    authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    date: '2026-01-09',
    priority: 'high',
    isPinned: true,
  },
  {
    id: 'a2',
    organizationId: DEFAULT_ORG_ID,
    title: 'Volunteer Appreciation Dinner',
    content: 'We want to honor all our incredible volunteers! Join us for a special dinner on January 25th at 6 PM in the Fellowship Hall.',
    author: 'Lisa Chen',
    authorRole: 'Volunteer Coordinator',
    authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    date: '2026-01-08',
    priority: 'normal',
    isPinned: false,
  },
  {
    id: 'a3',
    organizationId: DEFAULT_ORG_ID,
    title: 'Building Fund Update',
    content: 'Great news! We\'ve reached 75% of our building fund goal. Thank you for your generous contributions towards our new community center.',
    author: 'David Park',
    authorRole: 'Finance Team',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    date: '2026-01-07',
    priority: 'normal',
    isPinned: false,
  },
  {
    id: 'a4',
    organizationId: DEFAULT_ORG_ID,
    title: 'Worship Team Auditions',
    content: 'We\'re looking for talented musicians and vocalists to join our worship team. Auditions will be held on January 20th. Contact the worship leader for more info.',
    author: 'James Wilson',
    authorRole: 'Worship Leader',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    date: '2026-01-06',
    ministryId: 'm1',
    ministryName: 'Worship Team',
    priority: 'normal',
    isPinned: false,
  },
];

export const conversations: Conversation[] = [
  {
    id: 'c1',
    organizationId: DEFAULT_ORG_ID,
    name: 'Worship Team',
    avatar: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=150&h=150&fit=crop',
    lastMessage: 'Don\'t forget practice is at 6 PM tonight!',
    lastMessageTime: '10:32 AM',
    unreadCount: 3,
    isGroup: true,
    members: ['James Wilson', 'Emily Brown', 'Sarah Johnson', '+8 others'],
  },
  {
    id: 'c2',
    organizationId: DEFAULT_ORG_ID,
    name: 'Pastor Michael',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    lastMessage: 'That sounds great! Let\'s discuss tomorrow.',
    lastMessageTime: '9:15 AM',
    unreadCount: 0,
    isGroup: false,
  },
  {
    id: 'c3',
    organizationId: DEFAULT_ORG_ID,
    name: 'Youth Leaders',
    avatar: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&h=150&fit=crop',
    lastMessage: 'Who can help with setup for Friday?',
    lastMessageTime: 'Yesterday',
    unreadCount: 5,
    isGroup: true,
    members: ['Marcus Lee', 'Jessica Taylor', 'Sarah Johnson', '+4 others'],
  },
  {
    id: 'c4',
    organizationId: DEFAULT_ORG_ID,
    name: 'Lisa Chen',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    lastMessage: 'Thanks for your help with the event!',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    isGroup: false,
  },
  {
    id: 'c5',
    organizationId: DEFAULT_ORG_ID,
    name: 'Outreach Planning',
    avatar: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=150&h=150&fit=crop',
    lastMessage: 'We have 50 volunteers signed up so far',
    lastMessageTime: 'Monday',
    unreadCount: 0,
    isGroup: true,
    members: ['David Park', 'Maria Garcia', 'Sarah Johnson', '+12 others'],
  },
];

export const getUpcomingEvents = (limit?: number): Event[] => {
  const sorted = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  return limit ? sorted.slice(0, limit) : sorted;
};

export const getMinistryById = (id: string): Ministry | undefined => {
  return ministries.find(m => m.id === id);
};

export const getEventsByMinistry = (ministryId: string): Event[] => {
  return events.filter(e => e.ministryId === ministryId);
};

export const getTotalUnreadMessages = (): number => {
  return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
};
