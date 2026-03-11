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
import { useTheme } from '@/providers/ThemeProvider';

interface DropdownItem {
  id: string;
  label: string;
  iconName: string;
  route: Href;
}

interface TabBarDropdownProps {
  isActive?: boolean;
}

export default function TabBarDropdown({ isActive }: TabBarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const dropdownItems: DropdownItem[] = [
    {
      id: 'announcements',
      label: 'Announcements',
      iconName: 'Megaphone',
      route: '/announcements' as Href,
    },
    {
      id: 'ministries',
      label: 'Ministries',
      iconName: 'Users',
      route: '/(tabs)/groups' as Href,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      iconName: 'Calendar',
      route: '/(tabs)/calendar' as Href,
    },
  ];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Megaphone': return <Megaphone size={20} color={colors.text} />;
      case 'Users': return <Users size={20} color={colors.text} />;
      case 'Calendar': return <Calendar size={20} color={colors.text} />;
      default: return <Users size={20} color={colors.text} />;
    }
  };

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
        <View style={[styles.iconContainer, isActive && { backgroundColor: colors.primary + '12' }]}>
          <MoreHorizontal size={24} color={isActive ? colors.primary : colors.textTertiary} />
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
            <View style={[styles.dropdownContent, { backgroundColor: colors.surface }]}>
              <View style={[styles.dropdownHeader, { borderBottomColor: colors.borderLight }]}>
                <Text style={[styles.dropdownTitle, { color: colors.textSecondary }]}>Quick Access</Text>
              </View>
              {dropdownItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.dropdownItem,
                    { borderBottomColor: colors.borderLight },
                    index === dropdownItems.length - 1 && styles.dropdownItemLast,
                  ]}
                  onPress={() => handleItemPress(item.route)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dropdownItemIcon, { backgroundColor: colors.surfaceSecondary }]}>
                    {getIcon(item.iconName)}
                  </View>
                  <Text style={[styles.dropdownItemLabel, { color: colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.dropdownArrow, { backgroundColor: colors.surface }]} />
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
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dropdownItemLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    flex: 1,
  },
  dropdownArrow: {
    width: 16,
    height: 16,
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
