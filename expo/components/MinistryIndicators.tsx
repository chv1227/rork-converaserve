import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Info, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { getMinistryColor, MINISTRY_LEGEND } from '@/constants/ministryColors';
import { Ministry } from '@/types';

interface MinistryDotsProps {
  ministries: Ministry[];
  maxDots?: number;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  onPress?: () => void;
}

export function MinistryDots({ 
  ministries, 
  maxDots = 4, 
  size = 'small',
  showTooltip = true,
  onPress 
}: MinistryDotsProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const dotSizes = {
    small: 8,
    medium: 10,
    large: 12,
  };

  const dotSize = dotSizes[size];
  const visibleMinistries = ministries.slice(0, maxDots);
  const remainingCount = ministries.length - maxDots;

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else if (showTooltip && ministries.length > 0) {
      setTooltipVisible(true);
    }
  }, [onPress, showTooltip, ministries.length]);

  if (ministries.length === 0) return null;

  return (
    <>
      <TouchableOpacity 
        style={styles.dotsContainer} 
        onPress={handlePress}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {visibleMinistries.map((ministry, index) => (
          <View
            key={ministry.id}
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: ministry.color || getMinistryColor(ministry.name, ministry.id),
                marginLeft: index > 0 ? -3 : 0,
                zIndex: visibleMinistries.length - index,
              },
            ]}
          />
        ))}
        {remainingCount > 0 && (
          <View style={[styles.moreBadge, { height: dotSize + 4, minWidth: dotSize + 8 }]}>
            <Text style={[styles.moreText, { fontSize: dotSize - 2 }]}>+{remainingCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <MinistryTooltipModal
        visible={tooltipVisible}
        ministries={ministries}
        onClose={() => setTooltipVisible(false)}
      />
    </>
  );
}

interface MinistryLegendProps {
  ministries?: Ministry[];
  showAll?: boolean;
  compact?: boolean;
  onInfoPress?: () => void;
}

export function MinistryLegend({ 
  ministries, 
  showAll = false, 
  compact = false,
  onInfoPress 
}: MinistryLegendProps) {
  const legendItems = showAll 
    ? MINISTRY_LEGEND 
    : ministries?.map(m => ({
        id: m.id,
        name: m.name,
        color: m.color || getMinistryColor(m.name, m.id),
      })) || MINISTRY_LEGEND.slice(0, 6);

  return (
    <View style={[styles.legendContainer, compact && styles.legendContainerCompact]}>
      <View style={styles.legendHeader}>
        <Text style={styles.legendTitle}>Ministry Colors</Text>
        {onInfoPress && (
          <TouchableOpacity onPress={onInfoPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Info size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={[styles.legendGrid, compact && styles.legendGridCompact]}>
        {legendItems.map((item) => (
          <View key={item.id} style={[styles.legendItem, compact && styles.legendItemCompact]}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: item.color },
                compact && styles.legendDotCompact,
              ]}
            />
            <Text style={[styles.legendText, compact && styles.legendTextCompact]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface ProfileMinistryIndicatorProps {
  ministries: Ministry[];
  size?: 'small' | 'medium' | 'large';
}

export function ProfileMinistryIndicator({ ministries, size = 'medium' }: ProfileMinistryIndicatorProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const dotSizes = {
    small: 6,
    medium: 8,
    large: 10,
  };

  const dotSize = dotSizes[size];

  if (ministries.length === 0) return null;

  return (
    <>
      <TouchableOpacity 
        style={styles.profileIndicatorContainer}
        onPress={() => setTooltipVisible(true)}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {ministries.slice(0, 5).map((ministry, index) => (
          <View
            key={ministry.id}
            style={[
              styles.profileDot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: ministry.color || getMinistryColor(ministry.name, ministry.id),
                position: 'absolute',
                right: index * (dotSize + 2),
                bottom: 0,
                borderWidth: 1.5,
                borderColor: Colors.surface,
              },
            ]}
          />
        ))}
      </TouchableOpacity>

      <MinistryTooltipModal
        visible={tooltipVisible}
        ministries={ministries}
        onClose={() => setTooltipVisible(false)}
      />
    </>
  );
}

interface MinistryTooltipModalProps {
  visible: boolean;
  ministries: Ministry[];
  onClose: () => void;
}

function MinistryTooltipModal({ visible, ministries, onClose }: MinistryTooltipModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.tooltipOverlay} onPress={onClose}>
        <View style={styles.tooltipContainer}>
          <View style={styles.tooltipHeader}>
            <Text style={styles.tooltipTitle}>Ministry Affiliations</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.tooltipContent}>
            {ministries.map((ministry) => (
              <View key={ministry.id} style={styles.tooltipItem}>
                <View
                  style={[
                    styles.tooltipDot,
                    { backgroundColor: ministry.color || getMinistryColor(ministry.name, ministry.id) },
                  ]}
                />
                <Text style={styles.tooltipText}>{ministry.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tooltipContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    minWidth: 220,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tooltipTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  tooltipContent: {
    gap: 10,
  },
  tooltipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tooltipDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tooltipText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  dot: {
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  moreBadge: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 4,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  legendContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  legendContainerCompact: {
    padding: 12,
    marginBottom: 12,
  },
  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendGridCompact: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '45%',
    gap: 8,
  },
  legendItemCompact: {
    minWidth: '30%',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendDotCompact: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  legendTextCompact: {
    fontSize: 12,
  },
  profileIndicatorContainer: {
    position: 'relative',
    width: 50,
    height: 12,
  },
  profileDot: {},
});
