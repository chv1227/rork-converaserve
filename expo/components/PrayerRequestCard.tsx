import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Heart, User, Check } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { PrayerRequest } from '@/types';

interface PrayerRequestCardProps {
  request: PrayerRequest;
  onPress?: () => void;
  onPray?: () => void;
}

export default function PrayerRequestCard({ request, onPress, onPray }: PrayerRequestCardProps) {
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
      style={[styles.container, request.isAnswered && styles.answeredContainer]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {request.isAnswered && (
        <View style={styles.answeredBadge}>
          <Check size={12} color={Colors.success} />
          <Text style={styles.answeredText}>Answered</Text>
        </View>
      )}

      <View style={styles.header}>
        {request.isAnonymous ? (
          <View style={[styles.avatar, styles.anonymousAvatar]}>
            <User size={18} color={Colors.textTertiary} />
          </View>
        ) : request.authorAvatar ? (
          <Image source={{ uri: request.authorAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <User size={18} color={Colors.textTertiary} />
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>
            {request.isAnonymous ? 'Anonymous' : request.authorName}
          </Text>
          <Text style={styles.timestamp}>{formatDate(request.createdAt)}</Text>
        </View>
      </View>

      <Text style={styles.title}>{request.title}</Text>
      <Text style={styles.content} numberOfLines={3}>{request.content}</Text>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.prayButton, request.isAnswered && styles.prayButtonAnswered]} 
          onPress={onPray}
          activeOpacity={0.7}
        >
          <Heart 
            size={16} 
            color={request.isAnswered ? Colors.success : Colors.primary} 
            fill={request.isAnswered ? Colors.success : 'transparent'}
          />
          <Text style={[styles.prayButtonText, request.isAnswered && styles.prayButtonTextAnswered]}>
            {request.prayerCount} praying
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: Colors.tertiary,
  },
  answeredContainer: {
    borderLeftColor: Colors.success,
    backgroundColor: Colors.successLight,
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    backgroundColor: Colors.success + '20',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  answeredText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.success,
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
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonymousAvatar: {
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  timestamp: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  content: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '15',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  prayButtonAnswered: {
    backgroundColor: Colors.success + '20',
  },
  prayButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  prayButtonTextAnswered: {
    color: Colors.success,
  },
});
