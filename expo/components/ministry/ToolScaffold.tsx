// Shared building blocks for the ministry tool screens under /ministry/[id]/*.
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TextInputProps,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, Lock, Shield, X } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import type { ThemeColors } from "@/constants/colors";
import { useMinistryContext } from "@/hooks/useMinistryContext";
import { usePlanAccess, PlanTier, PLAN_LABEL } from "@/hooks/usePlanAccess";
import { errorMessage } from "@/lib/ministryWorkspace";

export type MinistryCtx = ReturnType<typeof useMinistryContext> & {
  ministryId: string;
  accent: string;
};

interface ToolScreenProps {
  ministryId: string | undefined;
  title: string;
  /** Plan required for this screen (from constants/ministryTools). */
  minPlan: PlanTier | null;
  /** Hide the screen for non-members (default true). */
  requireMembership?: boolean;
  headerRight?: (ctx: MinistryCtx) => React.ReactNode;
  children: (ctx: MinistryCtx) => React.ReactNode;
}

/**
 * Wraps a ministry tool screen: header, ministry/membership loading,
 * membership check and plan gate (so deep links are gated too).
 */
export function ToolScreen({ ministryId, title, minPlan, requireMembership = true, headerRight, children }: ToolScreenProps) {
  const { colors } = useTheme();
  const ctx = useMinistryContext(ministryId);
  const { canUse, loading: planLoading } = usePlanAccess(ctx.churchId);

  const accent = ctx.ministry?.color || colors.primary;
  const fullCtx: MinistryCtx = { ...ctx, ministryId: ministryId || "", accent };

  let body: React.ReactNode;
  if (!ministryId) {
    body = <StateView kind="error" title="Ministry not found" />;
  } else if (ctx.isLoading || (planLoading && !!minPlan)) {
    body = <StateView kind="loading" title="Loading..." />;
  } else if (ctx.isError || !ctx.ministry) {
    body = (
      <StateView
        kind="error"
        title="Couldn't load this ministry"
        description={errorMessage(ctx.error, "Please try again.")}
        actionLabel="Retry"
        onAction={() => ctx.refetch()}
      />
    );
  } else if (requireMembership && !ctx.isMember) {
    body = (
      <StateView
        kind="empty"
        icon={<Shield size={32} color={colors.textTertiary} />}
        title="Members only"
        description="Join this ministry from its workspace to use this tool."
      />
    );
  } else if (!canUse(minPlan)) {
    body = <LockedTool minPlan={minPlan as PlanTier} title={title} />;
  } else {
    body = children(fullCtx);
  }

  const canShowRight = !!ctx.ministry && ctx.isMember && canUse(minPlan);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: "700" as const },
          headerTintColor: accent,
          headerRight: headerRight && canShowRight ? () => headerRight(fullCtx) : undefined,
        }}
      />
      {body}
    </View>
  );
}

export function LockedTool({ minPlan, title }: { minPlan: PlanTier; title: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <StateView
      kind="empty"
      icon={<Lock size={32} color={colors.primary} />}
      title={`${title} is a ${PLAN_LABEL[minPlan]} feature`}
      description={`Upgrade to the ${PLAN_LABEL[minPlan]} plan or higher to unlock it for your ministry.`}
      actionLabel="View plans"
      onAction={() => router.push("/pricing" as any)}
    />
  );
}

interface StateViewProps {
  kind: "loading" | "error" | "empty";
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function StateView({ kind, title, description, icon, actionLabel, onAction, compact }: StateViewProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.state, compact && styles.stateCompact]}>
      {kind === "loading" ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <View style={[styles.stateIcon, { backgroundColor: kind === "error" ? colors.errorLight : colors.surfaceSecondary }]}>
          {icon || (kind === "error" ? <AlertCircle size={30} color={colors.error} /> : null)}
        </View>
      )}
      <Text style={[styles.stateTitle, { color: kind === "error" ? colors.error : colors.text }]}>{title}</Text>
      {description ? <Text style={[styles.stateDesc, { color: colors.textSecondary }]}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={[styles.stateBtn, { borderColor: colors.border }]} onPress={onAction} activeOpacity={0.7}>
          <Text style={[styles.stateBtnText, { color: colors.primary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{children}</Text>
      {right}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  color,
  disabled,
  loading,
  icon,
  variant = "solid",
}: {
  label: string;
  onPress: () => void;
  color: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  variant?: "solid" | "soft";
}) {
  const solid = variant === "solid";
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, { backgroundColor: solid ? color : color + "18", opacity: disabled ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={solid ? "#fff" : color} />
      ) : (
        <>
          {icon}
          <Text style={[styles.primaryBtnText, { color: solid ? "#fff" : color }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function Chip({ label, selected, onPress, color }: { label: string; selected: boolean; onPress: () => void; color: string }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        { borderColor: selected ? color : colors.border, backgroundColor: selected ? color + "18" : colors.surface },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? color : colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textTertiary}
        {...props}
        style={[
          styles.input,
          { color: colors.text, backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
          props.multiline && styles.inputMultiline,
          props.style,
        ]}
      />
    </View>
  );
}

/** Bottom-sheet style form modal with Save / Cancel. */
export function FormSheet({
  visible,
  title,
  onClose,
  onSubmit,
  submitLabel = "Save",
  submitting,
  submitDisabled,
  color,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  submitting?: boolean;
  submitDisabled?: boolean;
  color: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.sheetBackdrop, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity style={styles.flex} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.sheetBody}>
            {children}
          </ScrollView>
          {onSubmit ? (
            <PrimaryButton label={submitLabel} onPress={onSubmit} color={color} loading={submitting} disabled={submitDisabled} />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color + "22" }]}>
      <Text style={[styles.avatarText, { color, fontSize: size * 0.38 }]}>{initials || "?"}</Text>
    </View>
  );
}

export function cardStyle(colors: ThemeColors) {
  return { backgroundColor: colors.surface, borderColor: colors.borderLight };
}

export const toolStyles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "700" },
  meta: { fontSize: 12, marginTop: 2 },
  body: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: "700" },
  headerBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  state: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 48 },
  stateCompact: { flex: 0, paddingVertical: 28 },
  stateIcon: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  stateTitle: { fontSize: 17, fontWeight: "700", textAlign: "center", marginTop: 8, marginBottom: 6 },
  stateDesc: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  stateBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  stateBtnText: { fontSize: 14, fontWeight: "600" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 10 },
  sectionLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { fontSize: 15, fontWeight: "700" },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "600" },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 8, fontSize: 15 },
  inputMultiline: { minHeight: 90, textAlignVertical: "top" },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 16, maxHeight: "85%" },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  sheetBody: { marginBottom: 12 },
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "700" },
});
