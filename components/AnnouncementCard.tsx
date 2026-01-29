import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Pin, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Announcement } from '@/types';

interface AnnouncementCardProps {
  announcement: Announcement;
  onPress?: () => void;
}

export default function AnnouncementCard({ announcement, onPress }: AnnouncementCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  return (
    <TouchableOpacity 
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={[
        styles.container,
        announcement.isPinned && styles.pinnedContainer,
        { transform: [{ scale: scaleAnim }] }
      ]}>
      {announcement.isPinned && (
        <View style={styles.pinnedBadge}>
          <Pin size={12} color={Colors.primary} />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <Image 
          source={{ uri: announcement.authorAvatar }} 
          style={styles.avatar}
          contentFit="cover"
        />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{announcement.author}</Text>
          <Text style={styles.authorRole}>{announcement.authorRole}</Text>
        </View>
        <Text style={styles.date}>{formatDate(announcement.date)}</Text>
      </View>
      
      <Text style={styles.title}>{announcement.title}</Text>
      <Text style={styles.content} numberOfLines={2}>
        {announcement.content}
      </Text>
      
      {announcement.ministryName && (
        <View style={styles.ministryTag}>
          <Text style={styles.ministryTagText}>{announcement.ministryName}</Text>
        </View>
      )}
      
      <View style={styles.footer}>
        <Text style={styles.readMore}>Read more</Text>
        <ChevronRight size={16} color={Colors.primary} />
      </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = today.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pinnedContainer: {
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: '#F0FDFA',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
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
  },
  authorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  authorRole: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  date: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  content: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  ministryTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  ministryTagText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  readMore: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
