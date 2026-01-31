# Multi-Tenant Church Management Platform - Database Schema

## Overview

This document describes the production-ready database schema for a scalable multi-tenant church management platform. The system supports multiple church organizations (tenants), multiple profile types, and internal system data with strict tenant isolation.

---

## Architecture Principles

### 1. Multi-Tenant Isolation
- All tenant-specific data is scoped by `tenantId`
- Queries must always filter by `tenantId` for tenant data
- Cross-tenant access is prohibited (except for platform admins)
- Global entities (users, sessions) are separate from tenant data

### 2. Soft Deletion
- Most entities support soft deletion via `deletedAt` timestamp
- Soft-deleted records are filtered out in standard queries
- Allows data recovery and audit compliance

### 3. Timestamps
- All entities include `createdAt` and `updatedAt`
- `deletedAt` for soft deletion support

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GLOBAL ENTITIES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GlobalUser (1) ─────────────────────────────────┐                          │
│      │                                            │                          │
│      │ 1:N                                        │                          │
│      ▼                                            │                          │
│  GlobalSession (N)                                │                          │
│                                                   │                          │
│  PlatformSettings                                 │                          │
│  PlatformAuditLog                                 │                          │
│                                                   │                          │
└───────────────────────────────────────────────────┼──────────────────────────┘
                                                    │
                                                    │ owner
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TENANT ENTITIES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Tenant (1) ◄─────────────────────────────────────────────────────────────┐ │
│      │                                                                     │ │
│      │ 1:N                                                                 │ │
│      ▼                                                                     │ │
│  TenantMembership (N) ◄──────── userId ──────── GlobalUser                │ │
│      │                                                                     │ │
│      │ 1:1                                                                 │ │
│      ▼                                                                     │ │
│  TenantProfile (1) [Admin|Pastor|Staff|Volunteer|Member]                  │ │
│      │                                                                     │ │
│      │ N:1 (optional)                                                      │ │
│      ▼                                                                     │ │
│  FamilyUnit (N)                                                            │ │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         INTERNAL CHURCH DATA                          │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                        │  │
│  │  Tenant ──┬── 1:N ──► TenantMinistry ◄── N:N ──► TenantProfile       │  │
│  │           │                  (via MinistryMembership)                  │  │
│  │           │                                                            │  │
│  │           ├── 1:N ──► Group ◄── N:N ──► TenantProfile                 │  │
│  │           │                  (via GroupMembership)                     │  │
│  │           │                                                            │  │
│  │           ├── 1:N ──► TenantEvent ◄── N:N ──► TenantProfile           │  │
│  │           │                  (via EventRegistration)                   │  │
│  │           │                                                            │  │
│  │           ├── 1:N ──► TenantAnnouncement                              │  │
│  │           │                                                            │  │
│  │           ├── 1:N ──► TenantDonation                                  │  │
│  │           │                                                            │  │
│  │           ├── 1:N ──► DonationFund                                    │  │
│  │           │                                                            │  │
│  │           ├── 1:N ──► AttendanceRecord                                │  │
│  │           │                                                            │  │
│  │           ├── 1:N ──► InternalNote                                    │  │
│  │           │                                                            │  │
│  │           ├── 1:N ──► Document                                        │  │
│  │           │                                                            │  │
│  │           ├── 1:N ──► TenantInvitation                                │  │
│  │           │                                                            │  │
│  │           ├── 1:N ──► TenantAuditLog                                  │  │
│  │           │                                                            │  │
│  │           ├── 1:N ──► TenantFeatureFlag                               │  │
│  │           │                                                            │  │
│  │           └── 1:N ──► TenantUsageMetrics                              │  │
│  │                                                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tables / Collections

### 1. Global Entities (Not Tenant-Scoped)

