import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  Database,
  Key,
  Link2,
  Globe,
  Building2,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Users,
  Shield,
  FileText,
  Calendar,
  Heart,
  Bell,
  DollarSign,
  Mail,
  ClipboardList,
  Layers,
} from 'lucide-react-native';

interface Field {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  foreignKeyRef?: string;
  isRequired?: boolean;
}

interface Entity {
  name: string;
  displayName: string;
  scope: 'global' | 'tenant';
  category: string;
  icon: React.ReactNode;
  fields: Field[];
  relationships: {
    target: string;
    type: '1-1' | '1-N' | 'N-N';
    via?: string;
    label?: string;
  }[];
}

const COLORS = {
  global: '#3B82F6',
  globalBg: '#EFF6FF',
  globalBorder: '#93C5FD',
  tenant: '#10B981',
  tenantBg: '#ECFDF5',
  tenantBorder: '#6EE7B7',
  joinTable: '#F59E0B',
  joinTableBg: '#FFFBEB',
  joinTableBorder: '#FCD34D',
  primaryKey: '#EF4444',
  foreignKey: '#8B5CF6',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const entities: Entity[] = [
  {
    name: 'GlobalUser',
    displayName: 'User',
    scope: 'global',
    category: 'Authentication',
    icon: <Users size={16} color={COLORS.global} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'email', type: 'string (unique)', isRequired: true },
      { name: 'passwordHash', type: 'string', isRequired: true },
      { name: 'firstName', type: 'string', isRequired: true },
      { name: 'lastName', type: 'string', isRequired: true },
      { name: 'displayName', type: 'string', isRequired: true },
      { name: 'avatar', type: 'string?' },
      { name: 'phone', type: 'string?' },
      { name: 'accountStatus', type: 'AccountStatus', isRequired: true },
      { name: 'emailVerified', type: 'boolean', isRequired: true },
      { name: 'isPlatformAdmin', type: 'boolean', isRequired: true },
      { name: 'lastLoginAt', type: 'datetime?' },
      { name: 'loginCount', type: 'number', isRequired: true },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
      { name: 'deletedAt', type: 'datetime?' },
    ],
    relationships: [
      { target: 'GlobalSession', type: '1-N', label: 'has sessions' },
      { target: 'Tenant', type: '1-N', label: 'owns' },
      { target: 'TenantMembership', type: '1-N', label: 'memberships' },
    ],
  },
  {
    name: 'GlobalSession',
    displayName: 'Session',
    scope: 'global',
    category: 'Authentication',
    icon: <Shield size={16} color={COLORS.global} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'userId', type: 'string', isForeignKey: true, foreignKeyRef: 'GlobalUser.id', isRequired: true },
      { name: 'token', type: 'string', isRequired: true },
      { name: 'refreshToken', type: 'string?' },
      { name: 'currentTenantId', type: 'string?', isForeignKey: true, foreignKeyRef: 'Tenant.id' },
      { name: 'deviceInfo', type: 'string?' },
      { name: 'ipAddress', type: 'string?' },
      { name: 'expiresAt', type: 'datetime', isRequired: true },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'lastActivityAt', type: 'datetime', isRequired: true },
    ],
    relationships: [],
  },
  {
    name: 'Tenant',
    displayName: 'Church Organization',
    scope: 'global',
    category: 'Core',
    icon: <Building2 size={16} color={COLORS.global} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'legalName', type: 'string?' },
      { name: 'description', type: 'string?' },
      { name: 'logo', type: 'string?' },
      { name: 'status', type: 'TenantStatus', isRequired: true },
      { name: 'denomination', type: 'string?' },
      { name: 'address', type: 'Address', isRequired: true },
      { name: 'contactInfo', type: 'ContactInfo', isRequired: true },
      { name: 'timezone', type: 'string', isRequired: true },
      { name: 'subscriptionPlan', type: 'SubscriptionPlan', isRequired: true },
      { name: 'subscriptionStatus', type: 'string', isRequired: true },
      { name: 'ownerId', type: 'string', isForeignKey: true, foreignKeyRef: 'GlobalUser.id', isRequired: true },
      { name: 'settings', type: 'TenantSettings', isRequired: true },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
      { name: 'deletedAt', type: 'datetime?' },
    ],
    relationships: [
      { target: 'TenantMembership', type: '1-N', label: 'has members' },
      { target: 'TenantMinistry', type: '1-N', label: 'has ministries' },
      { target: 'Group', type: '1-N', label: 'has groups' },
      { target: 'TenantEvent', type: '1-N', label: 'has events' },
      { target: 'TenantAnnouncement', type: '1-N', label: 'has announcements' },
      { target: 'TenantDonation', type: '1-N', label: 'has donations' },
    ],
  },
  {
    name: 'TenantMembership',
    displayName: 'User-Church Role',
    scope: 'tenant',
    category: 'Access & Roles',
    icon: <Link2 size={16} color={COLORS.joinTable} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'userId', type: 'string', isForeignKey: true, foreignKeyRef: 'GlobalUser.id', isRequired: true },
      { name: 'role', type: 'TenantRole', isRequired: true },
      { name: 'permissions', type: 'string[]?' },
      { name: 'status', type: 'string', isRequired: true },
      { name: 'isApproved', type: 'boolean', isRequired: true },
      { name: 'memberNumber', type: 'string?' },
      { name: 'joinedAt', type: 'datetime', isRequired: true },
      { name: 'invitedBy', type: 'string?' },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
    ],
    relationships: [
      { target: 'BaseMemberProfile', type: '1-1', label: 'has profile' },
    ],
  },
  {
    name: 'BaseMemberProfile',
    displayName: 'Base Profile',
    scope: 'tenant',
    category: 'Profiles',
    icon: <Users size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'userId', type: 'string', isForeignKey: true, foreignKeyRef: 'GlobalUser.id', isRequired: true },
      { name: 'membershipId', type: 'string', isForeignKey: true, foreignKeyRef: 'TenantMembership.id', isRequired: true },
      { name: 'profileType', type: 'ProfileType', isRequired: true },
      { name: 'firstName', type: 'string', isRequired: true },
      { name: 'lastName', type: 'string', isRequired: true },
      { name: 'displayName', type: 'string', isRequired: true },
      { name: 'avatar', type: 'string?' },
      { name: 'email', type: 'string', isRequired: true },
      { name: 'phone', type: 'string?' },
      { name: 'address', type: 'Address?' },
      { name: 'dateOfBirth', type: 'date?' },
      { name: 'gender', type: 'string?' },
      { name: 'baptismDate', type: 'date?' },
      { name: 'memberSince', type: 'date?' },
      { name: 'customFields', type: 'JSON?' },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
      { name: 'deletedAt', type: 'datetime?' },
    ],
    relationships: [
      { target: 'AdminProfile', type: '1-1', label: 'extends to' },
      { target: 'StaffProfile', type: '1-1', label: 'extends to' },
      { target: 'MemberProfile', type: '1-1', label: 'extends to' },
      { target: 'VolunteerProfile', type: '1-1', label: 'extends to' },
    ],
  },
  {
    name: 'AdminProfile',
    displayName: 'Admin Profile',
    scope: 'tenant',
    category: 'Profiles',
    icon: <Shield size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'profile_id', type: 'string', isPrimaryKey: true, isForeignKey: true, foreignKeyRef: 'BaseMemberProfile.id' },
      { name: 'adminTitle', type: 'string?' },
      { name: 'department', type: 'string?' },
      { name: 'canManageMembers', type: 'boolean', isRequired: true },
      { name: 'canManageFinances', type: 'boolean', isRequired: true },
      { name: 'canManageEvents', type: 'boolean', isRequired: true },
      { name: 'canManageContent', type: 'boolean', isRequired: true },
      { name: 'canManageSettings', type: 'boolean', isRequired: true },
    ],
    relationships: [],
  },
  {
    name: 'StaffProfile',
    displayName: 'Staff Profile',
    scope: 'tenant',
    category: 'Profiles',
    icon: <Users size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'profile_id', type: 'string', isPrimaryKey: true, isForeignKey: true, foreignKeyRef: 'BaseMemberProfile.id' },
      { name: 'jobTitle', type: 'string', isRequired: true },
      { name: 'department', type: 'string?' },
      { name: 'hireDate', type: 'date?' },
      { name: 'employmentType', type: 'string', isRequired: true },
      { name: 'supervisor', type: 'string?' },
      { name: 'officeLocation', type: 'string?' },
      { name: 'workPhone', type: 'string?' },
    ],
    relationships: [],
  },
  {
    name: 'MemberProfile',
    displayName: 'Member Profile',
    scope: 'tenant',
    category: 'Profiles',
    icon: <Users size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'profile_id', type: 'string', isPrimaryKey: true, isForeignKey: true, foreignKeyRef: 'BaseMemberProfile.id' },
      { name: 'membershipType', type: 'string?' },
      { name: 'attendanceFrequency', type: 'string?' },
      { name: 'preferredServiceTime', type: 'string?' },
      { name: 'familyId', type: 'string?', isForeignKey: true, foreignKeyRef: 'FamilyUnit.id' },
    ],
    relationships: [],
  },
  {
    name: 'VolunteerProfile',
    displayName: 'Volunteer Profile',
    scope: 'tenant',
    category: 'Profiles',
    icon: <Heart size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'profile_id', type: 'string', isPrimaryKey: true, isForeignKey: true, foreignKeyRef: 'BaseMemberProfile.id' },
      { name: 'volunteerSince', type: 'date?' },
      { name: 'availability', type: 'JSON?' },
      { name: 'backgroundCheckStatus', type: 'string?' },
      { name: 'backgroundCheckDate', type: 'date?' },
      { name: 'trainingCompleted', type: 'string[]?' },
      { name: 'hoursLogged', type: 'number?' },
    ],
    relationships: [],
  },
  {
    name: 'FamilyUnit',
    displayName: 'Family Unit',
    scope: 'tenant',
    category: 'Profiles',
    icon: <Users size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'familyName', type: 'string', isRequired: true },
      { name: 'headOfHouseholdId', type: 'string?', isForeignKey: true, foreignKeyRef: 'BaseMemberProfile.id' },
      { name: 'address', type: 'Address?' },
      { name: 'homePhone', type: 'string?' },
      { name: 'anniversary', type: 'date?' },
      { name: 'memberIds', type: 'string[]', isRequired: true },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
    ],
    relationships: [],
  },
  {
    name: 'TenantMinistry',
    displayName: 'Ministry',
    scope: 'tenant',
    category: 'Church Data',
    icon: <Layers size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: true },
      { name: 'missionStatement', type: 'string?' },
      { name: 'icon', type: 'string', isRequired: true },
      { name: 'color', type: 'string', isRequired: true },
      { name: 'coverImage', type: 'string?' },
      { name: 'schedule', type: 'JSON?' },
      { name: 'contactEmail', type: 'string?' },
      { name: 'primaryLeaderId', type: 'string?', isForeignKey: true, foreignKeyRef: 'BaseMemberProfile.id' },
      { name: 'leaderIds', type: 'string[]', isRequired: true },
      { name: 'memberCount', type: 'number', isRequired: true },
      { name: 'status', type: 'string', isRequired: true },
      { name: 'createdBy', type: 'string', isRequired: true },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
      { name: 'deletedAt', type: 'datetime?' },
    ],
    relationships: [
      { target: 'MinistryMembership', type: '1-N', label: 'has members' },
      { target: 'TenantEvent', type: '1-N', label: 'has events' },
    ],
  },
  {
    name: 'MinistryMembership',
    displayName: 'Ministry Membership',
    scope: 'tenant',
    category: 'Church Data',
    icon: <Link2 size={16} color={COLORS.joinTable} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'ministryId', type: 'string', isForeignKey: true, foreignKeyRef: 'TenantMinistry.id', isRequired: true },
      { name: 'memberId', type: 'string', isForeignKey: true, foreignKeyRef: 'BaseMemberProfile.id', isRequired: true },
      { name: 'role', type: 'string', isRequired: true },
      { name: 'status', type: 'string', isRequired: true },
      { name: 'joinedAt', type: 'datetime', isRequired: true },
      { name: 'invitedBy', type: 'string?' },
      { name: 'leftAt', type: 'datetime?' },
    ],
    relationships: [],
  },
  {
    name: 'Group',
    displayName: 'Group',
    scope: 'tenant',
    category: 'Church Data',
    icon: <Users size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string?' },
      { name: 'groupType', type: 'string', isRequired: true },
      { name: 'leaderId', type: 'string', isForeignKey: true, foreignKeyRef: 'BaseMemberProfile.id', isRequired: true },
      { name: 'coLeaderIds', type: 'string[]?' },
      { name: 'meetingDay', type: 'string?' },
      { name: 'meetingTime', type: 'string?' },
      { name: 'meetingFrequency', type: 'string?' },
      { name: 'meetingLocation', type: 'string?' },
      { name: 'maxMembers', type: 'number?' },
      { name: 'currentMemberCount', type: 'number', isRequired: true },
      { name: 'status', type: 'string', isRequired: true },
      { name: 'isPublic', type: 'boolean', isRequired: true },
      { name: 'createdBy', type: 'string', isRequired: true },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
      { name: 'deletedAt', type: 'datetime?' },
    ],
    relationships: [
      { target: 'GroupMembership', type: '1-N', label: 'has members' },
    ],
  },
  {
    name: 'GroupMembership',
    displayName: 'Group Membership',
    scope: 'tenant',
    category: 'Church Data',
    icon: <Link2 size={16} color={COLORS.joinTable} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'groupId', type: 'string', isForeignKey: true, foreignKeyRef: 'Group.id', isRequired: true },
      { name: 'memberId', type: 'string', isForeignKey: true, foreignKeyRef: 'BaseMemberProfile.id', isRequired: true },
      { name: 'role', type: 'string', isRequired: true },
      { name: 'status', type: 'string', isRequired: true },
      { name: 'joinedAt', type: 'datetime', isRequired: true },
      { name: 'leftAt', type: 'datetime?' },
    ],
    relationships: [],
  },
  {
    name: 'TenantEvent',
    displayName: 'Event',
    scope: 'tenant',
    category: 'Church Data',
    icon: <Calendar size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'title', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: true },
      { name: 'startDate', type: 'datetime', isRequired: true },
      { name: 'endDate', type: 'datetime', isRequired: true },
      { name: 'location', type: 'string', isRequired: true },
      { name: 'ministryId', type: 'string?', isForeignKey: true, foreignKeyRef: 'TenantMinistry.id' },
      { name: 'groupId', type: 'string?', isForeignKey: true, foreignKeyRef: 'Group.id' },
      { name: 'requiresRegistration', type: 'boolean', isRequired: true },
      { name: 'maxAttendees', type: 'number?' },
      { name: 'currentAttendees', type: 'number', isRequired: true },
      { name: 'status', type: 'string', isRequired: true },
      { name: 'createdBy', type: 'string', isRequired: true },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
      { name: 'deletedAt', type: 'datetime?' },
    ],
    relationships: [
      { target: 'EventRegistration', type: '1-N', label: 'has registrations' },
      { target: 'AttendanceRecord', type: '1-N', label: 'has attendance' },
    ],
  },
  {
    name: 'EventRegistration',
    displayName: 'Event Registration',
    scope: 'tenant',
    category: 'Church Data',
    icon: <ClipboardList size={16} color={COLORS.joinTable} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'eventId', type: 'string', isForeignKey: true, foreignKeyRef: 'TenantEvent.id', isRequired: true },
      { name: 'memberId', type: 'string', isForeignKey: true, foreignKeyRef: 'BaseMemberProfile.id', isRequired: true },
      { name: 'status', type: 'string', isRequired: true },
      { name: 'registeredAt', type: 'datetime', isRequired: true },
      { name: 'checkedInAt', type: 'datetime?' },
      { name: 'guestCount', type: 'number?' },
      { name: 'paymentStatus', type: 'string?' },
    ],
    relationships: [],
  },
  {
    name: 'AttendanceRecord',
    displayName: 'Attendance Record',
    scope: 'tenant',
    category: 'Church Data',
    icon: <ClipboardList size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'attendanceType', type: 'string', isRequired: true },
      { name: 'referenceId', type: 'string', isRequired: true },
      { name: 'referenceName', type: 'string', isRequired: true },
      { name: 'date', type: 'date', isRequired: true },
      { name: 'memberId', type: 'string?', isForeignKey: true, foreignKeyRef: 'BaseMemberProfile.id' },
      { name: 'guestName', type: 'string?' },
      { name: 'isGuest', type: 'boolean', isRequired: true },
      { name: 'checkInTime', type: 'datetime', isRequired: true },
      { name: 'checkOutTime', type: 'datetime?' },
      { name: 'checkInMethod', type: 'string', isRequired: true },
      { name: 'createdAt', type: 'datetime', isRequired: true },
    ],
    relationships: [],
  },
  {
    name: 'TenantAnnouncement',
    displayName: 'Announcement',
    scope: 'tenant',
    category: 'Communication',
    icon: <Bell size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'title', type: 'string', isRequired: true },
      { name: 'content', type: 'string', isRequired: true },
      { name: 'authorId', type: 'string', isForeignKey: true, foreignKeyRef: 'BaseMemberProfile.id', isRequired: true },
      { name: 'authorName', type: 'string', isRequired: true },
      { name: 'ministryId', type: 'string?', isForeignKey: true, foreignKeyRef: 'TenantMinistry.id' },
      { name: 'publishDate', type: 'datetime', isRequired: true },
      { name: 'expiryDate', type: 'datetime?' },
      { name: 'priority', type: 'string', isRequired: true },
      { name: 'isPinned', type: 'boolean', isRequired: true },
      { name: 'status', type: 'string', isRequired: true },
      { name: 'viewCount', type: 'number', isRequired: true },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
      { name: 'deletedAt', type: 'datetime?' },
    ],
    relationships: [],
  },
  {
    name: 'SystemNotification',
    displayName: 'System Notification',
    scope: 'global',
    category: 'Communication',
    icon: <Bell size={16} color={COLORS.global} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string?', isForeignKey: true, foreignKeyRef: 'Tenant.id' },
      { name: 'userId', type: 'string', isForeignKey: true, foreignKeyRef: 'GlobalUser.id', isRequired: true },
      { name: 'title', type: 'string', isRequired: true },
      { name: 'message', type: 'string', isRequired: true },
      { name: 'type', type: 'string', isRequired: true },
      { name: 'category', type: 'string', isRequired: true },
      { name: 'actionUrl', type: 'string?' },
      { name: 'isRead', type: 'boolean', isRequired: true },
      { name: 'readAt', type: 'datetime?' },
      { name: 'isDismissed', type: 'boolean', isRequired: true },
      { name: 'createdAt', type: 'datetime', isRequired: true },
    ],
    relationships: [],
  },
  {
    name: 'TenantDonation',
    displayName: 'Donation',
    scope: 'tenant',
    category: 'Financial',
    icon: <DollarSign size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'memberId', type: 'string?', isForeignKey: true, foreignKeyRef: 'BaseMemberProfile.id' },
      { name: 'amount', type: 'number', isRequired: true },
      { name: 'currency', type: 'string', isRequired: true },
      { name: 'donationType', type: 'string', isRequired: true },
      { name: 'fundId', type: 'string?', isForeignKey: true, foreignKeyRef: 'DonationFund.id' },
      { name: 'paymentMethod', type: 'string', isRequired: true },
      { name: 'paymentStatus', type: 'string', isRequired: true },
      { name: 'transactionId', type: 'string?' },
      { name: 'isRecurring', type: 'boolean', isRequired: true },
      { name: 'isAnonymous', type: 'boolean', isRequired: true },
      { name: 'isTaxDeductible', type: 'boolean', isRequired: true },
      { name: 'donationDate', type: 'datetime', isRequired: true },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
    ],
    relationships: [],
  },
  {
    name: 'DonationFund',
    displayName: 'Donation Fund',
    scope: 'tenant',
    category: 'Financial',
    icon: <DollarSign size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string?' },
      { name: 'code', type: 'string', isRequired: true },
      { name: 'goalAmount', type: 'number?' },
      { name: 'currentAmount', type: 'number', isRequired: true },
      { name: 'isActive', type: 'boolean', isRequired: true },
      { name: 'isTaxDeductible', type: 'boolean', isRequired: true },
      { name: 'startDate', type: 'date?' },
      { name: 'endDate', type: 'date?' },
      { name: 'createdBy', type: 'string', isRequired: true },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
    ],
    relationships: [
      { target: 'TenantDonation', type: '1-N', label: 'receives donations' },
    ],
  },
  {
    name: 'TenantInvitation',
    displayName: 'Invitation',
    scope: 'tenant',
    category: 'Communication',
    icon: <Mail size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'email', type: 'string', isRequired: true },
      { name: 'firstName', type: 'string?' },
      { name: 'lastName', type: 'string?' },
      { name: 'role', type: 'TenantRole', isRequired: true },
      { name: 'invitedBy', type: 'string', isForeignKey: true, foreignKeyRef: 'GlobalUser.id', isRequired: true },
      { name: 'invitedByName', type: 'string', isRequired: true },
      { name: 'token', type: 'string', isRequired: true },
      { name: 'status', type: 'string', isRequired: true },
      { name: 'personalMessage', type: 'string?' },
      { name: 'expiresAt', type: 'datetime', isRequired: true },
      { name: 'acceptedAt', type: 'datetime?' },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
    ],
    relationships: [],
  },
  {
    name: 'InternalNote',
    displayName: 'Internal Note',
    scope: 'tenant',
    category: 'Church Data',
    icon: <FileText size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'subjectType', type: 'string', isRequired: true },
      { name: 'subjectId', type: 'string', isRequired: true },
      { name: 'subjectName', type: 'string', isRequired: true },
      { name: 'title', type: 'string?' },
      { name: 'content', type: 'string', isRequired: true },
      { name: 'noteType', type: 'string', isRequired: true },
      { name: 'isConfidential', type: 'boolean', isRequired: true },
      { name: 'visibleToRoles', type: 'TenantRole[]', isRequired: true },
      { name: 'requiresFollowUp', type: 'boolean', isRequired: true },
      { name: 'followUpDate', type: 'date?' },
      { name: 'createdBy', type: 'string', isRequired: true },
      { name: 'createdByName', type: 'string', isRequired: true },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
      { name: 'deletedAt', type: 'datetime?' },
    ],
    relationships: [],
  },
  {
    name: 'Document',
    displayName: 'Document',
    scope: 'tenant',
    category: 'Church Data',
    icon: <FileText size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'fileName', type: 'string', isRequired: true },
      { name: 'originalFileName', type: 'string', isRequired: true },
      { name: 'fileType', type: 'string', isRequired: true },
      { name: 'mimeType', type: 'string', isRequired: true },
      { name: 'fileSize', type: 'number', isRequired: true },
      { name: 'fileUrl', type: 'string', isRequired: true },
      { name: 'category', type: 'string', isRequired: true },
      { name: 'folderId', type: 'string?', isForeignKey: true, foreignKeyRef: 'DocumentFolder.id' },
      { name: 'isPublic', type: 'boolean', isRequired: true },
      { name: 'uploadedBy', type: 'string', isRequired: true },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
      { name: 'deletedAt', type: 'datetime?' },
    ],
    relationships: [],
  },
  {
    name: 'PlatformAuditLog',
    displayName: 'Platform Audit Log',
    scope: 'global',
    category: 'System',
    icon: <ClipboardList size={16} color={COLORS.global} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string?', isForeignKey: true, foreignKeyRef: 'Tenant.id' },
      { name: 'userId', type: 'string', isForeignKey: true, foreignKeyRef: 'GlobalUser.id', isRequired: true },
      { name: 'userName', type: 'string', isRequired: true },
      { name: 'userEmail', type: 'string', isRequired: true },
      { name: 'action', type: 'string', isRequired: true },
      { name: 'resource', type: 'string', isRequired: true },
      { name: 'resourceId', type: 'string?' },
      { name: 'previousValue', type: 'JSON?' },
      { name: 'newValue', type: 'JSON?' },
      { name: 'ipAddress', type: 'string?' },
      { name: 'createdAt', type: 'datetime', isRequired: true },
    ],
    relationships: [],
  },
  {
    name: 'TenantAuditLog',
    displayName: 'Tenant Audit Log',
    scope: 'tenant',
    category: 'System',
    icon: <ClipboardList size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'userId', type: 'string', isForeignKey: true, foreignKeyRef: 'GlobalUser.id', isRequired: true },
      { name: 'userName', type: 'string', isRequired: true },
      { name: 'userEmail', type: 'string', isRequired: true },
      { name: 'userRole', type: 'TenantRole', isRequired: true },
      { name: 'action', type: 'string', isRequired: true },
      { name: 'actionCategory', type: 'string', isRequired: true },
      { name: 'resourceType', type: 'string', isRequired: true },
      { name: 'resourceId', type: 'string', isRequired: true },
      { name: 'resourceName', type: 'string?' },
      { name: 'previousValue', type: 'JSON?' },
      { name: 'newValue', type: 'JSON?' },
      { name: 'ipAddress', type: 'string?' },
      { name: 'createdAt', type: 'datetime', isRequired: true },
    ],
    relationships: [],
  },
  {
    name: 'TenantFeatureFlag',
    displayName: 'Feature Flag',
    scope: 'tenant',
    category: 'System',
    icon: <Shield size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'featureKey', type: 'string', isRequired: true },
      { name: 'isEnabled', type: 'boolean', isRequired: true },
      { name: 'configuration', type: 'JSON?' },
      { name: 'enabledBy', type: 'string?' },
      { name: 'enabledAt', type: 'datetime?' },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
    ],
    relationships: [],
  },
  {
    name: 'TenantUsageMetrics',
    displayName: 'Usage Metrics',
    scope: 'tenant',
    category: 'System',
    icon: <Database size={16} color={COLORS.tenant} />,
    fields: [
      { name: 'id', type: 'string', isPrimaryKey: true },
      { name: 'tenantId', type: 'string', isForeignKey: true, foreignKeyRef: 'Tenant.id', isRequired: true },
      { name: 'period', type: 'string', isRequired: true },
      { name: 'totalMembers', type: 'number', isRequired: true },
      { name: 'activeMembers', type: 'number', isRequired: true },
      { name: 'newMembers', type: 'number', isRequired: true },
      { name: 'totalEvents', type: 'number', isRequired: true },
      { name: 'totalDonations', type: 'number', isRequired: true },
      { name: 'donationAmount', type: 'number', isRequired: true },
      { name: 'storageUsedBytes', type: 'number', isRequired: true },
      { name: 'createdAt', type: 'datetime', isRequired: true },
      { name: 'updatedAt', type: 'datetime', isRequired: true },
    ],
    relationships: [],
  },
];

