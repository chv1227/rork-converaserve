import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MapPin, Clock, Users } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useTheme } from '@/providers/ThemeProvider';
import { Event } from '@/types';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
  compact?: boolean;
}

export default function EventCard({ event, onPress, compact = false }: EventCardProps) {
  const { colors } = useTheme();
  const eventDate = new Date(event.date);
  const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = eventDate.getDate();
  const month = eventDate.toLocaleDateString('en-US', { month: 'short' });

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

  if (compact) {
    return (
      <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={1}>
        <Animated.View style={[styles.compactContainer, { backgroundColor: colors.surface, transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.compactDateBox, { backgroundColor: event.color + '15' }]}>
          <Text style={[styles.compactDayNum, { color: event.color }]}>{dayNum}</Text>
          <Text style={[styles.compactMonth, { color: event.color }]}>{month}</Text>
        </View>
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, { color: colors.text }]} numberOfLines={1}>{event.title}</Text>
          <View style={styles.compactMeta}>
            <Clock size={12} color={colors.textTertiary} />
            <Text style={[styles.compactMetaText, { color: colors.textTertiary }]}>{event.time}</Text>
            <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
            <Text style={[styles.compactMinistry, { color: colors.textSecondary }]}>{event.ministryName}</Text>
          </View>
        </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={1}>
      <Animated.View style={[styles.container, { backgroundColor: colors.surface, transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.dateColumn}>
        <View style={[styles.dateBox, { backgroundColor: event.color }]}>
          <Text style={styles.dayName}>{dayName}</Text>
          <Text style={styles.dayNum}>{dayNum}</Text>
          <Text style={styles.month}>{month}</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        <View style={styles.ministryBadge}>
          <View style={[styles.ministryDot, { backgroundColor: event.color }]} />
          <Text style={[styles.ministryName, { color: colors.textSecondary }]}>{event.ministryName}</Text>
        </View>
        
        <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>{event.description}</Text>
        
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Clock size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>{event.time}</Text>
          </View>
          <View style={styles.metaItem}>
            <MapPin size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>{event.location}</Text>
          </View>
        </View>
        
        <View style={styles.attendeesRow}>
          <Users size={14} color={colors.primary} />
          <Text style={[styles.attendeesText, { color: colors.primary }]}>{event.attendees} attending</Text>
        </View>
      </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateColumn: {
    marginRight: 14,
  },
  dateBox: {
    width: 56,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textInverse,
    opacity: 0.9,
    textTransform: 'uppercase',
  },
  dayNum: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.textInverse,
    marginVertical: 2,
  },
  month: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textInverse,
    opacity: 0.9,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
  },
  ministryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ministryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  ministryName: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendeesText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  compactContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  compactDateBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  compactDayNum: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  compactMonth: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactMetaText: {
    fontSize: 12,
  },
  compactMinistry: {
    fontSize: 12,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 4,
  },
});
