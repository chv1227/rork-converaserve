import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { MessageCircle, Heart, Pin, User } from 'lucide-react-native';
import { LightTheme } from '@/constants/colors';
import { DiscussionPost } from '@/types';

interface DiscussionCardProps {
  post: DiscussionPost;
  onPress?: () => void;
  onLike?: () => void;
}

export default function DiscussionCard({ post, onPress, onLike }: DiscussionCardProps) {
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
      case 'leader': return LightTheme.primary;
      case 'admin': return LightTheme.tertiary;
      default: return LightTheme.textTertiary;
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {post.isPinned && (
        <View style={styles.pinnedBadge}>
          <Pin size={12} color={LightTheme.warning} />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}
      
      <View style={styles.header}>
        {post.authorAvatar ? (
          <Image source={{ uri: post.authorAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <User size={16} color={LightTheme.textTertiary} />
          </View>
        )}
        <View style={styles.authorInfo}>
          <View style={styles.authorRow}>
            <Text style={styles.authorName}>{post.authorName}</Text>
            {post.authorRole !== 'member' && (
              <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(post.authorRole) + '20' }]}>
                <Text style={[styles.roleText, { color: getRoleBadgeColor(post.authorRole) }]}>
                  {post.authorRole}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.timestamp}>{formatDate(post.createdAt)}</Text>
        </View>
      </View>

      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.content} numberOfLines={3}>{post.content}</Text>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <Heart size={16} color={LightTheme.textSecondary} />
          <Text style={styles.actionText}>{post.likesCount}</Text>
        </TouchableOpacity>
        <View style={styles.actionButton}>
          <MessageCircle size={16} color={LightTheme.textSecondary} />
          <Text style={styles.actionText}>{post.commentsCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    backgroundColor: LightTheme.warningLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pinnedText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: LightTheme.warning,
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
    backgroundColor: LightTheme.surfaceSecondary,
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
    color: LightTheme.text,
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
    color: LightTheme.textTertiary,
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: LightTheme.text,
    marginBottom: 6,
  },
  content: {
    fontSize: 14,
    color: LightTheme.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: LightTheme.borderLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    color: LightTheme.textSecondary,
    fontWeight: '500' as const,
  },
});
