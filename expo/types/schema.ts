// ============================================================================
// MULTI-TENANT CHURCH MANAGEMENT PLATFORM - DATABASE SCHEMA
// ============================================================================
// This schema supports multiple church organizations (tenants) with strict
// tenant isolation, multiple profile types, and scalable relationships.
// ============================================================================

// ============================================================================
// COMMON TYPES & ENUMS
// ============================================================================

export type TenantStatus = 'active' | 'suspended' | 'archived' | 'pending';
export type SubscriptionPlan = 'free' | 'basic' | 'professional' | 'enterprise';
export type AccountStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

// Tenant-scoped roles (per church organization)
export type TenantRole = 
  | 'super_admin'      // Platform-level admin (can manage all tenants)
  | 'owner'            // Church owner/primary admin
  | 'admin'            // Church administrator
  | 'pastor'           // Pastoral staff
  | 'staff'            // Church staff
  | 'volunteer'        // Active volunteer
  | 'member'           // Regular member
  | 'guest';           // Guest/visitor

export type ProfileType = 'admin' | 'pastor' | 'staff' | 'volunteer' | 'member';

// ============================================================================
// 1. GLOBAL ENTITIES (NOT TENANT-SCOPED)
// ============================================================================

/**
 * GLOBAL USER - Authentication identity (platform-wide)
 * Relationship: One user can belong to many tenants via TenantMembership
 */
export interface GlobalUser {
  id: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: string;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  
  // Basic identity
  firstName: string;
  lastName: string;
  displayName: string;
  avatar?: string;
  phone?: string;
  
  // Account status
  accountStatus: AccountStatus;
  lastLoginAt?: string;
  loginCount: number;
  failedLoginAttempts: number;
  lockedUntil?: string;
  
  // Platform-level flags
  isPlatformAdmin: boolean; // Super admin for entire platform
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt?: string; // Soft delete
}

/**
 * GLOBAL SESSION - Authentication sessions
 */
export interface GlobalSession {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  currentTenantId?: string; // Currently active tenant context
  expiresAt: string;
  createdAt: string;
  lastActivityAt: string;
}

/**
 * PLATFORM SETTINGS - Global system configuration
 */
export interface PlatformSettings {
  id: string;
  key: string;
  value: string;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  isPublic: boolean;
  updatedBy?: string;
  updatedAt: string;
}

/**
 * PLATFORM AUDIT LOG - System-wide audit trail
 */
export interface PlatformAuditLog {
  id: string;
  tenantId?: string; // Optional - null for platform-level actions
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  previousValue?: string; // JSON stringified
  newValue?: string; // JSON stringified
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ============================================================================
// 2. TENANT (CHURCH ORGANIZATION) ENTITIES
// ============================================================================

/**
 * ADDRESS - Structured address for organizations
 */
export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

/**
 * CONTACT INFO - Contact details for organizations
 */
export interface ContactInfo {
  primaryEmail: string;
  secondaryEmail?: string;
  primaryPhone: string;
  secondaryPhone?: string;
  fax?: string;
  website?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
    tiktok?: string;
  };
}

/**
 * TENANT (CHURCH ORGANIZATION) - Primary tenant entity
 * All tenant-specific data references this via tenantId
 */
export interface Tenant {
  id: string;
  
  // Basic info
  name: string;
  legalName?: string;
  description?: string;
  shortDescription?: string;
  
  // Branding
  logo?: string;
  bannerImage?: string;
  primaryColor?: string;
  secondaryColor?: string;
  
  // Location & Contact
  address: Address;
  mailingAddress?: Address;
  contactInfo: ContactInfo;
  timezone: string;
  
  // Classification
  denomination?: string;
  affiliation?: string;
  churchSize?: 'small' | 'medium' | 'large' | 'mega';
  foundedYear?: number;
  
  // Subscription & Billing
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: 'active' | 'past_due' | 'cancelled' | 'trialing';
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  billingEmail?: string;
  stripeCustomerId?: string;
  
  // Status
  status: TenantStatus;
  isVerified: boolean;
  verifiedAt?: string;
  
  // Ownership
  ownerId: string; // GlobalUser.id - primary admin
  
  // Settings
  settings: TenantSettings;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt?: string; // Soft delete
}

/**
 * TENANT SETTINGS - Configuration per tenant
 */
export interface TenantSettings {
  // Visibility
  isPublic: boolean;
  allowPublicMemberDirectory: boolean;
  requireApprovalToJoin: boolean;
  