const categories = [
  'Authentication',
  'Core',
  'Access & Roles',
  'Profiles',
  'Church Data',
  'Communication',
  'Financial',
  'System',
];

const EntityCard: React.FC<{
  entity: Entity;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ entity, isExpanded, onToggle }) => {
  const isJoinTable = entity.name.includes('Membership') || entity.name.includes('Registration');
  
  const getBorderColor = () => {
    if (isJoinTable) return COLORS.joinTableBorder;
    return entity.scope === 'global' ? COLORS.globalBorder : COLORS.tenantBorder;
  };

  const getHeaderBg = () => {
    if (isJoinTable) return COLORS.joinTableBg;
    return entity.scope === 'global' ? COLORS.globalBg : COLORS.tenantBg;
  };

  const getScopeColor = () => {
    if (isJoinTable) return COLORS.joinTable;
    return entity.scope === 'global' ? COLORS.global : COLORS.tenant;
  };

  return (
    <View style={[styles.entityCard, { borderColor: getBorderColor() }]}>
      <TouchableOpacity
        style={[styles.entityHeader, { backgroundColor: getHeaderBg() }]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.entityHeaderLeft}>
          {entity.icon}
          <Text style={[styles.entityName, { color: getScopeColor() }]}>
            {entity.displayName}
          </Text>
        </View>
        <View style={styles.entityHeaderRight}>
          <View style={[styles.scopeBadge, { backgroundColor: getScopeColor() }]}>
            <Text style={styles.scopeBadgeText}>
              {isJoinTable ? 'JOIN' : entity.scope.toUpperCase()}
            </Text>
          </View>
          {isExpanded ? (
            <ChevronDown size={18} color={COLORS.textMuted} />
          ) : (
            <ChevronRight size={18} color={COLORS.textMuted} />
          )}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.entityBody}>
          <Text style={styles.tableNameText}>{entity.name}</Text>
          
          <View style={styles.fieldsContainer}>
            {entity.fields.map((field, index) => (
              <View key={index} style={styles.fieldRow}>
                <View style={styles.fieldNameContainer}>
                  {field.isPrimaryKey && (
                    <Key size={12} color={COLORS.primaryKey} style={styles.keyIcon} />
                  )}
                  {field.isForeignKey && !field.isPrimaryKey && (
                    <Link2 size={12} color={COLORS.foreignKey} style={styles.keyIcon} />
                  )}
                  <Text style={[
                    styles.fieldName,
                    field.isPrimaryKey && styles.primaryKeyText,
                    field.isForeignKey && !field.isPrimaryKey && styles.foreignKeyText,
                  ]}>
                    {field.name}
                  </Text>
                  {field.isRequired && <Text style={styles.requiredMark}>*</Text>}
                </View>
                <Text style={styles.fieldType}>{field.type}</Text>
              </View>
            ))}
          </View>

          {entity.fields.some(f => f.isForeignKey && f.foreignKeyRef) && (
            <View style={styles.fkReferences}>
              <Text style={styles.fkTitle}>Foreign Key References:</Text>
              {entity.fields.filter(f => f.isForeignKey && f.foreignKeyRef).map((field, index) => (
                <Text key={index} style={styles.fkText}>
                  {field.name} → {field.foreignKeyRef}
                </Text>
              ))}
            </View>
          )}

          {entity.relationships.length > 0 && (
            <View style={styles.relationshipsContainer}>
              <Text style={styles.relTitle}>Relationships:</Text>
              {entity.relationships.map((rel, index) => (
                <View key={index} style={styles.relRow}>
                  <Text style={styles.relType}>[{rel.type}]</Text>
                  <Text style={styles.relTarget}>{rel.target}</Text>
                  {rel.label && <Text style={styles.relLabel}>({rel.label})</Text>}
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default function ERDPage() {
  const router = useRouter();
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const toggleEntity = (name: string) => {
    setExpandedEntities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedEntities(new Set(entities.map(e => e.name)));
  };

  const collapseAll = () => {
    setExpandedEntities(new Set());
  };

  const filteredEntities = selectedCategory
    ? entities.filter(e => e.category === selectedCategory)
    : entities;

  const globalCount = entities.filter(e => e.scope === 'global').length;
  const tenantCount = entities.filter(e => e.scope === 'tenant').length;
  const joinCount = entities.filter(e => 
    e.name.includes('Membership') || e.name.includes('Registration')
  ).length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Database Schema (ERD)',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#1E293B" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View style={styles.titleRow}>
            <Database size={28} color={COLORS.text} />
            <Text style={styles.pageTitle}>Entity Relationship Diagram</Text>
          </View>
          <Text style={styles.pageSubtitle}>
            Multi-Tenant Church Management Platform Database Schema
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: COLORS.globalBg }]}>
            <Globe size={20} color={COLORS.global} />
            <Text style={[styles.statNumber, { color: COLORS.global }]}>{globalCount}</Text>
            <Text style={styles.statLabel}>Global</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.tenantBg }]}>
            <Building2 size={20} color={COLORS.tenant} />
            <Text style={[styles.statNumber, { color: COLORS.tenant }]}>{tenantCount}</Text>
            <Text style={styles.statLabel}>Tenant-Scoped</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.joinTableBg }]}>
            <Link2 size={20} color={COLORS.joinTable} />
            <Text style={[styles.statNumber, { color: COLORS.joinTable }]}>{joinCount}</Text>
            <Text style={styles.statLabel}>Join Tables</Text>
          </View>
        </View>

        <View style={styles.legendSection}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <Key size={14} color={COLORS.primaryKey} />
              <Text style={styles.legendText}>Primary Key (PK)</Text>
            </View>
            <View style={styles.legendItem}>
              <Link2 size={14} color={COLORS.foreignKey} />
              <Text style={styles.legendText}>Foreign Key (FK)</Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={styles.requiredMark}>*</Text>
              <Text style={styles.legendText}>Required Field</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={expandAll}>
            <Text style={styles.actionButtonText}>Expand All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={collapseAll}>
            <Text style={styles.actionButtonText}>Collapse All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              !selectedCategory && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[
              styles.categoryChipText,
              !selectedCategory && styles.categoryChipTextActive,
            ]}>
              All ({entities.length})
            </Text>
          </TouchableOpacity>
          {categories.map(cat => {
            const count = entities.filter(e => e.category === cat).length;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextActive,
                ]}>
                  {cat} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.entitiesContainer}>
          {filteredEntities.map(entity => (
            <EntityCard
              key={entity.name}
              entity={entity}
              isExpanded={expandedEntities.has(entity.name)}
              onToggle={() => toggleEntity(entity.name)}
            />
          ))}
        </View>

        <View style={styles.relationshipDiagram}>
          <Text style={styles.sectionTitle}>Key Relationships</Text>
          
          <View style={styles.relationshipCard}>
            <Text style={styles.relDiagramTitle}>User → Tenant (Many-to-Many)</Text>
            <View style={styles.relDiagramFlow}>
              <View style={[styles.relBox, { backgroundColor: COLORS.globalBg }]}>
                <Text style={styles.relBoxText}>GlobalUser</Text>
              </View>
              <View style={styles.relArrow}>
                <Text style={styles.relArrowText}>1:N</Text>
              </View>
              <View style={[styles.relBox, { backgroundColor: COLORS.joinTableBg }]}>
                <Text style={styles.relBoxText}>TenantMembership</Text>
              </View>
              <View style={styles.relArrow}>
                <Text style={styles.relArrowText}>N:1</Text>
              </View>
              <View style={[styles.relBox, { backgroundColor: COLORS.globalBg }]}>
                <Text style={styles.relBoxText}>Tenant</Text>
              </View>
            </View>
          </View>

          <View style={styles.relationshipCard}>
            <Text style={styles.relDiagramTitle}>Membership → Profile (1-to-1)</Text>
            <View style={styles.relDiagramFlow}>
              <View style={[styles.relBox, { backgroundColor: COLORS.joinTableBg }]}>
                <Text style={styles.relBoxText}>TenantMembership</Text>
              </View>
              <View style={styles.relArrow}>
                <Text style={styles.relArrowText}>1:1</Text>
              </View>
              <View style={[styles.relBox, { backgroundColor: COLORS.tenantBg }]}>
                <Text style={styles.relBoxText}>BaseMemberProfile</Text>
              </View>
              <View style={styles.relArrow}>
                <Text style={styles.relArrowText}>1:1</Text>
              </View>
              <View style={[styles.relBox, { backgroundColor: COLORS.tenantBg }]}>
                <Text style={styles.relBoxText}>*Profile (Specialized)</Text>
              </View>
            </View>
          </View>

          <View style={styles.relationshipCard}>
            <Text style={styles.relDiagramTitle}>Profile → Ministry (Many-to-Many)</Text>
            <View style={styles.relDiagramFlow}>
              <View style={[styles.relBox, { backgroundColor: COLORS.tenantBg }]}>
                <Text style={styles.relBoxText}>BaseMemberProfile</Text>
              </View>
              <View style={styles.relArrow}>
                <Text style={styles.relArrowText}>1:N</Text>
              </View>
              <View style={[styles.relBox, { backgroundColor: COLORS.joinTableBg }]}>
                <Text style={styles.relBoxText}>MinistryMembership</Text>
              </View>
              <View style={styles.relArrow}>
                <Text style={styles.relArrowText}>N:1</Text>
              </View>
              <View style={[styles.relBox, { backgroundColor: COLORS.tenantBg }]}>
                <Text style={styles.relBoxText}>TenantMinistry</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tenantIsolationSection}>
          <Text style={styles.sectionTitle}>Tenant Isolation</Text>
          <View style={styles.isolationCard}>
            <Shield size={24} color={COLORS.tenant} />
            <View style={styles.isolationContent}>
              <Text style={styles.isolationTitle}>Strict Data Isolation</Text>
              <Text style={styles.isolationText}>
                All tenant-scoped tables include a <Text style={styles.codeText}>tenantId</Text> field.
                Queries must always filter by tenantId to ensure data isolation between church organizations.
                Cross-tenant access is prohibited except for platform administrators.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Total Entities: {entities.length} | Global: {globalCount} | Tenant-Scoped: {tenantCount}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: 8,
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  headerSection: {
    padding: 20,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
  legendSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500' as const,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  categoryChipText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  entitiesContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  entityCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  entityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  entityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  entityName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  entityHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scopeBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  scopeBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  entityBody: {
    padding: 14,
    paddingTop: 0,
  },
  tableNameText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  fieldsContainer: {
    gap: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  fieldNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  keyIcon: {
    marginRight: 6,
  },
  fieldName: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  primaryKeyText: {
    color: COLORS.primaryKey,
    fontWeight: '600' as const,
  },
  foreignKeyText: {
    color: COLORS.foreignKey,
  },
  requiredMark: {
    color: COLORS.primaryKey,
    marginLeft: 2,
    fontWeight: '700' as const,
  },
  fieldType: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
  fkReferences: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F8F5FF',
    borderRadius: 8,
  },
  fkTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.foreignKey,
    marginBottom: 6,
  },
  fkText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  relationshipsContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
  },
  relTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.global,
    marginBottom: 6,
  },
  relRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  relType: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: COLORS.textMuted,
  },
  relTarget: {
    fontSize: 12,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  relLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  relationshipDiagram: {
    padding: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 16,
  },
  relationshipCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  relDiagramTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 12,
  },
  relDiagramFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  relBox: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  relBoxText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: COLORS.text,
    textAlign: 'center',
  },
  relArrow: {
    paddingHorizontal: 4,
  },
  relArrowText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: COLORS.textMuted,
  },
  tenantIsolationSection: {
    padding: 20,
  },
  isolationCard: {
    backgroundColor: COLORS.tenantBg,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.tenantBorder,
  },
  isolationContent: {
    flex: 1,
  },
  isolationTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.tenant,
    marginBottom: 6,
  },
  isolationText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  codeText: {
    fontFamily: 'monospace',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
