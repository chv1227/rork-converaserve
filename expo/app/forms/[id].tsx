import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react-native";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

interface FormData {
  id: string;
  church_id: string;
  title: string;
  description: string | null;
  form_type: string;
  is_active: boolean;
  is_public: boolean;
  fields: Array<{
    id: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
  created_at: string;
}

export default function FormSubmissionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { user, currentOrganization } = useAuth();

  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const formQuery = useQuery<FormData | null>({
    queryKey: ["form", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("forms")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message || "Failed to load form");
      return data as FormData;
    },
    enabled: !!id,
  });

  const form = formQuery.data;
  const fields: Array<{ id: string; label: string; type: string; required: boolean; options?: string[] }> =
    (form?.fields as any) || [];

  const isValid = useMemo(() => {
    if (!form) return false;
    for (const field of fields) {
      if (field.required && !responses[field.id]?.trim()) return false;
    }
    return true;
  }, [form, fields, responses]);

  const updateResponse = useCallback((fieldId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user || !currentOrganization || !id) return;

    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("form_responses")
        .insert({
          form_id: id,
          church_id: currentOrganization.id,
          profile_id: user.id,
          responses,
          submitted_at: new Date().toISOString(),
        });

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit form";
      Alert.alert("Error", message);
    } finally {
      setIsSubmitting(false);
    }
  }, [user, currentOrganization, id, responses]);

  const inputStyle = useMemo(
    () => ({ backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }),
    [colors]
  );

  if (formQuery.isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!form) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Form not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "600" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.success + "15" }]}>
          <CheckCircle2 size={48} color={colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.text }]}>Submitted!</Text>
        <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
          Your response has been recorded.
        </Text>
        <TouchableOpacity
          style={[styles.doneButton, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{form.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        {form.description && (
          <View style={[styles.descCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.descText, { color: colors.textSecondary }]}>{form.description}</Text>
          </View>
        )}

        {fields.map((field) => (
          <View key={field.id} style={styles.fieldSection}>
            <View style={styles.fieldLabelRow}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>{field.label}</Text>
              {field.required && <Text style={[styles.requiredStar, { color: colors.error }]}>*</Text>}
            </View>

            {field.type === "textarea" ? (
              <TextInput
                style={[styles.textArea, inputStyle]}
                value={responses[field.id] || ""}
                onChangeText={(v) => updateResponse(field.id, v)}
                placeholder="Type your answer..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            ) : field.type === "checkbox" ? (
              <View style={[styles.checkboxField, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Switch
                  value={responses[field.id] === "true"}
                  onValueChange={(v) => updateResponse(field.id, v ? "true" : "false")}
                  trackColor={{ false: colors.border, true: colors.primary + "66" }}
                  thumbColor={responses[field.id] === "true" ? colors.primary : colors.textTertiary}
                />
                <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>
                  {responses[field.id] === "true" ? "Yes" : "No"}
                </Text>
              </View>
            ) : (
              <TextInput
                style={[styles.textInput, inputStyle]}
                value={responses[field.id] || ""}
                onChangeText={(v) => updateResponse(field.id, v)}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                placeholderTextColor={colors.textTertiary}
                keyboardType={
                  field.type === "email" ? "email-address" :
                  field.type === "phone" ? "phone-pad" :
                  field.type === "date" ? "numbers-and-punctuation" :
                  "default"
                }
              />
            )}
          </View>
        ))}

        {fields.length === 0 && (
          <View style={styles.emptyFields}>
            <Text style={[styles.emptyFieldsText, { color: colors.textTertiary }]}>
              This form has no fields yet.
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + 16, backgroundColor: colors.surface, borderTopColor: colors.borderLight },
        ]}
      >
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: isValid ? colors.primary : colors.border, opacity: isValid ? 1 : 0.6 }]}
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Send size={18} color={colors.textInverse} />
              <Text style={[styles.submitText, { color: colors.textInverse }]}>Submit</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },
  headerSpacer: { width: 40 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  descCard: { borderRadius: 14, padding: 16, marginBottom: 20 },
  descText: { fontSize: 14, lineHeight: 20 },
  fieldSection: { marginBottom: 20 },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 4 },
  fieldLabel: { fontSize: 15, fontWeight: "600" },
  requiredStar: { fontSize: 16, fontWeight: "700" },
  textInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 90,
  },
  checkboxField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  checkboxLabel: { fontSize: 15, fontWeight: "500" },
  emptyFields: { padding: 30, alignItems: "center" },
  emptyFieldsText: { fontSize: 14 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
  },
  submitText: { fontSize: 16, fontWeight: "700" },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: "800", marginBottom: 6 },
  successSubtitle: { fontSize: 15, marginBottom: 24 },
  doneButton: { borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  doneButtonText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