  // Features enabled
  modulesEnabled: {
    events: boolean;
    announcements: boolean;
    donations: boolean;
    media: boolean;
    ministries: boolean;
    messaging: boolean;
    groups: boolean;
    attendance: boolean;
    checkIn: boolean;
    prayerRequests: boolean;
    sermons: boolean;
    worship: boolean;
  };
  
  // Notification preferences
  notificationPreferences: {
    newMembers: boolean;
    events: boolean;
    announcements: boolean;
    donations: boolean;
    prayerRequests: boolean;
  };
  
  // Custom fields
  customMemberFields?: CustomFieldDefinition[];
}

/**
 * CUSTOM FIELD DEFINITION - For extensible profiles
 */
export interface CustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'email' | 'phone';
  options?: string[]; // For select/multiselect
  isRequired: boolean;
  isVisible: boolean;
  order: number;
}

/**
 * TENANT FEATURE FLAGS - Per-tenant feature toggles
 */
export interface TenantFeatureFlag {
  id: string;
  tenantId: string;
  featureKey: string;
  isEnabled: boolean;
  configuration?: Record<string, unknown>;
  enabledBy?: string;
  enabledAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * TENANT USAGE METRICS - Track usage per tenant
 */
export interface TenantUsageMetrics {
  id: string;
  tenantId: string;
  period: string; // YYYY-MM format
  
  // Counts
  totalMembers: number;
  activeMembers: number;
  newMembers: number;
  totalEvents: number;
  totalAnnouncements: number;
  totalMessages: number;
  totalDonations: number;
  donationAmount: number;
  
  // Storage
  storageUsedBytes: number;
  
  // Engagement
  avgWeeklyActiveUsers: number;
  eventAttendanceRate: number;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 3. USER-TENANT RELATIONSHIP & PROFILES
// ============================================================================

/**
 * TENANT MEMBERSHIP - Links users to tenants with roles
 * Relationship: Many-to-many between GlobalUser and Tenant
 */
export interface TenantMembership {
  id: string;
  tenantId: string;
  userId: string;
  
  // Role & Permissions
  role: TenantRole;
  permissions?: string[]; // Override permissions
  
  // Status
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  
  // Membership details
  memberNumber?: string; // Church-assigned member ID
  joinedAt: string;
  invitedBy?: string;
  invitationId?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  leftAt?: string;
}

/**
 * BASE MEMBER PROFILE - Shared fields across all profile types
 */
export interface BaseMemberProfile {
  id: string;
  tenantId: string;
  userId: string;
  membershipId: string;
  profileType: ProfileType;
  
  // Personal info
  firstName: string;
  lastName: string;
  middleName?: string;
  displayName: string;
  avatar?: string;
  
  // Contact
  email: string;
  phone?: string;
  alternatePhone?: string;
  address?: Address;
  
  // Demographics (optional)
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'separated';
  
  // Church-specific
  baptismDate?: string;
  memberSince?: string;
  salvationDate?: string;
  
  // Emergency contact
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  
  // Bio
  bio?: string;
  spiritualGifts?: string[];
  interests?: string[];
  skills?: string[];
  
  // Custom fields (key-value pairs)
  customFields?: Record<string, unknown>;
  
  // Privacy
  isProfilePublic: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * ADMIN PROFILE - Extended fields for administrators
 */
export interface AdminProfile extends BaseMemberProfile {
  profileType: 'admin';
  
  // Admin-specific
  adminTitle?: string;
  department?: string;
  canManageMembers: boolean;
  canManageFinances: boolean;
  canManageEvents: boolean;
  canManageContent: boolean;
  canManageSettings: boolean;
}

/**
 * PASTOR PROFILE - Extended fields for pastoral staff
 */
export interface PastorProfile extends BaseMemberProfile {
  profileType: 'pastor';
  
  // Pastor-specific
  title: string; // e.g., "Senior Pastor", "Associate Pastor"
  ordinationDate?: string;
  seminary?: string;
  credentials?: string[];
  specializations?: string[]; // e.g., "Youth Ministry", "Counseling"
  officeHours?: string;
  appointmentBookingUrl?: string;
}

/**
 * STAFF PROFILE - Extended fields for church staff
 */
export interface StaffProfile extends BaseMemberProfile {
  profileType: 'staff';
  