#### GlobalUser
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| email | string | Unique, lowercase |
| passwordHash | string | Hashed password |
| emailVerified | boolean | Email verification status |
| emailVerificationToken | string? | Token for email verification |
| emailVerificationExpires | string? | Token expiry |
| passwordResetToken | string? | Password reset token |
| passwordResetExpires | string? | Reset token expiry |
| firstName | string | First name |
| lastName | string | Last name |
| displayName | string | Display name |
| avatar | string? | Avatar URL |
| phone | string? | Phone number |
| accountStatus | enum | active, inactive, suspended, pending_verification |
| lastLoginAt | string? | Last login timestamp |
| loginCount | number | Total login count |
| failedLoginAttempts | number | Failed attempts counter |
| lockedUntil | string? | Account lockout expiry |
| isPlatformAdmin | boolean | Platform-level admin flag |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |
| deletedAt | string? | Soft delete timestamp |

#### GlobalSession
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| userId | string | FK → GlobalUser.id |
| token | string | Session token |
| refreshToken | string? | Refresh token |
| deviceInfo | string? | Device information |
| ipAddress | string? | IP address |
| userAgent | string? | User agent string |
| currentTenantId | string? | Active tenant context |
| expiresAt | string | Session expiry |
| createdAt | string | Creation timestamp |
| lastActivityAt | string | Last activity timestamp |

#### PlatformSettings
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| key | string | Setting key (unique) |
| value | string | Setting value |
| valueType | enum | string, number, boolean, json |
| description | string? | Setting description |
| isPublic | boolean | Publicly accessible |
| updatedBy | string? | Last updater ID |
| updatedAt | string | Last update timestamp |

#### PlatformAuditLog
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string? | FK → Tenant.id (null for platform actions) |
| userId | string | Actor user ID |
| userName | string | Actor name |
| userEmail | string | Actor email |
| action | string | Action performed |
| resource | string | Resource type |
| resourceId | string? | Resource ID |
| previousValue | string? | JSON of previous state |
| newValue | string? | JSON of new state |
| ipAddress | string? | IP address |
| userAgent | string? | User agent |
| metadata | object? | Additional metadata |
| createdAt | string | Timestamp |

---

### 2. Tenant (Church Organization)

#### Tenant
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| name | string | Organization name |
| legalName | string? | Legal/registered name |
| description | string? | Full description |
| shortDescription | string? | Brief description |
| logo | string? | Logo URL |
| bannerImage | string? | Banner image URL |
| primaryColor | string? | Brand primary color |
| secondaryColor | string? | Brand secondary color |
| address | Address | Physical address (structured) |
| mailingAddress | Address? | Mailing address |
| contactInfo | ContactInfo | Contact details (structured) |
| timezone | string | Timezone (e.g., "America/New_York") |
| denomination | string? | Religious denomination |
| affiliation | string? | Network/affiliation |
| churchSize | enum? | small, medium, large, mega |
| foundedYear | number? | Year founded |
| subscriptionPlan | enum | free, basic, professional, enterprise |
| subscriptionStatus | enum | active, past_due, cancelled, trialing |
| subscriptionStartDate | string? | Subscription start |
| subscriptionEndDate | string? | Subscription end |
| billingEmail | string? | Billing email |
| stripeCustomerId | string? | Stripe customer ID |
| status | enum | active, suspended, archived, pending |
| isVerified | boolean | Verification status |
| verifiedAt | string? | Verification timestamp |
| ownerId | string | FK → GlobalUser.id |
| settings | TenantSettings | Configuration (embedded) |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |
| deletedAt | string? | Soft delete timestamp |

#### TenantSettings (Embedded in Tenant)
| Field | Type | Description |
|-------|------|-------------|
| isPublic | boolean | Public visibility |
| allowPublicMemberDirectory | boolean | Public member list |
| requireApprovalToJoin | boolean | Membership approval required |
| modulesEnabled | object | Feature flags for modules |
| notificationPreferences | object | Notification settings |
| customMemberFields | array? | Custom field definitions |

