import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText, Shield, ExternalLink } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const legalItems = [
    {
      label: 'Privacy Policy',
      icon: <Shield size={20} color={colors.primary} />,
      url: 'https://churchconnect.app/privacy',
    },
    {
      label: 'Terms of Service',
      icon: <FileText size={20} color={colors.primary} />,
      url: 'https://churchconnect.app/terms',
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
              LEGAL
            </Text>
            <View style={[styles.optionsContainer, { backgroundColor: colors.surface }]}>
              {legalItems.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.optionRow,
                    index !== legalItems.length - 1 && [
                      styles.optionBorder,
                      { borderBottomColor: colors.border },
                    ],
                  ]}
                  onPress={() => {
                    void Linking.openURL(item.url);
                  }}
                >
                  <View style={styles.optionLeft}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: colors.surfaceSecondary },
                      ]}
                    >
                      {item.icon}
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, { color: colors.text }]}>
                        {item.label}
                      </Text>
                    </View>
                  </View>
                  <ExternalLink size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 40 }} />
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
});