  // Staff-specific
  jobTitle: string;
  department?: string;
  hireDate?: string;
  employmentType: 'full_time' | 'part_time' | 'contract';
  supervisor?: string;
  officeLocation?: string;
  workPhone?: string;
}

/**
 * VOLUNTEER PROFILE - Extended fields for volunteers
 */
export interface VolunteerProfile extends BaseMemberProfile {
  profileType: 'volunteer';
  
  // Volunteer-specific
  volunteerSince?: string;
  availability?: {
    sunday: boolean;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    preferredTimes?: string[];
  };
  backgroundCheckStatus?: 'pending' | 'approved' | 'expired' | 'not_required';
  backgroundCheckDate?: string;
  trainingCompleted?: string[];
  hoursLogged?: number;
}

/**
 * MEMBER PROFILE - Standard member fields
 */
export interface MemberProfile extends BaseMemberProfile {
  profileType: 'member';
  
  // Member-specific
  membershipType?: 'regular' | 'associate' | 'affiliate';
  attendanceFrequency?: 'weekly' | 'bi_weekly' | 'monthly' | 'occasional';
  preferredServiceTime?: string;
  familyId?: string; // Link to family unit
}

// Union type for all profiles
export type TenantProfile = AdminProfile | PastorProfile | StaffProfile | VolunteerProfile | MemberProfile;

/**
 * FAMILY UNIT - Groups members into families
 */
export interface FamilyUnit {
  id: string;
  tenantId: string;
  familyName: string;
  headOfHouseholdId?: string; // MemberProfile.id
  address?: Address;
  homePhone?: string;
  anniversary?: string;
  notes?: string;
  memberIds: string[]; // MemberProfile.id[]
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 4. INTERNAL CHURCH DATA (ALL TENANT-SCOPED)
// ============================================================================

/**
 * GROUP - Small groups, Bible studies, etc.
 */
export interface Group {
  id: string;
  tenantId: string;
  
  name: string;
  description?: string;
  groupType: 'small_group' | 'bible_study' | 'support_group' | 'interest' | 'other';
  
  // Leaders
  leaderId: string;
  coLeaderIds?: string[];
  
  // Schedule
  meetingDay?: string;
  meetingTime?: string;
  meetingFrequency?: 'weekly' | 'bi_weekly' | 'monthly';
  meetingLocation?: string;
  isOnline?: boolean;
  meetingUrl?: string;
  
  // Capacity
  maxMembers?: number;
  currentMemberCount: number;
  
  // Status
  status: 'active' | 'inactive' | 'full' | 'archived';
  isPublic: boolean;
  requiresApproval: boolean;
  
  // Media
  coverImage?: string;
  
  // Category
  category?: string;
  tags?: string[];
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * GROUP MEMBERSHIP - Links members to groups
 */
export interface GroupMembership {
  id: string;
  tenantId: string;
  groupId: string;
  memberId: string; // MemberProfile.id
  
  role: 'leader' | 'co_leader' | 'member';
  status: 'active' | 'inactive' | 'pending';
  
  joinedAt: string;
  invitedBy?: string;
  leftAt?: string;
}

/**
 * MINISTRY - Church ministries (extended from existing)
 */
export interface TenantMinistry {
  id: string;
  tenantId: string;
  
  name: string;
  description: string;
  missionStatement?: string;
  
  // Visual
  icon: string;
  color: string;
  coverImage?: string;
  galleryImages?: string[];
  
  // Schedule
  schedule?: {
    day: string;
    time: string;
    frequency: string;
    location?: string;
  }[];
  
  // Contact
  contactEmail?: string;
  contactPhone?: string;
  
  // Leadership
  primaryLeaderId?: string;
  leaderIds: string[];
  
  // Members
  memberCount: number;
  
  // Status
  status: 'draft' | 'published' | 'archived';
  isAcceptingMembers: boolean;
  requiresApproval: boolean;
  
  // Budget
  annualBudget?: number;
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  deletedAt?: string;
}

/**
 * MINISTRY MEMBERSHIP - Links members to ministries
 */
export interface MinistryMembership {
  id: string;
  tenantId: string;
  ministryId: string;
  memberId: string;
  
  role: 'primary_leader' | 'co_leader' | 'coordinator' | 'member';
  status: 'active' | 'inactive' | 'pending';
  
  joinedAt: string;
  invitedBy?: string;
  approvedBy?: string;
  leftAt?: string;
}

/**
 * EVENT - Church events (extended)
 */
export interface TenantEvent {
  id: string;
  tenantId: string;
  
  title: string;
  description: string;
  
  // Timing
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  isAllDay: boolean;
  
  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: string; // iCal RRULE format
  recurrenceEndDate?: string;
  