#### TenantFeatureFlag
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| featureKey | string | Feature identifier |
| isEnabled | boolean | Enabled status |
| configuration | object? | Feature configuration |
| enabledBy | string? | Enabler user ID |
| enabledAt | string? | Enable timestamp |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

#### TenantUsageMetrics
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| period | string | Period (YYYY-MM) |
| totalMembers | number | Total member count |
| activeMembers | number | Active members |
| newMembers | number | New members this period |
| totalEvents | number | Total events |
| totalAnnouncements | number | Total announcements |
| totalMessages | number | Total messages |
| totalDonations | number | Donation count |
| donationAmount | number | Total donation amount |
| storageUsedBytes | number | Storage usage |
| avgWeeklyActiveUsers | number | Average WAU |
| eventAttendanceRate | number | Event attendance % |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

---

### 3. User-Tenant Relationships & Profiles

#### TenantMembership
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| userId | string | FK → GlobalUser.id |
| role | enum | super_admin, owner, admin, pastor, staff, volunteer, member, guest |
| permissions | array? | Permission overrides |
| status | enum | active, inactive, pending, suspended |
| isApproved | boolean | Approval status |
| approvedBy | string? | Approver ID |
| approvedAt | string? | Approval timestamp |
| memberNumber | string? | Church-assigned ID |
| joinedAt | string | Join date |
| invitedBy | string? | Inviter ID |
| invitationId | string? | FK → TenantInvitation.id |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |
| leftAt | string? | Departure timestamp |

#### TenantProfile (Base)
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| userId | string | FK → GlobalUser.id |
| membershipId | string | FK → TenantMembership.id |
| profileType | enum | admin, pastor, staff, volunteer, member |
| firstName | string | First name |
| lastName | string | Last name |
| middleName | string? | Middle name |
| displayName | string | Display name |
| avatar | string? | Avatar URL |
| email | string | Email |
| phone | string? | Phone |
| alternatePhone | string? | Alt phone |
| address | Address? | Address (structured) |
| dateOfBirth | string? | Birth date |
| gender | enum? | male, female, other, prefer_not_to_say |
| maritalStatus | enum? | single, married, divorced, widowed, separated |
| baptismDate | string? | Baptism date |
| memberSince | string? | Member since date |
| salvationDate | string? | Salvation date |
| emergencyContact | object? | Emergency contact info |
| bio | string? | Biography |
| spiritualGifts | array? | Spiritual gifts |
| interests | array? | Interests |
| skills | array? | Skills |
| customFields | object? | Custom field values |
| isProfilePublic | boolean | Profile visibility |
| showEmail | boolean | Show email publicly |
| showPhone | boolean | Show phone publicly |
| showAddress | boolean | Show address publicly |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |
| deletedAt | string? | Soft delete timestamp |

**Profile Type Extensions:**
- **AdminProfile**: adminTitle, department, canManageMembers, canManageFinances, etc.
- **PastorProfile**: title, ordinationDate, seminary, credentials, specializations
- **StaffProfile**: jobTitle, department, hireDate, employmentType, supervisor
- **VolunteerProfile**: volunteerSince, availability, backgroundCheckStatus, trainingCompleted
- **MemberProfile**: membershipType, attendanceFrequency, familyId

#### FamilyUnit
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| familyName | string | Family name |
| headOfHouseholdId | string? | FK → TenantProfile.id |
| address | Address? | Family address |
| homePhone | string? | Home phone |
| anniversary | string? | Wedding anniversary |
| notes | string? | Notes |
| memberIds | array | TenantProfile IDs |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

---

### 4. Internal Church Data

