import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Users, Calendar, MoreHorizontal, Megaphone } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface DropdownItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  route: Href;
}

interface TabBarDropdownProps {
  isActive?: boolean;
}

export default function TabBarDropdown({ isActive }: TabBarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const dropdownItems: DropdownItem[] = [
    {
      id: 'announcements',
      label: 'Announcements',
      icon: <Megaphone size={20} color={Colors.text} />,
      route: '/announcements' as Href,
    },
    {
      id: 'ministries',
      label: 'Ministries',
      icon: <Users size={20} color={Colors.text} />,
      route: '/(tabs)/groups' as Href,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: <Calendar size={20} color={Colors.text} />,
      route: '/(tabs)/calendar' as Href,
    },
  ];

  const openDropdown = () => {
    setIsOpen(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDropdown = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOpen(false);
    });
  };

  const handleItemPress = (route: Href) => {
    closeDropdown();
    setTimeout(() => {
      router.push(route);
    }, 100);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.triggerButton}
        onPress={openDropdown}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
          <MoreHorizontal size={24} color={isActive ? Colors.primary : Colors.textTertiary} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={closeDropdown}
      >
        <Pressable style={styles.modalOverlay} onPress={closeDropdown}>
          <Animated.View
            style={[
              styles.dropdownContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.dropdownContent}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Quick Access</Text>
              </View>
              {dropdownItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.dropdownItem,
                    index === dropdownItems.length - 1 && styles.dropdownItemLast,
                  ]}
                  onPress={() => handleItemPress(item.route)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownItemIcon}>{item.icon}</View>
                  <Text style={styles.dropdownItemLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.dropdownArrow} />
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    width: 48,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  iconContainerActive: {
    backgroundColor: Colors.primary + '12',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  triggerLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  triggerLabelActive: {
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  dropdownContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dropdownContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 300,
    ...Platform.select({
      ios: {
        shadowColor: '#0F1E30',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 8px 24px rgba(15, 30, 48, 0.12)',
      },
    }),
  },
  dropdownHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dropdownItemLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
    flex: 1,
  },
  dropdownArrow: {
    width: 16,
    height: 16,
    backgroundColor: Colors.surface,
    transform: [{ rotate: '45deg' }],
    marginTop: -8,
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
