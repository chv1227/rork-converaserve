import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useCheckout } from "@/hooks/useCheckout";
import { useSubscription } from "@/hooks/useSubscription";

const PLANS = [
  {
    name: "Basic",
    plan: "basic" as const,
    monthlyPrice: "$39.99",
    annualPrice: null,
    annualSavings: null,
    description: "Perfect for small churches (20\u201360 members)",
    color: "#6366f1",
  },
  {
    name: "Standard",
    plan: "standard" as const,
    monthlyPrice: "$79.99",
    annualPrice: "$799.90",
    annualSavings: "$159.98",
    description: "For growing churches up to 250 members",
    color: "#8b5cf6",
  },
  {
    name: "Pro",
    plan: "pro" as const,
    monthlyPrice: "$149.99",
    annualPrice: "$1,499.90",
    annualSavings: "$299.98",
    description: "For large & multi-campus ministries",
    color: "#a855f7",
  },
];

export default function PricingScreen() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const { startCheckout } = useCheckout();
  const { plan: currentPlan } = useSubscription();
  const router = useRouter();

  const handleSelect = async (plan: "basic" | "standard" | "pro") => {
    setLoading(plan);
    await startCheckout(plan, billing);
    setLoading(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>\u2190 Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Choose Your Plan</Text>
      <Text style={styles.subtitle}>Serving churches of every size</Text>

      {/* Billing Toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          onPress={() => setBilling("monthly")}
          style={[styles.toggleBtn, billing === "monthly" && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, billing === "monthly" && styles.toggleTextActive]}>
            Monthly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setBilling("annual")}
          style={[styles.toggleBtn, billing === "annual" && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, billing === "annual" && styles.toggleTextActive]}>
            Annual \ud83c\udf89 2 months free
          </Text>
        </TouchableOpacity>
      </View>

      {PLANS.map(({ name, plan, monthlyPrice, annualPrice, annualSavings, description, color }) => {
        const isAnnualUnavailable = billing === "annual" && !annualPrice;
        const isCurrent = currentPlan === plan;
        const price = billing === "annual" && annualPrice ? annualPrice : monthlyPrice;
        const period = billing === "annual" && annualPrice ? "/yr" : "/mo";
        const isLoading = loading === plan;

        return (
          <View
            key={plan}
            style={[styles.card, { borderColor: isCurrent ? color : "#e5e7eb" }]}
          >
            {isCurrent && (
              <View style={[styles.badge, { backgroundColor: color }]}>
                <Text style={styles.badgeText}>Current Plan</Text>
              </View>
            )}

            <Text style={styles.planName}>{name}</Text>
            <Text style={styles.planDesc}>{description}</Text>

            <Text style={[styles.price, { color }]}>
              {price}
              <Text style={styles.period}>{period}</Text>
            </Text>

            {billing === "annual" && annualSavings && (
              <Text style={styles.savings}>Save {annualSavings} vs monthly</Text>
            )}

            <TouchableOpacity
              onPress={() => handleSelect(plan)}
              disabled={isAnnualUnavailable || isCurrent || isLoading}
              style={[
                styles.button,
                { backgroundColor: isAnnualUnavailable || isCurrent ? "#e5e7eb" : color },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={[
                  styles.buttonText,
                  { color: isAnnualUnavailable || isCurrent ? "#9ca3af" : "white" },
                ]}>
                  {isCurrent ? "Current Plan" : isAnnualUnavailable ? "Monthly only" : `Get ${name}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48 },
  back: { marginBottom: 16 },
  backText: { color: "#6366f1", fontSize: 16 },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center" },
  subtitle: { color: "#6b7280", textAlign: "center", marginTop: 8, marginBottom: 24 },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center" },
  toggleActive: { backgroundColor: "white" },
  toggleText: { color: "#6b7280", fontSize: 13 },
  toggleTextActive: { color: "#111827", fontWeight: "bold" },
  card: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    marginBottom: 16,
    backgroundColor: "white",
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  badgeText: { color: "white", fontSize: 12, fontWeight: "bold" },
  planName: { fontSize: 22, fontWeight: "bold" },
  planDesc: { color: "#6b7280", marginTop: 4 },
  price: { fontSize: 32, fontWeight: "bold", marginTop: 12 },
  period: { fontSize: 16, fontWeight: "normal", color: "#6b7280" },
  savings: { color: "#22c55e", fontSize: 13, marginTop: 4 },
  button: { borderRadius: 12, padding: 14, alignItems: "center", marginTop: 16 },
  buttonText: { fontWeight: "bold", fontSize: 16 },
});
