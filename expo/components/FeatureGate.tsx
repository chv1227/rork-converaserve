import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSubscription } from "@/hooks/useSubscription";

type Plan = "basic" | "standard" | "pro";

interface Props {
  requires: Plan;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ requires, children, fallback }: Props) {
  const { hasAccess, loading } = useSubscription();

  if (loading) return null;

  return hasAccess(requires) ? (
    <>{children}</>
  ) : (
    <>{fallback ?? <UpgradePrompt requiredPlan={requires} />}</>
  );
}

function UpgradePrompt({ requiredPlan }: { requiredPlan: Plan }) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        This feature requires the{" "}
        <Text style={styles.bold}>{requiredPlan}</Text> plan or higher.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/pricing")}
      >
        <Text style={styles.buttonText}>Upgrade Now \u2192</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    alignItems: "center",
    margin: 16,
  },
  text: {
    fontSize: 15,
    color: "#374151",
    textAlign: "center",
    marginBottom: 12,
  },
  bold: {
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  button: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
