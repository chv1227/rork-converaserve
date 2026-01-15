import { Ministry, MinistryMember, DiscussionPost, PrayerRequest, MinistryEvent, MinistryAnnouncement } from '@/types';

const DEFAULT_ORG_ID = "org1";

export const defaultMinistries: Ministry[] = [
  {
    id: 'worship-ministry',
    organizationId: DEFAULT_ORG_ID,
    name: 'Worship Ministry',
    description: 'Leading the congregation in praise and worship through music, song, and creative expression. We prepare hearts for the Word and create an atmosphere of reverence and joy.',
    color: '#6366F1',
    icon: 'Music',
    memberCount: 28,
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
  },
  {
    id: 'prayer-ministry',
    organizationId: DEFAULT_ORG_ID,
    name: 'Prayer Ministry',
    description: 'Interceding for our church family, community, and world. We believe in the power of prayer to transform lives and circumstances.',
    color: '#8B5CF6',
    icon: 'Heart',
    memberCount: 35,
    image: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=400&h=300&fit=crop',
  },
  {
    id: 'deacon-board',
    organizationId: DEFAULT_ORG_ID,
    name: 'Deacon Board',
    description: 'Serving the practical needs of our congregation and supporting pastoral leadership. We handle church administration, benevolence, and community outreach.',
    color: '#0EA5E9',
    icon: 'Users',
    memberCount: 12,
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop',
  },
  {
    id: 'childrens-ministry',
    organizationId: DEFAULT_ORG_ID,
    name: "Children's Ministry",
    description: 'Nurturing young hearts with biblical teachings, creative activities, and loving care. Building a foundation of faith for the next generation.',
    color: '#F59E0B',
    icon: 'Sparkles',
    memberCount: 22,
    image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop',
  },
];

