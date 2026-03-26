import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Users, Music, Heart, Baby, HandHeart, Video, Plus, Check, Clock } from 'lucide-react-native';
import Colors from '@/constants/colors';
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
            <IconComponent size={20} color={Colors.textInverse} />
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
                  <Check size={14} color={Colors.primary} />
                  <Text style={styles.actionTextMember}>Joined</Text>
                </>
              ) : isPending ? (
                <>
                  <Clock size={14} color={Colors.warning} />
                  <Text style={styles.actionTextPending}>Pending</Text>
                </>
              ) : (
                <>
                  <Plus size={14} color={Colors.textInverse} />
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
            <Users size={14} color={Colors.textInverse} style={{ opacity: 0.8 }} />
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
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
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
    backgroundColor: Colors.primary,
  },
  actionButtonMember: {
    backgroundColor: Colors.textInverse,
  },
  actionButtonPending: {
    backgroundColor: Colors.warning + '20',
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  actionTextJoin: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  actionTextMember: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  actionTextPending: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.warning,
  },
  info: {
    gap: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  description: {
    fontSize: 13,
    color: Colors.textInverse,
    opacity: 0.85,
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
    color: Colors.textInverse,
    opacity: 0.85,
    fontWeight: '500' as const,
  },
});
