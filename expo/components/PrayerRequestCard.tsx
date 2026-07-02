import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Heart, User, Check } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Radius } from '@/constants/designTokens';
import { PrayerRequest } from '@/types';

interface PrayerRequestCardProps {
  request: PrayerRequest;
  onPress?: () => void;
  onPray?: () => void;
}

export default function PrayerRequestCard({ request, onPress, onPray }: PrayerRequestCardProps) {
  const { colors } = useTheme();
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        request.isAnswered && { backgroundColor: colors.successLight, borderLeftColor: colors.success },
        { borderLeftColor: colors.tertiary },
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {request.isAnswered && (
        <View style={[styles.answeredBadge, { backgroundColor: colors.success + '20' }]}>
          <Check size={12} color={colors.success} />
          <Text style={[styles.answeredText, { color: colors.success }]}>Answered</Text>
        </View>
      )}

      <View style={styles.header}>
        {request.isAnonymous ? (
          <View style={[styles.avatar, styles.anonymousAvatar, { backgroundColor: colors.surfaceSecondary }]}>
            <User size={18} color={colors.textTertiary} />
          </View>
        ) : request.authorAvatar ? (
          <Image source={{ uri: request.authorAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
            <User size={18} color={colors.textTertiary} />
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text style={[styles.authorName, { color: colors.text }]}>
            {request.isAnonymous ? 'Anonymous' : request.authorName}
          </Text>
          <Text style={[styles.timestamp, { color: colors.textTertiary }]}>{formatDate(request.createdAt)}</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{request.title}</Text>
      <Text style={[styles.content, { color: colors.textSecondary }]} numberOfLines={3}>{request.content}</Text>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.prayButton,
            { backgroundColor: request.isAnswered ? colors.success + '20' : colors.primary + '15' },
          ]} 
          onPress={onPray}
          activeOpacity={0.7}
        >
          <Heart 
            size={16} 
            color={request.isAnswered ? colors.success : colors.primary} 
            fill={request.isAnswered ? colors.success : 'transparent'}
          />
          <Text style={[
            styles.prayButtonText,
            { color: request.isAnswered ? colors.success : colors.primary },
          ]}>
            {request.prayerCount} praying
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    }),
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  answeredText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonymousAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  timestamp: {
    fontSize: 13,
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  prayButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
