import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";

type BannerVariant = "info" | "success" | "warning" | "error";

interface BannerProps {
  variant?: BannerVariant;
  title: string;
  subtitle?: string;
  onDismiss?: () => void;
  style?: object;
}

const VARIANT_CONFIG: Record<BannerVariant, { bg: string; border: string; accent: string; titleColor: string; Icon: typeof Info }> = {
  info: {
    bg: "#EFF6FF",
    border: "#BFDBFE",
    accent: "#3B82F6",
    titleColor: "#1E40AF",
    Icon: Info,
  },
  success: {
    bg: "#ECFDF5",
    border: "#A7F3D0",
    accent: "#10B981",
    titleColor: "#065F46",
    Icon: CheckCircle2,
  },
  warning: {
    bg: "#FFFBEB",
    border: "#FDE68A",
    accent: "#F59E0B",
    titleColor: "#92400E",
    Icon: AlertTriangle,
  },
  error: {
    bg: "#FEF2F2",
    border: "#FECACA",
    accent: "#EF4444",
    titleColor: "#991B1B",
    Icon: AlertCircle,
  },
};

export default function Banner({ variant = "info", title, subtitle, onDismiss, style }: BannerProps) {
  const { colors } = useTheme();
  const config = VARIANT_CONFIG[variant];
  const { Icon } = config;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
        style,
      ]}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: config.accent }]} />

      {/* Content */}
      <View style={styles.inner}>
        <View style={[styles.iconCircle, { backgroundColor: config.accent + "18" }]}>
          <Icon size={18} color={config.accent} />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: config.titleColor }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          ) : null}
        </View>
        {onDismiss ? (
          <TouchableOpacity
            onPress={onDismiss}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
    }),
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
  },
  inner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700" as const,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
