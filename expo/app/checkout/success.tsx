import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function CheckoutSuccess() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(tabs)");
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>\ud83c\udf89</Text>
      <Text style={styles.title}>You're all set!</Text>
      <Text style={styles.subtitle}>
        Welcome to ChurchConnect. Your subscription is now active.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace("/(tabs)")}>
        <Text style={styles.buttonText}>Go to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6b7280", textAlign: "center", marginBottom: 32 },
  button: { backgroundColor: "#6366f1", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
