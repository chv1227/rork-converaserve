import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Sun, Moon, Smartphone, Check } from 'lucide-react-native';
import { useTheme, ThemeMode } from '@/providers/ThemeProvider';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, themeMode, setTheme, isDark } = useTheme();

  const themeOptions: { mode: ThemeMode; label: string; icon: React.ReactNode; description: string }[] = [
    {
      mode: 'light',
      label: 'Light',
      icon: <Sun size={24} color={colors.text} />,
      description: 'Always use light theme',
    },
    {
      mode: 'dark',
      label: 'Dark',
      icon: <Moon size={24} color={colors.text} />,
      description: 'Always use dark theme',
    },
    {
      mode: 'system',
      label: 'System',
      icon: <Smartphone size={24} color={colors.text} />,
      description: 'Follow system settings',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => router.back()}
            testID="back-button"
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              APPEARANCE
            </Text>
            <View style={[styles.optionsContainer, { backgroundColor: colors.surface }]}>
              {themeOptions.map((option, index) => (
                <TouchableOpacity
                  key={option.mode}
                  style={[
                    styles.optionRow,
                    index !== themeOptions.length - 1 && [
                      styles.optionBorder,
                      { borderBottomColor: colors.border },
                    ],
                  ]}
                  onPress={() => setTheme(option.mode)}
                  testID={`theme-option-${option.mode}`}
                >
                  <View style={styles.optionLeft}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: colors.surfaceSecondary },
                      ]}
                    >
                      {option.icon}
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, { color: colors.text }]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                  {themeMode === option.mode && (
                    <Check size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.previewSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              PREVIEW
            </Text>
            <View style={[styles.previewCard, { backgroundColor: colors.surface }]}>
              <View style={styles.previewHeader}>
                <View
                  style={[
                    styles.previewAvatar,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.previewAvatarText}>A</Text>
                </View>
                <View style={styles.previewInfo}>
                  <Text style={[styles.previewName, { color: colors.text }]}>
                    Sample Card
                  </Text>
                  <Text style={[styles.previewSubtext, { color: colors.textSecondary }]}>
                    This is how content will look
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.previewContent,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Text style={[styles.previewText, { color: colors.textSecondary }]}>
                  Current mode: {isDark ? 'Dark' : 'Light'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  optionsContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionBorder: {
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
  },
  previewSection: {
    marginTop: 32,
    marginBottom: 40,
  },
  previewCard: {
    borderRadius: 12,
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  previewSubtext: {
    fontSize: 13,
  },
  previewContent: {
    borderRadius: 8,
    padding: 12,
  },
  previewText: {
    fontSize: 14,
  },
});