#### Group
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| name | string | Group name |
| description | string? | Description |
| groupType | enum | small_group, bible_study, support_group, interest, other |
| leaderId | string | FK → TenantProfile.id |
| coLeaderIds | array? | Co-leader profile IDs |
| meetingDay | string? | Meeting day |
| meetingTime | string? | Meeting time |
| meetingFrequency | enum? | weekly, bi_weekly, monthly |
| meetingLocation | string? | Location |
| isOnline | boolean? | Online meeting |
| meetingUrl | string? | Online meeting URL |
| maxMembers | number? | Capacity |
| currentMemberCount | number | Current members |
| status | enum | active, inactive, full, archived |
| isPublic | boolean | Public visibility |
| requiresApproval | boolean | Join approval required |
| coverImage | string? | Cover image URL |
| category | string? | Category |
| tags | array? | Tags |
| createdBy | string | Creator ID |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |
| deletedAt | string? | Soft delete timestamp |

#### GroupMembership
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| groupId | string | FK → Group.id |
| memberId | string | FK → TenantProfile.id |
| role | enum | leader, co_leader, member |
| status | enum | active, inactive, pending |
| joinedAt | string | Join timestamp |
| invitedBy | string? | Inviter ID |
| leftAt | string? | Leave timestamp |

#### TenantMinistry
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| name | string | Ministry name |
| description | string | Description |
| missionStatement | string? | Mission statement |
| icon | string | Icon identifier |
| color | string | Brand color |
| coverImage | string? | Cover image URL |
| galleryImages | array? | Gallery image URLs |
| schedule | array? | Meeting schedule |
| contactEmail | string? | Contact email |
| contactPhone | string? | Contact phone |
| primaryLeaderId | string? | Primary leader ID |
| leaderIds | array | All leader IDs |
| memberCount | number | Member count |
| status | enum | draft, published, archived |
| isAcceptingMembers | boolean | Accepting new members |
| requiresApproval | boolean | Join approval required |
| annualBudget | number? | Annual budget |
| createdBy | string | Creator ID |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |
| publishedAt | string? | Publish timestamp |
| deletedAt | string? | Soft delete timestamp |

#### MinistryMembership
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| ministryId | string | FK → TenantMinistry.id |
| memberId | string | FK → TenantProfile.id |
| role | enum | primary_leader, co_leader, coordinator, member |
| status | enum | active, inactive, pending |
| joinedAt | string | Join timestamp |
| invitedBy | string? | Inviter ID |
| approvedBy | string? | Approver ID |
| leftAt | string? | Leave timestamp |

#### TenantEvent
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| title | string | Event title |
| description | string | Description |
| startDate | string | Start date |
| endDate | string | End date |
| startTime | string | Start time |
| endTime | string | End time |
| timezone | string | Timezone |
| isAllDay | boolean | All-day event |
| isRecurring | boolean | Recurring event |
| recurrenceRule | string? | iCal RRULE |
| recurrenceEndDate | string? | Recurrence end |
| location | string | Location |
| address | Address? | Address (structured) |
| isOnline | boolean | Online event |
| onlineUrl | string? | Online URL |
| ministryId | string? | FK → TenantMinistry.id |
| groupId | string? | FK → Group.id |
| requiresRegistration | boolean | Registration required |
| maxAttendees | number? | Capacity |
| currentAttendees | number | Current registrations |
| registrationDeadline | string? | Registration deadline |
| isFree | boolean | Free event |
| cost | number? | Event cost |
| coverImage | string? | Cover image URL |
| status | enum | draft, published, cancelled, completed |
| contactName | string? | Contact name |
| contactEmail | string? | Contact email |
| contactPhone | string? | Contact phone |
| createdBy | string | Creator ID |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |
| deletedAt | string? | Soft delete timestamp |

#### EventRegistration
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| eventId | string | FK → TenantEvent.id |
| memberId | string | FK → TenantProfile.id |
| status | enum | registered, waitlisted, cancelled, attended, no_show |
| registeredAt | string | Registration timestamp |
| cancelledAt | string? | Cancellation timestamp |
| checkedInAt | string? | Check-in timestamp |
| checkedInBy | string? | Check-in staff ID |
| guestCount | number? | Number of guests |
| guestNames | array? | Guest names |
| notes | string? | Notes |
| paymentStatus | enum? | pending, paid, refunded |
| paymentAmount | number? | Payment amount |

