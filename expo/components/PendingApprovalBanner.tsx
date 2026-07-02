import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Clock, ShieldAlert } from "lucide-react-native";
import { LightTheme } from "@/constants/colors";

interface PendingApprovalBannerProps {
  type?: "pending" | "suspended";
}

export default function PendingApprovalBanner({ type = "pending" }: PendingApprovalBannerProps) {
  const isPending = type === "pending";

  return (
    <View style={[styles.container, isPending ? styles.pendingContainer : styles.suspendedContainer]}>
      <View style={[styles.iconContainer, isPending ? styles.pendingIcon : styles.suspendedIcon]}>
        {isPending ? (
          <Clock size={18} color="#A67A2E" />
        ) : (
          <ShieldAlert size={18} color="#DC2626" />
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, isPending ? styles.pendingTitle : styles.suspendedTitle]}>
          {isPending ? "Pending Approval" : "Account Suspended"}
        </Text>
        <Text style={styles.description}>
          {isPending
            ? "Your church registration is under review. Some features are limited until approved."
            : "Your church account has been suspended. Please contact support."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
      web: { boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    }),
  },
  pendingContainer: {
    backgroundColor: "#FBF8F0",
    borderWidth: 1,
    borderColor: "#E8D5A8",
  },
  suspendedContainer: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingIcon: {
    backgroundColor: "#F5EDDA",
  },
  suspendedIcon: {
    backgroundColor: "#FEE2E2",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700" as const,
    marginBottom: 3,
  },
  pendingTitle: {
    color: "#7A5D1E",
  },
  suspendedTitle: {
    color: "#991B1B",
  },
  description: {
    fontSize: 12,
    color: LightTheme.textSecondary,
    lineHeight: 17,
  },
});
