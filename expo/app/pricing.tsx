import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import {
  ArrowLeft,
  Check,
  Crown,
  Building2,
  Zap,
  Shield,
  CreditCard,
  ExternalLink,
  ChevronRight,
} from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { trpc, trpcClient } from "@/lib/trpc";

interface PlanFeature {
  text: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

interface SubscriptionInfo {
  planId: string;
  planName: string;
  price: number;
  features: string[];
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

export default function PricingScreen() {
  const router = useRouter();
  const { colors: tc } = useTheme();
  const { currentOrganization, isOrganizationAdmin } = useAuth();
  const queryClient = useQueryClient();

  const orgId = currentOrganization?.id ?? "";

  const plansQuery = useQuery({
    queryKey: ["subscription", "plans"],
    queryFn: () => trpcClient.stripe.getPlans.query(),
  });

  const subscriptionQuery = useQuery({
    queryKey: ["subscription", orgId],
    queryFn: () => trpcClient.stripe.getSubscription.query({ churchId: orgId }),
    enabled: !!orgId,
  });

  const currentPlanId = subscriptionQuery.data?.planId ?? "free";

  const handleSubscribe = useCallback(
    async (planId: string) => {
      if (!isOrganizationAdmin) {
        Alert.alert("Access Denied", "Only church administrators can manage subscriptions.");
        return;
      }
      if (!orgId) {
        Alert.alert("No Church", "Please select a church first.");
        return;
      }

      try {
        const result = await trpcClient.stripe.createSubscriptionCheckout.mutate({
          planId: planId as "basic" | "standard" | "premium",
          churchId: orgId,
          churchName: currentOrganization?.name,
        });

        if (!result.url) {
          throw new Error("No checkout URL returned");
        }

        if (Platform.OS === "web") {
          window.open(result.url, "_blank");
        } else {
          const redirectUrl = Linking.createURL("pricing");
          const browserResult = await WebBrowser.openAuthSessionAsync(
            result.url,
            redirectUrl
          );

          if (browserResult.type === "success") {
            Alert.alert(
              "Subscription Update",
              "Your subscription is being processed. Changes may take a moment to appear.",
              [{ text: "OK", onPress: () => queryClient.invalidateQueries({ queryKey: ["subscription"] }) }]
            );
          }
        }
      } catch (err: any) {
        console.error("Subscription error:", err?.message || err);
        const msg = err?.message?.includes("STRIPE_PRICE_")
          ? "Stripe price IDs are not configured. Please contact support to set up subscription plans."
          : err?.message || "Failed to initiate subscription. Please try again.";
        Alert.alert("Subscription Error", msg);
      }
    },
    [orgId, isOrganizationAdmin, currentOrganization?.name, queryClient]
  );

  const handleManageBilling = useCallback(async () => {
    if (!orgId) return;
    try {
      const result = await trpcClient.stripe.createBillingPortalSession.mutate({
        churchId: orgId,
      });
      if (result.url) {
        if (Platform.OS === "web") {
          window.open(result.url, "_blank");
        } else {
          await WebBrowser.openBrowserAsync(result.url);
        }
      }
    } catch (err: any) {
      console.error("Billing portal error:", err?.message || err);
      Alert.alert("Error", err?.message || "Could not open billing portal.");
    }
  }, [orgId]);

  const sub = subscriptionQuery.data;

  const plans: Plan[] = plansQuery.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: tc.background }]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={[styles.header, { borderBottomColor: tc.borderLight }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: tc.surfaceSecondary }]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color={tc.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: tc.text }]}>Subscription</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Current Plan Banner */}
          {sub && (
            <View style={[styles.currentPlanCard, { backgroundColor: currentPlanId !== "free" ? tc.primary : tc.surface }]}>
              <View style={styles.currentPlanContent}>
                <View style={styles.currentPlanLeft}>
                  <Crown size={24} color={currentPlanId !== "free" ? "#fff" : tc.primary} />
                  <View style={styles.currentPlanText}>
                    <Text style={[styles.currentPlanLabel, { color: currentPlanId !== "free" ? "rgba(255,255,255,0.8)" : tc.textSecondary }]}>
                      Current Plan
                    </Text>
                    <Text style={[styles.currentPlanName, { color: currentPlanId !== "free" ? "#fff" : tc.text }]}>
                      {sub.planName}
                    </Text>
                  </View>
                </View>
                {sub.status !== "free" && sub.status === "active" && (
                  <View style={[styles.statusBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                    <Text style={[styles.statusText, { color: "#fff" }]}>Active</Text>
                  </View>
                )}
                {sub.cancelAtPeriodEnd && (
                  <View style={[styles.statusBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                    <Text style={[styles.statusText, { color: "#fff" }]}>Ends Soon</Text>
                  </View>
                )}
              </View>
              {sub.currentPeriodEnd && sub.status !== "free" && (
                <Text style={[styles.periodText, { color: currentPlanId !== "free" ? "rgba(255,255,255,0.7)" : tc.textSecondary }]}>
                  {sub.cancelAtPeriodEnd ? "Ends" : "Renews"} {new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </Text>
              )}
            </View>
          )}

          {/* Manage Billing Button */}
          {sub && sub.stripeCustomerId && sub.status !== "free" && (
            <TouchableOpacity
              style={[styles.manageButton, { backgroundColor: tc.surface, borderColor: tc.borderLight }]}
              onPress={handleManageBilling}
            >
              <CreditCard size={18} color={tc.text} />
              <Text style={[styles.manageButtonText, { color: tc.text }]}>Manage Billing</Text>
              <ExternalLink size={16} color={tc.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Plan Cards */}
          <View style={styles.plansSection}>
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Available Plans</Text>

            {plans.length === 0 && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={tc.primary} />
              </View>
            )}

            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              const isPopular = plan.id === "standard";

              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    { backgroundColor: tc.surface, borderColor: tc.borderLight },
                    isCurrent && { borderColor: tc.primary, borderWidth: 2 },
                    isPopular && !isCurrent && { borderColor: tc.secondary },
                  ]}
                  activeOpacity={0.9}
                  onPress={() => {
                    if (!isCurrent && plan.id !== "free") {
                      void handleSubscribe(plan.id);
                    }
                  }}
                  disabled={isCurrent}
                >
                  {isPopular && (
                    <View style={[styles.popularBadge, { backgroundColor: tc.secondary }]}>
                      <Zap size={12} color="#fff" />
                      <Text style={styles.popularText}>Most Popular</Text>
                    </View>
                  )}
                  <View style={styles.planHeader}>
                    <View style={styles.planInfo}>
                      <Text style={[styles.planName, { color: tc.text }]}>{plan.name}</Text>
                      <View style={styles.priceRow}>
                        <Text style={[styles.planPrice, { color: tc.text }]}>
                          ${plan.price}
                        </Text>
                        <Text style={[styles.planPeriod, { color: tc.textSecondary }]}>
                          {plan.price === 0 ? "/forever" : "/month"}
                        </Text>
                      </View>
                    </View>
                    {isCurrent ? (
                      <View style={[styles.currentBadge, { backgroundColor: tc.primary + "15" }]}>
                        <Check size={14} color={tc.primary} />
                        <Text style={[styles.currentBadgeText, { color: tc.primary }]}>Current</Text>
                      </View>
                    ) : plan.price === 0 ? (
                      <View style={[styles.currentBadge, { backgroundColor: tc.surfaceSecondary }]}>
                        <Text style={[styles.currentBadgeText, { color: tc.textSecondary }]}>Default</Text>
                      </View>
                    ) : (
                      <ChevronRight size={20} color={tc.textTertiary} />
                    )}
                  </View>
                  <View style={[styles.featuresList, { borderTopColor: tc.borderLight }]}>
                    {plan.features.map((feature: string, i: number) => (
                      <View key={i} style={styles.featureRow}>
                        <Check size={16} color={tc.success} />
                        <Text style={[styles.featureText, { color: tc.text }]}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Shield size={16} color={tc.success} />
            <Text style={[styles.securityText, { color: tc.success }]}>
              Secured by Stripe · Cancel anytime
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "600" as const },
  headerRight: { width: 40 },
  content: { flex: 1 },
  scrollContent: { padding: 16 },

  // Current Plan
  currentPlanCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  currentPlanContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currentPlanLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  currentPlanText: { gap: 2 },
  currentPlanLabel: { fontSize: 13, fontWeight: "500" as const },
  currentPlanName: { fontSize: 20, fontWeight: "700" as const },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 12, fontWeight: "600" as const },
  periodText: {
    fontSize: 13,
    marginTop: 12,
    fontWeight: "500" as const,
  },

  // Manage Billing
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  manageButtonText: { fontSize: 15, fontWeight: "600" as const },

  // Plans
  plansSection: { gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700" as const, marginBottom: 4 },
  loadingContainer: { paddingVertical: 60, alignItems: "center" },
  planCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  popularBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  popularText: { color: "#fff", fontSize: 12, fontWeight: "600" as const },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  planInfo: { gap: 4 },
  planName: { fontSize: 18, fontWeight: "700" as const },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  planPrice: { fontSize: 28, fontWeight: "800" as const },
  planPeriod: { fontSize: 14 },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  currentBadgeText: { fontSize: 13, fontWeight: "600" as const },
  featuresList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  featureText: { fontSize: 14, lineHeight: 20, flex: 1 },

  // Security
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  securityText: { fontSize: 12, fontWeight: "500" as const },
});