#### AttendanceRecord
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| attendanceType | enum | service, event, group, ministry |
| referenceId | string | Reference entity ID |
| referenceName | string | Reference entity name |
| date | string | Attendance date |
| serviceTime | string? | Service time |
| memberId | string? | FK → TenantProfile.id |
| guestName | string? | Guest name |
| isGuest | boolean | Is guest |
| checkInTime | string | Check-in timestamp |
| checkOutTime | string? | Check-out timestamp |
| checkInMethod | enum | manual, qr_code, self_check_in, kiosk |
| checkedInBy | string? | Staff ID |
| parentId | string? | Parent ID (children) |
| securityCode | string? | Security code |
| allergies | string? | Allergies |
| specialNeeds | string? | Special needs |
| notes | string? | Notes |
| createdAt | string | Creation timestamp |

#### AttendanceSummary
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| date | string | Summary date |
| attendanceType | enum | service, event, group, ministry |
| referenceId | string | Reference entity ID |
| referenceName | string | Reference entity name |
| totalAttendees | number | Total count |
| memberCount | number | Members |
| guestCount | number | Guests |
| childrenCount | number | Children |
| firstTimeVisitors | number | First-time visitors |
| returningVisitors | number | Returning visitors |
| notes | string? | Notes |
| recordedBy | string | Recorder ID |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

#### InternalNote
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| subjectType | enum | member, family, group, ministry, event, donation |
| subjectId | string | Subject entity ID |
| subjectName | string | Subject name |
| title | string? | Note title |
| content | string | Note content |
| noteType | enum | general, pastoral, counseling, follow_up, prayer, administrative |
| isConfidential | boolean | Confidential note |
| visibleToRoles | array | Roles that can view |
| requiresFollowUp | boolean | Needs follow-up |
| followUpDate | string? | Follow-up date |
| followUpAssignedTo | string? | Assignee ID |
| followUpCompleted | boolean | Follow-up done |
| followUpCompletedAt | string? | Completion timestamp |
| createdBy | string | Creator ID |
| createdByName | string | Creator name |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |
| deletedAt | string? | Soft delete timestamp |

#### Document
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| fileName | string | Stored file name |
| originalFileName | string | Original file name |
| fileType | string | File extension |
| mimeType | string | MIME type |
| fileSize | number | Size in bytes |
| fileUrl | string | File URL |
| thumbnailUrl | string? | Thumbnail URL |
| category | enum | general, financial, legal, ministry, member, template, media |
| folderId | string? | FK → DocumentFolder.id |
| tags | array? | Tags |
| associatedType | enum? | member, ministry, event, group |
| associatedId | string? | Associated entity ID |
| isPublic | boolean | Public access |
| accessRoles | array? | Roles with access |
| version | number | Version number |
| previousVersionId | string? | Previous version ID |
| uploadedBy | string | Uploader ID |
| uploadedByName | string | Uploader name |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |
| deletedAt | string? | Soft delete timestamp |

#### DocumentFolder
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| name | string | Folder name |
| parentFolderId | string? | Parent folder ID |
| description | string? | Description |
| color | string? | Folder color |
| icon | string? | Folder icon |
| accessRoles | array? | Roles with access |
| createdBy | string | Creator ID |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

---

### 5. Financial Data

#### TenantDonation
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| memberId | string? | FK → TenantProfile.id (null for anonymous) |
| amount | number | Donation amount |
| currency | string | Currency code |
| donationType | enum | tithe, offering, missions, building_fund, benevolence, other |
| fundId | string? | FK → DonationFund.id |
| paymentMethod | enum | cash, check, card, bank_transfer, online, other |
| paymentStatus | enum | pending, completed, failed, refunded |
| transactionId | string? | Payment transaction ID |
| checkNumber | string? | Check number |
| isRecurring | boolean | From recurring giving |
| recurringGivingId | string? | FK → TenantRecurringGiving.id |
| note | string? | Donation note |
| isAnonymous | boolean | Anonymous donation |
| isTaxDeductible | boolean | Tax deductible |
| receiptSent | boolean | Receipt sent |
| receiptSentAt | string? | Receipt sent timestamp |
| processedBy | string? | Processor ID |
| processedAt | string? | Process timestamp |
| donationDate | string | Donation date |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

