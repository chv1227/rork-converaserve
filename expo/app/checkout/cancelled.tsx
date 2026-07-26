import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function CheckoutCancelled() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>\ud83d\ude15</Text>
      <Text style={styles.title}>Checkout cancelled</Text>
      <Text style={styles.subtitle}>
        No worries \u2014 you can upgrade anytime from the pricing page.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace("/pricing")}>
        <Text style={styles.buttonText}>View Plans</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.ghost} onPress={() => router.replace("/(tabs)")}>
        <Text style={styles.ghostText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6b7280", textAlign: "center", marginBottom: 32 },
  button: { backgroundColor: "#6366f1", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginBottom: 12 },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  ghost: { padding: 12 },
  ghostText: { color: "#6b7280", fontSize: 15 },
});
