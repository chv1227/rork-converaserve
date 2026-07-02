import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Users, Music, Heart, Baby, HandHeart, Video, Plus, Check, Clock } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Radius } from '@/constants/designTokens';
import { Ministry } from '@/types';
import React from "react";

interface MinistryCardProps {
  ministry: Ministry;
  onPress?: () => void;
  isMember?: boolean;
  isPending?: boolean;
  onAction?: () => void;
}

const iconMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Music,
  Users,
  Heart,
  Baby,
  HandHeart,
  Video,
};

export default function MinistryCard({ ministry, onPress, isMember, isPending, onAction }: MinistryCardProps) {
  const { colors } = useTheme();
  const IconComponent = iconMap[ministry.icon] || Users;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <Image 
        source={{ uri: ministry.image }} 
        style={styles.image}
        contentFit="cover"
      />
      <View style={styles.overlay} />
      
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.iconContainer, { backgroundColor: ministry.color }]}>
            <IconComponent size={20} color="#FFFFFF" />
          </View>
          
          {onAction && (
            <TouchableOpacity 
              style={[
                styles.actionButton,
                isMember ? styles.actionButtonMember : isPending ? styles.actionButtonPending : styles.actionButtonJoin
              ]}
              onPress={(e) => {
                e.stopPropagation();
                if (!isPending) {
                  onAction();
                }
              }}
              activeOpacity={isPending ? 1 : 0.7}
            >
              {isMember ? (
                <>
                  <Check size={14} color={colors.primary} />
                  <Text style={[styles.actionTextMember, { color: colors.primary }]}>Joined</Text>
                </>
              ) : isPending ? (
                <>
                  <Clock size={14} color={colors.warning} />
                  <Text style={[styles.actionTextPending, { color: colors.warning }]}>Pending</Text>
                </>
              ) : (
                <>
                  <Plus size={14} color="#FFFFFF" />
                  <Text style={styles.actionTextJoin}>Join</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.info}>
          <Text style={styles.name}>{ministry.name}</Text>
          <Text style={styles.description} numberOfLines={2}>{ministry.description}</Text>
          
          <View style={styles.footer}>
            <Users size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.memberCount}>{ministry.memberCount} members</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 5 },
    }),
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  actionButtonJoin: {
    backgroundColor: '#1E40AF',
  },
  actionButtonMember: {
    backgroundColor: '#FFFFFF',
  },
  actionButtonPending: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  actionTextJoin: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  actionTextMember: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  actionTextPending: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  info: {
    gap: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  memberCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500' as const,
  },
});