  // Location
  location: string;
  address?: Address;
  isOnline: boolean;
  onlineUrl?: string;
  
  // Association
  ministryId?: string;
  groupId?: string;
  
  // Registration
  requiresRegistration: boolean;
  maxAttendees?: number;
  currentAttendees: number;
  registrationDeadline?: string;
  
  // Cost
  isFree: boolean;
  cost?: number;
  
  // Media
  coverImage?: string;
  
  // Status
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  
  // Contact
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * EVENT REGISTRATION - Tracks event registrations
 */
export interface EventRegistration {
  id: string;
  tenantId: string;
  eventId: string;
  memberId: string;
  
  status: 'registered' | 'waitlisted' | 'cancelled' | 'attended' | 'no_show';
  registeredAt: string;
  cancelledAt?: string;
  checkedInAt?: string;
  checkedInBy?: string;
  
  guestCount?: number;
  guestNames?: string[];
  notes?: string;
  
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  paymentAmount?: number;
}

/**
 * ATTENDANCE RECORD - Tracks attendance for services/events
 */
export interface AttendanceRecord {
  id: string;
  tenantId: string;
  
  // What was attended
  attendanceType: 'service' | 'event' | 'group' | 'ministry';
  referenceId: string; // Event, Group, or Ministry ID
  referenceName: string;
  
  // When
  date: string;
  serviceTime?: string;
  
  // Who
  memberId?: string; // If known member
  guestName?: string; // If guest
  isGuest: boolean;
  
  // Check-in details
  checkInTime: string;
  checkOutTime?: string;
  checkInMethod: 'manual' | 'qr_code' | 'self_check_in' | 'kiosk';
  checkedInBy?: string;
  
  // For children's ministry
  parentId?: string;
  securityCode?: string;
  allergies?: string;
  specialNeeds?: string;
  
  notes?: string;
  createdAt: string;
}

/**
 * ATTENDANCE SUMMARY - Aggregated attendance data
 */
export interface AttendanceSummary {
  id: string;
  tenantId: string;
  date: string;
  
  attendanceType: 'service' | 'event' | 'group' | 'ministry';
  referenceId: string;
  referenceName: string;
  
  totalAttendees: number;
  memberCount: number;
  guestCount: number;
  childrenCount: number;
  
  firstTimeVisitors: number;
  returningVisitors: number;
  
  notes?: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * NOTE - Internal notes/comments (private)
 */
export interface InternalNote {
  id: string;
  tenantId: string;
  
  // Subject
  subjectType: 'member' | 'family' | 'group' | 'ministry' | 'event' | 'donation';
  subjectId: string;
  subjectName: string;
  
  // Content
  title?: string;
  content: string;
  noteType: 'general' | 'pastoral' | 'counseling' | 'follow_up' | 'prayer' | 'administrative';
  
  // Privacy
  isConfidential: boolean;
  visibleToRoles: TenantRole[];
  
  // Follow-up
  requiresFollowUp: boolean;
  followUpDate?: string;
  followUpAssignedTo?: string;
  followUpCompleted: boolean;
  followUpCompletedAt?: string;
  
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * DOCUMENT - File metadata (files stored externally)
 */
export interface Document {
  id: string;
  tenantId: string;
  
  // File info
  fileName: string;
  originalFileName: string;
  fileType: string;
  mimeType: string;
  fileSize: number; // bytes
  fileUrl: string;
  thumbnailUrl?: string;
  
  // Organization
  category: 'general' | 'financial' | 'legal' | 'ministry' | 'member' | 'template' | 'media';
  folderId?: string;
  tags?: string[];
  
  // Association
  associatedType?: 'member' | 'ministry' | 'event' | 'group';
  associatedId?: string;
  
  // Access control
  isPublic: boolean;
  accessRoles?: TenantRole[];
  
