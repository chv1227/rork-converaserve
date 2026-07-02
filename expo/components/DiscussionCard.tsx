import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { MessageCircle, Heart, Pin, User } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Radius } from '@/constants/designTokens';
import { DiscussionPost } from '@/types';

interface DiscussionCardProps {
  post: DiscussionPost;
  onPress?: () => void;
  onLike?: () => void;
}

export default function DiscussionCard({ post, onPress, onLike }: DiscussionCardProps) {
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'leader': return colors.primary;
      case 'admin': return colors.tertiary;
      default: return colors.textTertiary;
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surface }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {post.isPinned && (
        <View style={[styles.pinnedBadge, { backgroundColor: colors.warningLight }]}>
          <Pin size={12} color={colors.warning} />
          <Text style={[styles.pinnedText, { color: colors.warning }]}>Pinned</Text>
        </View>
      )}
      
      <View style={styles.header}>
        {post.authorAvatar ? (
          <Image source={{ uri: post.authorAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
            <User size={16} color={colors.textTertiary} />
          </View>
        )}
        <View style={styles.authorInfo}>
          <View style={styles.authorRow}>
            <Text style={[styles.authorName, { color: colors.text }]}>{post.authorName}</Text>
            {post.authorRole !== 'member' && (
              <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(post.authorRole) + '20' }]}>
                <Text style={[styles.roleText, { color: getRoleBadgeColor(post.authorRole) }]}>
                  {post.authorRole}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.timestamp, { color: colors.textTertiary }]}>{formatDate(post.createdAt)}</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
      <Text style={[styles.content, { color: colors.textSecondary }]} numberOfLines={3}>{post.content}</Text>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <Heart size={16} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>{post.likesCount}</Text>
        </TouchableOpacity>
        <View style={styles.actionButton}>
          <MessageCircle size={16} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>{post.commentsCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    }),
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pinnedText: {
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
  authorInfo: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
});