#### DonationFund
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| name | string | Fund name |
| description | string? | Description |
| code | string | Fund code |
| goalAmount | number? | Target amount |
| currentAmount | number | Current amount |
| isActive | boolean | Active status |
| isTaxDeductible | boolean | Tax deductible |
| startDate | string? | Campaign start |
| endDate | string? | Campaign end |
| createdBy | string | Creator ID |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

#### TenantRecurringGiving
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| memberId | string | FK → TenantProfile.id |
| amount | number | Amount |
| currency | string | Currency code |
| frequency | enum | weekly, bi_weekly, monthly, quarterly, annually |
| donationType | enum | tithe, offering, missions, building_fund, benevolence, other |
| fundId | string? | FK → DonationFund.id |
| startDate | string | Start date |
| endDate | string? | End date |
| nextProcessingDate | string | Next processing date |
| lastProcessedDate | string? | Last processed date |
| paymentMethodId | string? | Payment method ID |
| status | enum | active, paused, cancelled, completed |
| note | string? | Note |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

---

### 6. Communication & Notifications

#### SystemNotification
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string? | FK → Tenant.id (null for platform notifications) |
| userId | string | FK → GlobalUser.id |
| title | string | Notification title |
| message | string | Notification message |
| type | enum | info, success, warning, error, action_required |
| category | enum | system, event, message, ministry, donation, member, announcement |
| actionUrl | string? | Action URL |
| actionLabel | string? | Action button label |
| isRead | boolean | Read status |
| readAt | string? | Read timestamp |
| isDismissed | boolean | Dismissed status |
| dismissedAt | string? | Dismiss timestamp |
| expiresAt | string? | Expiry timestamp |
| createdAt | string | Creation timestamp |

#### TenantAnnouncement
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| title | string | Announcement title |
| content | string | Full content |
| excerpt | string? | Short excerpt |
| authorId | string | Author ID |
| authorName | string | Author name |
| authorRole | string | Author role |
| authorAvatar | string? | Author avatar |
| ministryId | string? | FK → TenantMinistry.id |
| ministryName | string? | Ministry name |
| publishDate | string | Publish date |
| expiryDate | string? | Expiry date |
| priority | enum | urgent, high, normal, low |
| isPinned | boolean | Pinned status |
| showOnHomepage | boolean | Show on homepage |
| coverImage | string? | Cover image URL |
| attachments | array? | Attachment URLs |
| status | enum | draft, scheduled, published, archived |
| viewCount | number | View count |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |
| publishedAt | string? | Publish timestamp |
| deletedAt | string? | Soft delete timestamp |

---

### 7. Invitations

#### TenantInvitation
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| email | string | Invitee email |
| firstName | string? | Invitee first name |
| lastName | string? | Invitee last name |
| role | enum | Role to assign |
| ministryIds | array? | Ministry IDs to join |
| groupIds | array? | Group IDs to join |
| invitedBy | string | Inviter ID |
| invitedByName | string | Inviter name |
| token | string | Unique invite token |
| status | enum | pending, accepted, declined, expired, revoked |
| personalMessage | string? | Personal message |
| expiresAt | string | Expiry timestamp |
| acceptedAt | string? | Accept timestamp |
| acceptedBy | string? | Acceptor user ID |
| declinedAt | string? | Decline timestamp |
| revokedAt | string? | Revoke timestamp |
| revokedBy | string? | Revoker ID |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

---