export const ministryMembers: Record<string, MinistryMember[]> = {
  'worship-ministry': [
    { id: 'wm1', name: 'James Wilson', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', role: 'leader', joinedAt: '2023-01-15', email: 'james@church.org' },
    { id: 'wm2', name: 'Emily Brown', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face', role: 'admin', joinedAt: '2023-03-20' },
    { id: 'wm3', name: 'Michael Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', role: 'member', joinedAt: '2023-05-10' },
    { id: 'wm4', name: 'Sarah Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', role: 'member', joinedAt: '2023-06-01' },
    { id: 'wm5', name: 'David Martinez', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', role: 'member', joinedAt: '2023-07-15' },
    { id: 'wm6', name: 'Lisa Thompson', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face', role: 'member', joinedAt: '2023-08-20' },
  ],
  'prayer-ministry': [
    { id: 'pm1', name: 'Martha Johnson', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face', role: 'leader', joinedAt: '2022-11-01', email: 'martha@church.org' },
    { id: 'pm2', name: 'Robert Anderson', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face', role: 'admin', joinedAt: '2023-01-10' },
    { id: 'pm3', name: 'Grace Lee', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face', role: 'member', joinedAt: '2023-02-15' },
    { id: 'pm4', name: 'Thomas White', avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face', role: 'member', joinedAt: '2023-04-01' },
    { id: 'pm5', name: 'Rachel Garcia', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop&crop=face', role: 'member', joinedAt: '2023-05-20' },
  ],
  'deacon-board': [
    { id: 'db1', name: 'William Harris', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face', role: 'leader', joinedAt: '2021-06-01', email: 'william@church.org' },
    { id: 'db2', name: 'Patricia Moore', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face', role: 'admin', joinedAt: '2022-01-15' },
    { id: 'db3', name: 'Charles Taylor', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face', role: 'member', joinedAt: '2022-08-10' },
    { id: 'db4', name: 'Barbara Jackson', avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&h=150&fit=crop&crop=face', role: 'member', joinedAt: '2023-02-01' },
  ],
  'childrens-ministry': [
    { id: 'cm1', name: 'Jennifer Scott', avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150&h=150&fit=crop&crop=face', role: 'leader', joinedAt: '2022-09-01', email: 'jennifer@church.org' },
    { id: 'cm2', name: 'Kevin Brown', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop&crop=face', role: 'admin', joinedAt: '2023-01-05' },
    { id: 'cm3', name: 'Amanda Wilson', avatar: 'https://images.unsplash.com/photo-1557862921-37829c790f19?w=150&h=150&fit=crop&crop=face', role: 'member', joinedAt: '2023-03-15' },
    { id: 'cm4', name: 'Daniel Kim', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop&crop=face', role: 'member', joinedAt: '2023-06-20' },
    { id: 'cm5', name: 'Michelle Adams', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face', role: 'member', joinedAt: '2023-08-01' },
  ],
};

export const discussionPosts: Record<string, DiscussionPost[]> = {
  'worship-ministry': [
    { id: 'wd1', ministryId: 'worship-ministry', authorId: 'wm1', authorName: 'James Wilson', authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', authorRole: 'leader', title: 'New Song Set for Sunday', content: 'Hey team! I\'ve put together the song set for this Sunday. Please check the shared folder and start practicing. Let me know if you have any questions!', createdAt: '2026-01-13T10:30:00Z', likesCount: 12, commentsCount: 8, isPinned: true },
    { id: 'wd2', ministryId: 'worship-ministry', authorId: 'wm2', authorName: 'Emily Brown', authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face', authorRole: 'admin', title: 'Vocal Practice Tips', content: 'Sharing some helpful vocal warm-up exercises for our singers. These have really helped me prepare before services.', createdAt: '2026-01-12T14:20:00Z', likesCount: 8, commentsCount: 5, isPinned: false },
    { id: 'wd3', ministryId: 'worship-ministry', authorId: 'wm3', authorName: 'Michael Chen', authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', authorRole: 'member', title: 'Equipment Check Schedule', content: 'Reminder: We need volunteers to help with equipment setup before Saturday practice. Who\'s available?', createdAt: '2026-01-11T09:00:00Z', likesCount: 5, commentsCount: 12, isPinned: false },
  ],
  'prayer-ministry': [
    { id: 'pd1', ministryId: 'prayer-ministry', authorId: 'pm1', authorName: 'Martha Johnson', authorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face', authorRole: 'leader', title: 'Prayer Focus for January', content: 'This month we\'re focusing on praying for our community outreach efforts and the families in need. Please join us every Wednesday evening.', createdAt: '2026-01-10T08:00:00Z', likesCount: 25, commentsCount: 15, isPinned: true },
    { id: 'pd2', ministryId: 'prayer-ministry', authorId: 'pm2', authorName: 'Robert Anderson', authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face', authorRole: 'admin', title: 'Answered Prayer Testimonies', content: 'Let\'s share testimonies of answered prayers! Comment below with your stories of God\'s faithfulness.', createdAt: '2026-01-09T16:30:00Z', likesCount: 18, commentsCount: 22, isPinned: false },
  ],
  'deacon-board': [
    { id: 'dd1', ministryId: 'deacon-board', authorId: 'db1', authorName: 'William Harris', authorAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face', authorRole: 'leader', title: 'Monthly Meeting Minutes', content: 'The minutes from our January meeting are now available. Key items: building fund update, community service schedule, and benevolence requests.', createdAt: '2026-01-12T11:00:00Z', likesCount: 6, commentsCount: 3, isPinned: true },
    { id: 'dd2', ministryId: 'deacon-board', authorId: 'db2', authorName: 'Patricia Moore', authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face', authorRole: 'admin', title: 'Volunteer Coordination', content: 'We need additional volunteers for the food pantry next Saturday. Please sign up if you\'re available to help.', createdAt: '2026-01-11T15:00:00Z', likesCount: 4, commentsCount: 8, isPinned: false },
  ],
  'childrens-ministry': [
    { id: 'cd1', ministryId: 'childrens-ministry', authorId: 'cm1', authorName: 'Jennifer Scott', authorAvatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150&h=150&fit=crop&crop=face', authorRole: 'leader', title: 'Curriculum Update for February', content: 'Exciting news! Our new curriculum "Heroes of Faith" starts next month. Training session this Saturday for all teachers.', createdAt: '2026-01-13T09:00:00Z', likesCount: 14, commentsCount: 10, isPinned: true },
    { id: 'cd2', ministryId: 'childrens-ministry', authorId: 'cm2', authorName: 'Kevin Brown', authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop&crop=face', authorRole: 'admin', title: 'Supply Drive Success!', content: 'Thank you everyone who donated supplies! We now have everything needed for our arts & crafts activities through March.', createdAt: '2026-01-10T13:00:00Z', likesCount: 20, commentsCount: 7, isPinned: false },
  ],
};

export const prayerRequests: Record<string, PrayerRequest[]> = {
  'worship-ministry': [
    { id: 'wp1', ministryId: 'worship-ministry', authorId: 'wm4', authorName: 'Sarah Davis', authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', title: 'Healing for family member', content: 'Please pray for my mother who is having surgery next week. Praying for successful surgery and quick recovery.', createdAt: '2026-01-13T08:00:00Z', prayerCount: 15, isAnonymous: false, isAnswered: false },
    { id: 'wp2', ministryId: 'worship-ministry', authorId: 'wm5', authorName: 'Anonymous', authorAvatar: '', title: 'Guidance needed', content: 'Facing a difficult decision about career change. Please pray for wisdom and clear direction.', createdAt: '2026-01-12T20:00:00Z', prayerCount: 8, isAnonymous: true, isAnswered: false },
  ],
  'prayer-ministry': [
    { id: 'pp1', ministryId: 'prayer-ministry', authorId: 'pm3', authorName: 'Grace Lee', authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face', title: 'Community outreach', content: 'Pray that our upcoming community outreach event touches many hearts and brings people closer to God.', createdAt: '2026-01-13T07:00:00Z', prayerCount: 28, isAnonymous: false, isAnswered: false },
    { id: 'pp2', ministryId: 'prayer-ministry', authorId: 'pm4', authorName: 'Thomas White', authorAvatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face', title: 'New job opportunity', content: 'Praise report: Got the job I was praying for! Thank you all for your prayers.', createdAt: '2026-01-11T10:00:00Z', prayerCount: 35, isAnonymous: false, isAnswered: true },
    { id: 'pp3', ministryId: 'prayer-ministry', authorId: 'pm5', authorName: 'Rachel Garcia', authorAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop&crop=face', title: 'Family restoration', content: 'Please pray for reconciliation in my extended family. We\'ve been estranged for years.', createdAt: '2026-01-10T18:00:00Z', prayerCount: 22, isAnonymous: false, isAnswered: false },
  ],
  'deacon-board': [
    { id: 'dp1', ministryId: 'deacon-board', authorId: 'db3', authorName: 'Charles Taylor', authorAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face', title: 'Building fund goal', content: 'Pray that we reach our building fund goal by Easter. We\'re at 75% and trusting God for the rest.', createdAt: '2026-01-12T09:00:00Z', prayerCount: 18, isAnonymous: false, isAnswered: false },
  ],
  'childrens-ministry': [
    { id: 'cp1', ministryId: 'childrens-ministry', authorId: 'cm3', authorName: 'Amanda Wilson', authorAvatar: 'https://images.unsplash.com/photo-1557862921-37829c790f19?w=150&h=150&fit=crop&crop=face', title: 'For the children', content: 'Pray that the children in our ministry develop a strong foundation of faith that lasts a lifetime.', createdAt: '2026-01-13T06:00:00Z', prayerCount: 32, isAnonymous: false, isAnswered: false },
    { id: 'cp2', ministryId: 'childrens-ministry', authorId: 'cm4', authorName: 'Daniel Kim', authorAvatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop&crop=face', title: 'More volunteers needed', content: 'Praying for more volunteers to join our team. We have growing numbers and need extra hands!', createdAt: '2026-01-11T14:00:00Z', prayerCount: 15, isAnonymous: false, isAnswered: false },
  ],
};

export const ministryEvents: Record<string, MinistryEvent[]> = {
  'worship-ministry': [
    { id: 'we1', ministryId: 'worship-ministry', title: 'Weekly Practice', description: 'Regular worship team practice and preparation for Sunday service', date: '2026-01-18', time: '6:00 PM', location: 'Sanctuary', attendeesCount: 18, isRecurring: true, recurrencePattern: 'Every Saturday' },
    { id: 'we2', ministryId: 'worship-ministry', title: 'Worship Night', description: 'Special evening of extended worship and prayer', date: '2026-01-25', time: '7:00 PM', location: 'Main Sanctuary', attendeesCount: 45, maxAttendees: 100, isRecurring: false },
    { id: 'we3', ministryId: 'worship-ministry', title: 'New Song Workshop', description: 'Learning new songs for the spring season', date: '2026-02-01', time: '10:00 AM', location: 'Music Room', attendeesCount: 12, isRecurring: false },
  ],
  'prayer-ministry': [
    { id: 'pe1', ministryId: 'prayer-ministry', title: 'Wednesday Prayer Meeting', description: 'Corporate prayer for the church and community', date: '2026-01-15', time: '7:00 PM', location: 'Chapel', attendeesCount: 25, isRecurring: true, recurrencePattern: 'Every Wednesday' },
    { id: 'pe2', ministryId: 'prayer-ministry', title: 'Day of Fasting & Prayer', description: 'Dedicated day of seeking God together', date: '2026-01-20', time: '6:00 AM', location: 'Church Campus', attendeesCount: 40, isRecurring: false },
    { id: 'pe3', ministryId: 'prayer-ministry', title: 'Prayer Walk', description: 'Walking and praying through our neighborhood', date: '2026-01-27', time: '9:00 AM', location: 'Church Parking Lot', attendeesCount: 15, isRecurring: false },
  ],
  'deacon-board': [
    { id: 'de1', ministryId: 'deacon-board', title: 'Monthly Board Meeting', description: 'Regular deacon board meeting', date: '2026-01-21', time: '6:30 PM', location: 'Conference Room', attendeesCount: 10, isRecurring: true, recurrencePattern: 'Third Tuesday of each month' },
    { id: 'de2', ministryId: 'deacon-board', title: 'Community Service Day', description: 'Serving at the local food bank', date: '2026-01-25', time: '8:00 AM', location: 'City Food Bank', attendeesCount: 20, maxAttendees: 30, isRecurring: false },
    { id: 'de3', ministryId: 'deacon-board', title: 'Benevolence Fund Review', description: 'Quarterly review of benevolence requests', date: '2026-02-04', time: '7:00 PM', location: 'Conference Room', attendeesCount: 8, isRecurring: false },
  ],
  'childrens-ministry': [
    { id: 'ce1', ministryId: 'childrens-ministry', title: 'Sunday School', description: 'Weekly children\'s Bible study and activities', date: '2026-01-19', time: '9:00 AM', location: 'Children\'s Wing', attendeesCount: 35, isRecurring: true, recurrencePattern: 'Every Sunday' },
    { id: 'ce2', ministryId: 'childrens-ministry', title: 'Teacher Training', description: 'Training session for new curriculum', date: '2026-01-18', time: '10:00 AM', location: 'Room 201', attendeesCount: 12, isRecurring: false },
    { id: 'ce3', ministryId: 'childrens-ministry', title: 'Family Fun Night', description: 'Games, snacks, and fellowship for families', date: '2026-01-31', time: '5:30 PM', location: 'Fellowship Hall', attendeesCount: 60, maxAttendees: 80, isRecurring: false },
  ],
};

export const ministryAnnouncements: Record<string, MinistryAnnouncement[]> = {
  'worship-ministry': [
    { id: 'wa1', ministryId: 'worship-ministry', authorId: 'wm1', authorName: 'James Wilson', authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', authorRole: 'leader', title: 'Easter Musical Auditions', content: 'Auditions for our Easter musical will be held February 8th. All voice parts needed!', createdAt: '2026-01-13T12:00:00Z', priority: 'high' },
  ],
  'prayer-ministry': [
    { id: 'pa1', ministryId: 'prayer-ministry', authorId: 'pm1', authorName: 'Martha Johnson', authorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face', authorRole: 'leader', title: '40 Days of Prayer', content: 'Join us for 40 days of focused prayer starting February 1st. Sign up for your time slot!', createdAt: '2026-01-12T10:00:00Z', priority: 'high' },
  ],
  'deacon-board': [
    { id: 'da1', ministryId: 'deacon-board', authorId: 'db1', authorName: 'William Harris', authorAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face', authorRole: 'leader', title: 'Building Fund Update', content: 'Great news! We\'ve reached 78% of our building fund goal. Thank you for your generosity!', createdAt: '2026-01-11T08:00:00Z', priority: 'normal' },
  ],
  'childrens-ministry': [
    { id: 'ca1', ministryId: 'childrens-ministry', authorId: 'cm1', authorName: 'Jennifer Scott', authorAvatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150&h=150&fit=crop&crop=face', authorRole: 'leader', title: 'VBS Planning Kickoff', content: 'It\'s time to start planning for Vacation Bible School! Planning meeting on February 15th.', createdAt: '2026-01-10T14:00:00Z', priority: 'normal' },
  ],
};

export const getMinistryById = (id: string): Ministry | undefined => {
  return defaultMinistries.find(m => m.id === id);
};

export const getMembersForMinistry = (ministryId: string): MinistryMember[] => {
  return ministryMembers[ministryId] || [];
};

export const getDiscussionsForMinistry = (ministryId: string): DiscussionPost[] => {
  return discussionPosts[ministryId] || [];
};

export const getPrayerRequestsForMinistry = (ministryId: string): PrayerRequest[] => {
  return prayerRequests[ministryId] || [];
};

export const getEventsForMinistry = (ministryId: string): MinistryEvent[] => {
  return ministryEvents[ministryId] || [];
};

export const getAnnouncementsForMinistry = (ministryId: string): MinistryAnnouncement[] => {
  return ministryAnnouncements[ministryId] || [];
};
