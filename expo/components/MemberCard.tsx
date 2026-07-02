import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Crown, Shield, User, Mail, Phone } from 'lucide-react-native';
import { LightTheme } from '@/constants/colors';
import { MinistryMember, Ministry } from '@/types';
import { MinistryDots } from '@/components/MinistryIndicators';

interface MemberCardProps {
  member: MinistryMember;
  onPress?: () => void;
  compact?: boolean;
  ministries?: Ministry[];
}

export default function MemberCard({ member, onPress, compact = false, ministries = [] }: MemberCardProps) {
  const getRoleIcon = () => {
    switch (member.role) {
      case 'leader':
        return <Crown size={14} color={LightTheme.warning} />;
      case 'admin':
        return <Shield size={14} color={LightTheme.tertiary} />;
      default:
        return null;
    }
  };

  const getRoleColor = () => {
    switch (member.role) {
      case 'leader': return LightTheme.warning;
      case 'admin': return LightTheme.tertiary;
      default: return LightTheme.textTertiary;
    }
  };

  if (compact) {
    return (
      <TouchableOpacity 
        style={styles.compactContainer} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.compactAvatarContainer}>
          {member.avatar ? (
            <Image source={{ uri: member.avatar }} style={styles.compactAvatar} />
          ) : (
            <View style={[styles.compactAvatar, styles.avatarPlaceholder]}>
              <User size={14} color={LightTheme.textTertiary} />
            </View>
          )}
          {ministries.length > 0 && (
            <View style={styles.compactDotsContainer}>
              <MinistryDots ministries={ministries} maxDots={3} size="small" />
            </View>
          )}
        </View>
        <View style={styles.compactInfo}>
          <Text style={styles.compactName} numberOfLines={1}>{member.name}</Text>
          {member.role !== 'member' && (
            <View style={styles.compactRoleRow}>
              {getRoleIcon()}
              <Text style={[styles.compactRole, { color: getRoleColor() }]}>
                {member.role}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {member.avatar ? (
          <Image source={{ uri: member.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <User size={20} color={LightTheme.textTertiary} />
          </View>
        )}
        {ministries.length > 0 && (
          <View style={styles.dotsContainer}>
            <MinistryDots ministries={ministries} maxDots={4} size="small" />
          </View>
        )}
      </View>
      
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{member.name}</Text>
          {member.role !== 'member' && (
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor() + '20' }]}>
              {getRoleIcon()}
              <Text style={[styles.roleText, { color: getRoleColor() }]}>
                {member.role}
              </Text>
            </View>
          )}
        </View>
        
        {ministries.length > 0 && (
          <View style={styles.ministryLabelsRow}>
            {ministries.slice(0, 2).map((m) => (
              <View key={m.id} style={[styles.ministryLabel, { backgroundColor: m.color + '15' }]}>
                <View style={[styles.ministryLabelDot, { backgroundColor: m.color }]} />
                <Text style={[styles.ministryLabelText, { color: m.color }]} numberOfLines={1}>
                  {m.name}
                </Text>
              </View>
            ))}
            {ministries.length > 2 && (
              <Text style={styles.moreMinistries}>+{ministries.length - 2}</Text>
            )}
          </View>
        )}
        
        <View style={styles.contactRow}>
          {member.email && (
            <View style={styles.contactItem}>
              <Mail size={12} color={LightTheme.textTertiary} />
              <Text style={styles.contactText} numberOfLines={1}>{member.email}</Text>
            </View>
          )}
          {!!member.phone && (
            <View style={styles.contactItem}>
              <Phone size={12} color={LightTheme.textTertiary} />
              <Text style={styles.contactText}>{member.phone}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LightTheme.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: -2,
    right: -4,
  },
  avatarPlaceholder: {
    backgroundColor: LightTheme.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: LightTheme.text,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 12,
    color: LightTheme.textTertiary,
  },
  compactContainer: {
    alignItems: 'center',
    width: 72,
    marginRight: 12,
  },
  compactAvatarContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  compactAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  compactDotsContainer: {
    position: 'absolute',
    bottom: -2,
    right: -6,
  },
  compactInfo: {
    alignItems: 'center',
  },
  compactName: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: LightTheme.text,
    textAlign: 'center',
  },
  compactRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  compactRole: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  ministryLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  ministryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  ministryLabelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ministryLabelText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  moreMinistries: {
    fontSize: 10,
    color: LightTheme.textTertiary,
    fontWeight: '500' as const,
  },
});
