import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Users } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Conversation } from '@/types';

interface ConversationItemProps {
  conversation: Conversation;
  onPress?: () => void;
}

export default function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarContainer}>
        <View style={[
          styles.avatarBorder,
          conversation.ministryColor ? { borderColor: conversation.ministryColor } : null
        ]}>
          <Image 
            source={{ uri: conversation.avatar }} 
            style={styles.avatar}
            contentFit="cover"
          />
        </View>
        {conversation.isGroup && (
          <View style={[
            styles.groupBadge,
            conversation.ministryColor ? { backgroundColor: conversation.ministryColor } : null
          ]}>
            <Users size={10} color={Colors.textInverse} />
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{conversation.name}</Text>
          <Text style={[
            styles.time,
            conversation.unreadCount > 0 && styles.timeUnread
          ]}>
            {conversation.lastMessageTime}
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text 
            style={[
              styles.lastMessage,
              conversation.unreadCount > 0 && styles.lastMessageUnread
            ]} 
            numberOfLines={1}
          >
            {conversation.lastMessage}
          </Text>
          
          {conversation.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
              </Text>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarBorder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    padding: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  groupBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  timeUnread: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    color: Colors.text,
    fontWeight: '500' as const,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
});
