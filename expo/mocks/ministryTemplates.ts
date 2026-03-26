export interface MinistryTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  missionStatement: string;
  icon: string;
  color: string;
  coverImage: string;
  defaultSchedule: {
    day: string;
    time: string;
    frequency: string;
  }[];
  suggestedSections: string[];
  targetAudience: string;
  keywords: string[];
}

export interface MinistryLeader {
  id: string;
  ministryId: string;
  userId: string;
  role: 'primary_leader' | 'co_leader';
  status: 'active' | 'pending' | 'transferred';
  invitedBy?: string;
  invitedAt?: string;
  acceptedAt?: string;
  transferDate?: string;
  notes?: string;
}

export interface LeadershipInvitation {
  id: string;
  ministryId: string;
  ministryName: string;
  inviterId: string;
  inviterName: string;
  inviteeId?: string;
  inviteeEmail: string;
  inviteeName?: string;
  role: 'primary_leader' | 'co_leader';
  transferType?: 'complete_handoff' | 'add_co_leader' | 'gradual_transition';
  scheduledTransferDate?: string;
  message?: string;
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  createdAt: string;
  respondedAt?: string;
}

export interface ActiveMinistry {
  id: string;
  templateId: string;
  organizationId: string;
  name: string;
  description: string;
  missionStatement: string;
  icon: string;
  color: string;
  coverImage: string;
  galleryImages: string[];
  schedule: {
    day: string;
    time: string;
    frequency: string;
    location?: string;
  }[];
  contactEmail?: string;
  contactPhone?: string;
  enabledSections: string[];
  customContent: Record<string, string>;
  status: 'draft' | 'published' | 'archived';
  memberCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export const MINISTRY_CATEGORIES = [
  'Children & Youth',
  'Adult Ministries',
  'Worship & Arts',
  'Outreach & Service',
  'Discipleship',
  'Fellowship',
  'Support & Care',
] as const;

export const MINISTRY_SECTIONS = [
  'mission_statement',
  'schedule',
  'contact',
  'gallery',
  'events',
  'resources',
  'leadership',
  'join_cta',
  'announcements',
  'testimonials',
] as const;

export const ministryTemplates: MinistryTemplate[] = [
  {
    id: 'childrens-ministry',
    name: "Children's Ministry",
    category: 'Children & Youth',
    description: 'Nurturing young hearts with biblical teachings, creative activities, and loving care. Building a foundation of faith for the next generation.',
    missionStatement: 'Our mission is to partner with families in raising the next generation of faithful disciples. We create engaging, age-appropriate environments where children discover God\'s love, learn biblical truth, and develop a personal relationship with Jesus Christ.',
    icon: 'Baby',
    color: '#EC4899',
    coverImage: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&h=400&fit=crop',
    defaultSchedule: [
      { day: 'Sunday', time: '9:00 AM', frequency: 'Weekly' },
      { day: 'Wednesday', time: '6:30 PM', frequency: 'Weekly' },
    ],
    suggestedSections: ['mission_statement', 'schedule', 'leadership', 'gallery', 'events', 'join_cta'],
    targetAudience: 'Children ages 0-12 and their families',
    keywords: ['kids', 'children', 'nursery', 'sunday school', 'vbs'],
  },
  {
    id: 'youth-ministry',
    name: 'Youth Ministry',
    category: 'Children & Youth',
    description: 'Empowering teenagers to grow in their faith through dynamic teaching, meaningful relationships, and engaging activities.',
    missionStatement: 'We exist to guide teenagers through the critical years of adolescence, equipping them with a strong biblical foundation and helping them develop authentic faith that will sustain them for a lifetime.',
    icon: 'Sparkles',
    color: '#3B82F6',
    coverImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop',
    defaultSchedule: [
      { day: 'Wednesday', time: '7:00 PM', frequency: 'Weekly' },
      { day: 'Sunday', time: '6:00 PM', frequency: 'Weekly' },
    ],
    suggestedSections: ['mission_statement', 'schedule', 'leadership', 'events', 'gallery', 'join_cta'],
    targetAudience: 'Students grades 6-12',
    keywords: ['teens', 'youth', 'students', 'high school', 'middle school'],
  },
  {
    id: 'worship-music',
    name: 'Worship & Music',
    category: 'Worship & Arts',
    description: 'Leading the congregation in praise and worship through music, song, and creative expression.',
    missionStatement: 'Our mission is to lead God\'s people into His presence through authentic worship, skillful musicianship, and heartfelt praise. We seek to glorify God, edify the church, and create an atmosphere where lives are transformed.',
    icon: 'Music',
    color: '#8B5CF6',
    coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop',
    defaultSchedule: [
      { day: 'Saturday', time: '6:00 PM', frequency: 'Weekly' },
      { day: 'Sunday', time: '7:30 AM', frequency: 'Weekly' },
    ],
    suggestedSections: ['mission_statement', 'schedule', 'leadership', 'resources', 'events', 'join_cta'],
    targetAudience: 'Musicians, singers, and tech volunteers',
    keywords: ['worship', 'music', 'choir', 'band', 'praise'],
  },
  {
    id: 'small-groups',
    name: 'Small Groups',
    category: 'Fellowship',
    description: 'Building authentic community through home-based Bible studies and fellowship gatherings.',
    missionStatement: 'We believe life change happens best in the context of relationships. Our small groups provide a place to connect, grow spiritually, and do life together in an intimate community setting.',
    icon: 'Users',
    color: '#10B981',
    coverImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop',
    defaultSchedule: [
      { day: 'Various', time: 'Evening', frequency: 'Weekly' },
    ],
    suggestedSections: ['mission_statement', 'schedule', 'leadership', 'resources', 'join_cta'],
    targetAudience: 'All adults seeking deeper community',
    keywords: ['small groups', 'bible study', 'community', 'fellowship', 'home groups'],
  },
  {
    id: 'outreach-missions',
    name: 'Outreach & Missions',
    category: 'Outreach & Service',
    description: 'Serving our local community and the world with the love of Christ through practical acts of service.',
    missionStatement: 'We are called to be the hands and feet of Jesus, sharing His love through tangible acts of service locally and globally. We partner with organizations and missionaries to make a lasting impact.',
    icon: 'Globe',
    color: '#14B8A6',
    coverImage: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&h=400&fit=crop',
    defaultSchedule: [
      { day: 'Saturday', time: '9:00 AM', frequency: 'Monthly' },
    ],
    suggestedSections: ['mission_statement', 'events', 'leadership', 'gallery', 'resources', 'join_cta'],
    targetAudience: 'Anyone passionate about serving others',
    keywords: ['outreach', 'missions', 'service', 'community', 'volunteer'],
  },
  {
    id: 'womens-ministry',
    name: "Women's Ministry",
    category: 'Adult Ministries',
    description: 'Empowering women to grow in faith, build meaningful friendships, and discover their God-given purpose.',
    missionStatement: 'We create a welcoming environment where women of all ages and stages can connect, grow spiritually, and support one another through life\'s journey.',
    icon: 'Heart',
    color: '#F472B6',
    coverImage: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&h=400&fit=crop',
    defaultSchedule: [
      { day: 'Tuesday', time: '10:00 AM', frequency: 'Weekly' },
      { day: 'Thursday', time: '7:00 PM', frequency: 'Bi-weekly' },
    ],
    suggestedSections: ['mission_statement', 'schedule', 'leadership', 'events', 'resources', 'join_cta'],
    targetAudience: 'Women of all ages',
    keywords: ['women', 'ladies', 'sisterhood', 'fellowship'],
  },
  {
    id: 'mens-ministry',
    name: "Men's Ministry",
    category: 'Adult Ministries',
    description: 'Equipping men to be spiritual leaders in their homes, workplaces, and communities.',
    missionStatement: 'We challenge men to become the godly leaders they were created to be through biblical teaching, accountability, and brotherhood.',
    icon: 'Shield',
    color: '#6366F1',
    coverImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&h=400&fit=crop',
    defaultSchedule: [
      { day: 'Saturday', time: '7:00 AM', frequency: 'Weekly' },
      { day: 'Thursday', time: '6:30 AM', frequency: 'Weekly' },
    ],
    suggestedSections: ['mission_statement', 'schedule', 'leadership', 'events', 'resources', 'join_cta'],
    targetAudience: 'Men of all ages',
    keywords: ['men', 'brotherhood', 'leadership', 'accountability'],
  },
  {
    id: 'seniors-ministry',
    name: 'Seniors Ministry',
    category: 'Adult Ministries',
    description: 'Celebrating and engaging our senior members with fellowship, Bible study, and meaningful activities.',
    missionStatement: 'We honor our senior members by providing opportunities for continued spiritual growth, meaningful fellowship, and purposeful service to the body of Christ.',
    icon: 'Star',
    color: '#A855F7',
    coverImage: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&h=400&fit=crop',
    defaultSchedule: [
      { day: 'Wednesday', time: '11:00 AM', frequency: 'Weekly' },
      { day: 'Friday', time: '10:00 AM', frequency: 'Monthly' },
    ],
    suggestedSections: ['mission_statement', 'schedule', 'leadership', 'events', 'gallery', 'join_cta'],
    targetAudience: 'Adults 55 and older',
    keywords: ['seniors', 'elderly', 'golden years', 'wisdom'],
  },
  {
    id: 'prayer-ministry',
    name: 'Prayer Ministry',
    category: 'Discipleship',
    description: 'Interceding for our church family, community, and world through dedicated prayer.',
    missionStatement: 'We believe prayer is the foundation of all spiritual transformation. Our mission is to cultivate a culture of prayer throughout our church family while equipping believers to develop deeper prayer lives.',
    icon: 'HandHeart',
    color: '#F59E0B',
    coverImage: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800&h=400&fit=crop',
    defaultSchedule: [
      { day: 'Wednesday', time: '7:00 PM', frequency: 'Weekly' },
      { day: 'Sunday', time: '8:00 AM', frequency: 'Weekly' },
    ],
    suggestedSections: ['mission_statement', 'schedule', 'leadership', 'resources', 'join_cta'],
    targetAudience: 'All members with a heart for prayer',
    keywords: ['prayer', 'intercession', 'spiritual warfare'],
  },
  {
    id: 'marriage-family',
    name: 'Marriage & Family',
    category: 'Support & Care',
    description: 'Strengthening marriages and equipping parents with biblical principles for healthy families.',
    missionStatement: 'We support families at every stage by providing resources, counseling, and community to help marriages thrive and children flourish in godly homes.',
    icon: 'Heart',
    color: '#E11D48',
    coverImage: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&h=400&fit=crop',
    defaultSchedule: [
      { day: 'Sunday', time: '5:00 PM', frequency: 'Monthly' },
      { day: 'Friday', time: '6:30 PM', frequency: 'Quarterly' },
    ],
    suggestedSections: ['mission_statement', 'schedule', 'leadership', 'events', 'resources', 'join_cta'],
    targetAudience: 'Married couples and families',
    keywords: ['marriage', 'family', 'parenting', 'couples'],
  },
  {
    id: 'young-adults',
    name: 'Young Adults',
    category: 'Adult Ministries',
    description: 'Connecting young professionals and college students in faith, community, and purpose.',
    missionStatement: 'We create a space for young adults navigating the unique challenges of this life stage to find community, grow in faith, and discover their calling.',
    icon: 'Zap',
    color: '#0EA5E9',
    coverImage: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=400&fit=crop',
    defaultSchedule: [
      { day: 'Thursday', time: '7:30 PM', frequency: 'Weekly' },
      { day: 'Sunday', time: '12:00 PM', frequency: 'Monthly' },
    ],
    suggestedSections: ['mission_statement', 'schedule', 'leadership', 'events', 'gallery', 'join_cta'],
    targetAudience: 'Ages 18-30',
    keywords: ['young adults', 'college', 'singles', 'twenties'],
  },
  {
    id: 'creative-arts',
    name: 'Creative Arts',
    category: 'Worship & Arts',
    description: 'Using visual arts, drama, dance, and media to express worship and share the gospel.',
    missionStatement: 'We believe creativity reflects our Creator. Through various artistic expressions, we enhance worship, communicate truth, and inspire hearts.',
    icon: 'Palette',
    color: '#06B6D4',
    coverImage: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=400&fit=crop',
    defaultSchedule: [
      { day: 'Saturday', time: '10:00 AM', frequency: 'Weekly' },
    ],
    suggestedSections: ['mission_statement', 'schedule', 'leadership', 'gallery', 'events', 'join_cta'],
    targetAudience: 'Artists, actors, dancers, and creatives',
    keywords: ['arts', 'drama', 'dance', 'media', 'creative'],
  },
  {
    id: 'hospitality-welcome',
    name: 'Hospitality & Welcome',
    category: 'Fellowship',
    description: 'Creating a warm and welcoming environment for all who enter our doors.',
    missionStatement: 'We strive to make every person feel valued and welcomed from the moment they arrive. First impressions matter, and we want everyone to experience the love of Christ.',
    icon: 'Coffee',
    color: '#F97316',
    coverImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=400&fit=crop',
    defaultSchedule: [
      { day: 'Sunday', time: '8:30 AM', frequency: 'Weekly' },
    ],
    suggestedSections: ['mission_statement', 'schedule', 'leadership', 'join_cta'],
    targetAudience: 'Friendly people who love to serve',
    keywords: ['hospitality', 'greeters', 'welcome', 'ushers'],
  },
  {
    id: 'sports-recreation',
    name: 'Sports & Recreation',
    category: 'Fellowship',
    description: 'Building community through athletic activities, fitness programs, and recreational events.',
    missionStatement: 'We use sports and recreation as a bridge to build relationships, promote wellness, and share the gospel in a fun, active environment.',
    icon: 'Trophy',
    color: '#84CC16',
    coverImage: 'https://images.unsplash.com/photo-1461896836934- voices-echoing?w=800&h=400&fit=crop',
    defaultSchedule: [
      { day: 'Saturday', time: '9:00 AM', frequency: 'Weekly' },
      { day: 'Tuesday', time: '6:30 PM', frequency: 'Weekly' },
    ],
    suggestedSections: ['mission_statement', 'schedule', 'leadership', 'events', 'gallery', 'join_cta'],
    targetAudience: 'All ages who enjoy sports and fitness',
    keywords: ['sports', 'recreation', 'fitness', 'basketball', 'soccer'],
  },
];

export const getTemplateById = (id: string): MinistryTemplate | undefined => {
  return ministryTemplates.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: string): MinistryTemplate[] => {
  return ministryTemplates.filter(t => t.category === category);
};

export const searchTemplates = (query: string): MinistryTemplate[] => {
  const loweredQuery = query.toLowerCase();
  return ministryTemplates.filter(t => 
    t.name.toLowerCase().includes(loweredQuery) ||
    t.description.toLowerCase().includes(loweredQuery) ||
    t.keywords.some(k => k.includes(loweredQuery)) ||
    t.category.toLowerCase().includes(loweredQuery)
  );
};
