import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Users } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Conversation } from '@/types';

interface ConversationItemProps {
  conversation: Conversation;
  onPress?: () => void;
}

export default function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const { colors } = useTheme();
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
            <Users size={10} color="#FFFFFF" />
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
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
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
  },
  timeUnread: {
    fontWeight: '600' as const,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    fontWeight: '500' as const,
  },
  unreadBadge: {
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
    color: '#FFFFFF',
  },
});
