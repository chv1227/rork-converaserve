import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  FileText,
  Shield,
  Crown,
  ChevronRight,
  CreditCard,
  ExternalLink,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { trpcClient } from '@/lib/trpc';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors: tc } = useTheme();
  const { currentOrganization, isOrganizationAdmin } = useAuth();

  const orgId = currentOrganization?.id ?? '';

  const subscriptionQuery = useQuery({
    queryKey: ['subscription', orgId],
    queryFn: () => trpcClient.stripe.getSubscription.query({ churchId: orgId }),
    enabled: !!orgId,
  });

  const sub = subscriptionQuery.data;

  const legalItems = [
    {
      label: 'Privacy Policy',
      icon: <Shield size={20} color={tc.primary} />,
      url: 'https://churchconnect.app/privacy',
    },
    {
      label: 'Terms of Service',
      icon: <FileText size={20} color={tc.primary} />,
      url: 'https://churchconnect.app/terms',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: tc.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: tc.borderLight }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: tc.surfaceSecondary }]}
            onPress={() => router.back()}
            testID="back-button"
          >
            <ArrowLeft size={20} color={tc.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: tc.text }]}>Settings</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Subscription Section */}
          {currentOrganization && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>
                SUBSCRIPTION
              </Text>
              <View style={[styles.optionsContainer, { backgroundColor: tc.surface }]}>
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => router.push('/pricing')}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: tc.surfaceSecondary }]}>
                      <Crown size={20} color={tc.primary} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, { color: tc.text }]}>
                        Manage Subscription
                      </Text>
                      {subscriptionQuery.isLoading ? (
                        <ActivityIndicator size="small" color={tc.primary} style={{ marginTop: 2 }} />
                      ) : sub ? (
                        <Text style={[styles.optionDescription, { color: tc.textSecondary }]}>
                          {sub.planName} · {sub.status === 'active' ? 'Active' : 'Inactive'}
                          {sub.cancelAtPeriodEnd ? ' · Ending soon' : ''}
                        </Text>
                      ) : (
                        <Text style={[styles.optionDescription, { color: tc.textSecondary }]}>
                          Free Plan
                        </Text>
                      )}
                    </View>
                  </View>
                  <ChevronRight size={18} color={tc.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Legal Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>
              LEGAL
            </Text>
            <View style={[styles.optionsContainer, { backgroundColor: tc.surface }]}>
              {legalItems.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.optionRow,
                    index !== legalItems.length - 1 && [
                      styles.optionBorder,
                      { borderBottomColor: tc.borderLight },
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
                        { backgroundColor: tc.surfaceSecondary },
                      ]}
                    >
                      {item.icon}
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, { color: tc.text }]}>
                        {item.label}
                      </Text>
                    </View>
                  </View>
                  <ExternalLink size={18} color={tc.textTertiary} />
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