### 8. Audit Logging

#### TenantAuditLog
| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| tenantId | string | FK → Tenant.id |
| userId | string | Actor user ID |
| userName | string | Actor name |
| userEmail | string | Actor email |
| userRole | enum | Actor role |
| action | string | Action performed |
| actionCategory | enum | member, ministry, event, donation, group, settings, content, access |
| resourceType | string | Resource type |
| resourceId | string | Resource ID |
| resourceName | string? | Resource name |
| previousValue | string? | JSON of previous state |
| newValue | string? | JSON of new state |
| changeDescription | string? | Change description |
| ipAddress | string? | IP address |
| userAgent | string? | User agent |
| createdAt | string | Timestamp |

---

## Collection Names Reference

```typescript
const COLLECTIONS = {
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
};
```

---

## Usage Examples

### Creating a new tenant with owner

```typescript
import { multiTenantDb, generateId } from '@/backend/db/multi-tenant';

// 1. Create global user
const user = await multiTenantDb.globalUsers.create({
  id: generateId(),
  email: 'pastor@church.org',
  passwordHash: hashedPassword,
  emailVerified: true,
  firstName: 'John',
  lastName: 'Smith',
  displayName: 'Pastor John',
  accountStatus: 'active',
  loginCount: 0,
  failedLoginAttempts: 0,
  isPlatformAdmin: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// 2. Create tenant
const tenant = await multiTenantDb.tenants.create({
  id: generateId(),
  name: 'First Community Church',
  address: { street1: '123 Main St', city: 'Springfield', state: 'IL', postalCode: '62701', country: 'US' },
  contactInfo: { primaryEmail: 'info@church.org', primaryPhone: '555-1234' },
  timezone: 'America/Chicago',
  subscriptionPlan: 'basic',
  subscriptionStatus: 'active',
  status: 'active',
  isVerified: false,
  ownerId: user.id,
  settings: {
    isPublic: true,
    allowPublicMemberDirectory: false,
    requireApprovalToJoin: true,
    modulesEnabled: { events: true, announcements: true, donations: true, /* ... */ },
    notificationPreferences: { newMembers: true, events: true, /* ... */ },
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// 3. Create membership
const membership = await multiTenantDb.tenantMemberships.create({
  id: generateId(),
  tenantId: tenant.id,
  userId: user.id,
  role: 'owner',
  status: 'active',
  isApproved: true,
  joinedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// 4. Create profile
await multiTenantDb.memberProfiles.create({
  id: generateId(),
  tenantId: tenant.id,
  userId: user.id,
  membershipId: membership.id,
  profileType: 'admin',
  firstName: 'John',
  lastName: 'Smith',
  displayName: 'Pastor John',
  email: 'pastor@church.org',
  isProfilePublic: true,
  showEmail: true,
  showPhone: false,
  showAddress: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
```

### Querying tenant-scoped data

```typescript
// Always filter by tenantId for tenant data
const ministries = await multiTenantDb.tenantMinistries.findByTenant(tenantId);
const events = await multiTenantDb.tenantEvents.findUpcoming(tenantId);
const members = await multiTenantDb.memberProfiles.findByTenant(tenantId);
```

---

## Security Considerations

1. **Tenant Isolation**: Always include `tenantId` in queries for tenant-scoped data
2. **Role-Based Access**: Use `TenantMembership.role` to control access within a tenant
3. **Soft Deletion**: Use soft delete for audit compliance and data recovery
4. **Audit Logging**: Log all significant actions using `TenantAuditLog`
5. **Data Encryption**: Sensitive fields should be encrypted at rest
6. **Input Validation**: Validate all input data before storage

---

## Future Scalability

The schema supports:
- Adding new profile types by extending `BaseMemberProfile`
- Adding new modules via `TenantSettings.modulesEnabled`
- Custom fields per tenant via `customMemberFields`
- Feature flags for gradual rollouts
- Usage tracking for billing and analytics