  // Versioning
  version: number;
  previousVersionId?: string;
  
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * DOCUMENT FOLDER - Organize documents
 */
export interface DocumentFolder {
  id: string;
  tenantId: string;
  name: string;
  parentFolderId?: string;
  description?: string;
  color?: string;
  icon?: string;
  accessRoles?: TenantRole[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 5. COMMUNICATION & NOTIFICATIONS
// ============================================================================

/**
 * SYSTEM NOTIFICATION - In-app notifications
 */
export interface SystemNotification {
  id: string;
  tenantId?: string; // Null for platform-level notifications
  userId: string;
  
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'action_required';
  category: 'system' | 'event' | 'message' | 'ministry' | 'donation' | 'member' | 'announcement';
  
  // Action
  actionUrl?: string;
  actionLabel?: string;
  
  // Status
  isRead: boolean;
  readAt?: string;
  isDismissed: boolean;
  dismissedAt?: string;
  
  // Expiry
  expiresAt?: string;
  
  createdAt: string;
}

/**
 * ANNOUNCEMENT - Tenant announcements (extended)
 */
export interface TenantAnnouncement {
  id: string;
  tenantId: string;
  
  title: string;
  content: string;
  excerpt?: string;
  
  // Author
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  
  // Association
  ministryId?: string;
  ministryName?: string;
  
  // Scheduling
  publishDate: string;
  expiryDate?: string;
  
  // Display
  priority: 'urgent' | 'high' | 'normal' | 'low';
  isPinned: boolean;
  showOnHomepage: boolean;
  
  // Media
  coverImage?: string;
  attachments?: string[];
  
  // Status
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  
  // Engagement
  viewCount: number;
  
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  deletedAt?: string;
}

// ============================================================================
// 6. FINANCIAL DATA
// ============================================================================

/**
 * DONATION - Extended donation record
 */
export interface TenantDonation {
  id: string;
  tenantId: string;
  memberId?: string; // Null for anonymous
  
  // Amount
  amount: number;
  currency: string;
  
  // Type
  donationType: 'tithe' | 'offering' | 'missions' | 'building_fund' | 'benevolence' | 'other';
  fundId?: string;
  
  // Payment
  paymentMethod: 'cash' | 'check' | 'card' | 'bank_transfer' | 'online' | 'other';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  checkNumber?: string;
  
  // Recurring
  isRecurring: boolean;
  recurringGivingId?: string;
  
  // Details
  note?: string;
  isAnonymous: boolean;
  
  // Tax
  isTaxDeductible: boolean;
  receiptSent: boolean;
  receiptSentAt?: string;
  
  // Processing
  processedBy?: string;
  processedAt?: string;
  
  donationDate: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * FUND - Designated funds for donations
 */
export interface DonationFund {
  id: string;
  tenantId: string;
  
  name: string;
  description?: string;
  code: string;
  
  // Goals
  goalAmount?: number;
  currentAmount: number;
  
  // Status
  isActive: boolean;
  isTaxDeductible: boolean;
  
  // Timeline
  startDate?: string;
  endDate?: string;
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * RECURRING GIVING - Extended
 */
export interface TenantRecurringGiving {
  id: string;
  tenantId: string;
  memberId: string;
  
  amount: number;
  currency: string;
  frequency: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'annually';
  
  donationType: 'tithe' | 'offering' | 'missions' | 'building_fund' | 'benevolence' | 'other';
  fundId?: string;
  
  // Schedule
  startDate: string;
  endDate?: string;
  nextProcessingDate: string;
  lastProcessedDate?: string;
  
  // Payment
  paymentMethodId?: string;
  
  // Status
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  
  note?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 7. INVITATION SYSTEM
// ============================================================================

/**
 * TENANT INVITATION - Invite users to join tenant
 */
export interface TenantInvitation {
  id: string;
  tenantId: string;
  
  email: string;
  firstName?: string;
  lastName?: string;
  
  role: TenantRole;
  ministryIds?: string[];
  groupIds?: string[];
  
  // Inviter
  invitedBy: string;
  invitedByName: string;
  
  // Token
  token: string;
  
  // Status
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
  
  // Message
  personalMessage?: string;
  
  // Timestamps
  expiresAt: string;
  acceptedAt?: string;
  acceptedBy?: string;
  declinedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 8. AUDIT & LOGGING (TENANT-SCOPED)
// ============================================================================

/**
 * TENANT AUDIT LOG - Tenant-specific audit trail
 */
export interface TenantAuditLog {
  id: string;
  tenantId: string;
  
  // Actor
  userId: string;
  userName: string;
  userEmail: string;
  userRole: TenantRole;
  
  // Action
  action: string;
  actionCategory: 'member' | 'ministry' | 'event' | 'donation' | 'group' | 'settings' | 'content' | 'access';
  
  // Target
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  
  // Changes
  previousValue?: string; // JSON
  newValue?: string; // JSON
  changeDescription?: string;
  
  // Context
  ipAddress?: string;
  userAgent?: string;
  
  createdAt: string;
}

// ============================================================================
// HELPER TYPES FOR DATABASE OPERATIONS
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'startsWith';
  value: unknown;
}

// ============================================================================
// DATABASE COLLECTION NAMES (for reference)
// ============================================================================

export const COLLECTIONS = {
  // Global
  GLOBAL_USERS: 'globalUsers',
  GLOBAL_SESSIONS: 'globalSessions',
  PLATFORM_SETTINGS: 'platformSettings',
  PLATFORM_AUDIT_LOGS: 'platformAuditLogs',
  
  // Tenants
  TENANTS: 'tenants',
  TENANT_FEATURE_FLAGS: 'tenantFeatureFlags',
  TENANT_USAGE_METRICS: 'tenantUsageMetrics',
  
  // Memberships & Profiles
  TENANT_MEMBERSHIPS: 'tenantMemberships',
  MEMBER_PROFILES: 'memberProfiles',
  FAMILY_UNITS: 'familyUnits',
  
  // Groups & Ministries
  GROUPS: 'groups',
  GROUP_MEMBERSHIPS: 'groupMemberships',
  TENANT_MINISTRIES: 'tenantMinistries',
  MINISTRY_MEMBERSHIPS: 'ministryMemberships',
  
  // Events & Attendance
  TENANT_EVENTS: 'tenantEvents',
  EVENT_REGISTRATIONS: 'eventRegistrations',
  ATTENDANCE_RECORDS: 'attendanceRecords',
  ATTENDANCE_SUMMARIES: 'attendanceSummaries',
  
  // Content
  INTERNAL_NOTES: 'internalNotes',
  DOCUMENTS: 'documents',
  DOCUMENT_FOLDERS: 'documentFolders',
  TENANT_ANNOUNCEMENTS: 'tenantAnnouncements',
  
  // Notifications
  SYSTEM_NOTIFICATIONS: 'systemNotifications',
  
  // Financial
  TENANT_DONATIONS: 'tenantDonations',
  DONATION_FUNDS: 'donationFunds',
  TENANT_RECURRING_GIVING: 'tenantRecurringGiving',
  
  // Invitations
  TENANT_INVITATIONS: 'tenantInvitations',
  
  // Audit
  TENANT_AUDIT_LOGS: 'tenantAuditLogs',
} as const;

// ============================================================================
// ENTITY RELATIONSHIPS REFERENCE
// ============================================================================

/*
RELATIONSHIPS DIAGRAM:

GlobalUser (1) ─────────────────────────────────┐
    │                                            │
    │ 1:N                                        │
    ▼                                            │
GlobalSession (N)                                │
                                                 │
Tenant (1) ◄────────────────── owner ───────────┘
    │
    │ 1:N
    ▼
TenantMembership (N) ◄──────── userId ──────── GlobalUser
    │
    │ 1:1
    ▼
TenantProfile (1) [Admin|Pastor|Staff|Volunteer|Member]
    │
    │ N:1 (optional)
    ▼
FamilyUnit (N)


Tenant (1) ──┬── 1:N ──► TenantMinistry (N) ◄── N:N ──► TenantProfile (via MinistryMembership)
             │
             ├── 1:N ──► Group (N) ◄── N:N ──► TenantProfile (via GroupMembership)
             │
             ├── 1:N ──► TenantEvent (N) ◄── N:N ──► TenantProfile (via EventRegistration)
             │
             ├── 1:N ──► TenantAnnouncement (N)
             │
             ├── 1:N ──► TenantDonation (N)
             │
             ├── 1:N ──► AttendanceRecord (N)
             │
             ├── 1:N ──► InternalNote (N)
             │
             ├── 1:N ──► Document (N)
             │
             ├── 1:N ──► TenantInvitation (N)
             │
             ├── 1:N ──► TenantAuditLog (N)
             │
             ├── 1:N ──► TenantFeatureFlag (N)
             │
             └── 1:N ──► TenantUsageMetrics (N)


KEY RELATIONSHIPS:
- GlobalUser → TenantMembership: One user can join multiple tenants (churches)
- TenantMembership → TenantProfile: Each membership has exactly one profile
- TenantProfile → FamilyUnit: Multiple profiles can belong to one family
- TenantMinistry ↔ TenantProfile: Many-to-many via MinistryMembership
- Group ↔ TenantProfile: Many-to-many via GroupMembership
- TenantEvent ↔ TenantProfile: Many-to-many via EventRegistration

TENANT ISOLATION:
- All tenant-specific data has tenantId field
- Queries must always filter by tenantId
- Cross-tenant access is prohibited (except for platform admins)
*/
