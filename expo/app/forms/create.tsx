import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  Check,
  UserCheck,
  Heart,
  FileText,
} from "lucide-react-native";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";

type FormType = "registration" | "volunteer" | "prayer" | "general";
type FieldType = "text" | "textarea" | "email" | "phone" | "select" | "date" | "checkbox";

interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

const FORM_TYPES: { value: FormType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "registration", label: "Registration", description: "Sign-up forms for events or programs", icon: <UserCheck size={20} color="#3B82F6" /> },
  { value: "volunteer", label: "Volunteer", description: "Collect volunteer sign-ups and availability", icon: <Heart size={20} color="#EF4444" /> },
  { value: "prayer", label: "Prayer Request", description: "Submit and collect prayer requests", icon: <Heart size={20} color="#8B5CF6" /> },
  { value: "general", label: "General", description: "Custom form for any purpose", icon: <FileText size={20} color="#6B7280" /> },
];

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Checkbox" },
];

export default function CreateFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { currentOrganization } = useAuth();
  const { refresh } = useData();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formType, setFormType] = useState<FormType>("registration");
  const [fields, setFields] = useState<FormField[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedType = FORM_TYPES.find((t) => t.value === formType);

  const isValid = useMemo(() => title.trim().length >= 3, [title]);

  const addField = useCallback(() => {
    setFields((prev) => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), label: "", type: "text", required: false },
    ]);
  }, []);

  const updateField = useCallback((id: string, update: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...update } : f)));
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!currentOrganization) {
      Alert.alert("Error", "No organization selected.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("forms")
        .insert({
          church_id: currentOrganization.id,
          title: title.trim(),
          description: description.trim() || null,
          form_type: formType,
          is_active: true,
          is_public: isPublic,
          fields: fields.filter((f) => f.label.trim()).map((f) => ({
            id: f.id,
            label: f.label.trim(),
            type: f.type,
            required: f.required,
          })),
          created_by_profile_id: currentOrganization.id,
        });

      if (error) {
        Alert.alert("Error", error.message || "Failed to create form.");
        setIsSubmitting(false);
        return;
      }

      await refresh();
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      Alert.alert("Error", message);
    } finally {
      setIsSubmitting(false);
    }
  }, [title, description, formType, fields, isPublic, currentOrganization, refresh, router]);

  const inputStyle = useMemo(
    () => ({ backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }),
    [colors]
  );

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Form</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        {/* Form Title */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Form Title</Text>
          <TextInput
            style={[styles.textInput, inputStyle]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Volunteer Sign-Up Form"
            placeholderTextColor={colors.textTertiary}
            maxLength={100}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Description (Optional)</Text>
          <TextInput
            style={[styles.textArea, inputStyle]}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this form for?"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Form Type */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Form Type</Text>
          <TouchableOpacity
            style={[styles.pickerButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            onPress={() => setShowTypePicker(!showTypePicker)}
          >
            <View style={styles.pickerLeft}>
              {selectedType?.icon}
              <Text style={[styles.pickerText, { color: colors.text }]}>{selectedType?.label}</Text>
              <Text style={[styles.pickerDesc, { color: colors.textTertiary }]}>{selectedType?.description}</Text>
            </View>
            <ChevronDown size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          {showTypePicker && (
            <View style={[styles.typeDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {FORM_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.typeOption, formType === type.value && { backgroundColor: colors.primary + "08" }, { borderBottomColor: colors.borderLight }]}
                  onPress={() => {
                    setFormType(type.value);
                    setShowTypePicker(false);
                  }}
                >
                  <View style={styles.typeOptionLeft}>
                    {type.icon}
                    <View>
                      <Text style={[styles.typeOptionLabel, { color: colors.text }]}>{type.label}</Text>
                      <Text style={[styles.typeOptionDesc, { color: colors.textTertiary }]}>{type.description}</Text>
                    </View>
                  </View>
                  {formType === type.value && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Fields */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Form Fields</Text>
            <TouchableOpacity style={[styles.addFieldBtn, { backgroundColor: colors.primary + "15" }]} onPress={addField}>
              <Plus size={16} color={colors.primary} />
              <Text style={[styles.addFieldBtnText, { color: colors.primary }]}>Add Field</Text>
            </TouchableOpacity>
          </View>

          {fields.length === 0 && (
            <View style={[styles.emptyFields, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <FileText size={32} color={colors.textTertiary} />
              <Text style={[styles.emptyFieldsText, { color: colors.textSecondary }]}>
                No fields added yet. Tap "Add Field" to start building your form.
              </Text>
            </View>
          )}

          {fields.map((field, index) => (
            <View key={field.id} style={[styles.fieldCard, { backgroundColor: fields.length > 0 ? colors.surface : undefined }]}>
              <View style={styles.fieldHeader}>
                <GripVertical size={16} color={colors.textTertiary} />
                <Text style={[styles.fieldNumber, { color: colors.textTertiary }]}>
                  #{index + 1}
                </Text>
                <TextInput
                  style={[styles.fieldLabelInput, { color: colors.text }]}
                  value={field.label}
                  onChangeText={(text) => updateField(field.id, { label: text })}
                  placeholder="Field label (e.g. Full Name)"
                  placeholderTextColor={colors.textTertiary}
                />
                <TouchableOpacity onPress={() => removeField(field.id)} style={styles.fieldRemove}>
                  <Trash2 size={16} color={colors.error} />
                </TouchableOpacity>
              </View>

              <View style={styles.fieldOptions}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fieldTypeScroll}>
                  {FIELD_TYPE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.fieldTypeChip,
                        {
                          backgroundColor: field.type === opt.value ? colors.primary : colors.surfaceSecondary,
                          borderColor: field.type === opt.value ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => updateField(field.id, { type: opt.value })}
                    >
                      <Text
                        style={[
                          styles.fieldTypeChipText,
                          { color: field.type === opt.value ? colors.textInverse : colors.textSecondary },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.requiredRow}>
                  <Text style={[styles.requiredLabel, { color: colors.textSecondary }]}>Required</Text>
                  <Switch
                    value={field.required}
                    onValueChange={(v) => updateField(field.id, { required: v })}
                    trackColor={{ false: colors.border, true: colors.primary + "66" }}
                    thumbColor={field.required ? colors.primary : colors.textTertiary}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Settings</Text>
          <View style={[styles.settingCard, { backgroundColor: colors.surface }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Public Form</Text>
                <Text style={[styles.settingDesc, { color: colors.textTertiary }]}>Anyone with the link can submit</Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: colors.border, true: colors.primary + "66" }}
                thumbColor={isPublic ? colors.primary : colors.textTertiary}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Submit */}
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
              <Plus size={20} color={colors.textInverse} />
              <Text style={[styles.submitText, { color: colors.textInverse }]}>Create Form</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSpacer: { width: 40 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  section: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
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
    minHeight: 80,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
  },
  pickerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  pickerText: { fontSize: 15, fontWeight: "600" },
  pickerDesc: { fontSize: 12, flex: 1 },
  typeDropdown: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  typeOptionLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  typeOptionLabel: { fontSize: 14, fontWeight: "600" },
  typeOptionDesc: { fontSize: 12, marginTop: 1 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  addFieldBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addFieldBtnText: { fontSize: 13, fontWeight: "600" },
  emptyFields: {
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyFieldsText: { fontSize: 13, textAlign: "center", marginTop: 10, lineHeight: 18 },
  fieldCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  fieldNumber: { fontSize: 11, fontWeight: "600", minWidth: 24 },
  fieldLabelInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  fieldRemove: { padding: 6 },
  fieldOptions: {},
  fieldTypeScroll: { marginBottom: 10 },
  fieldTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 6,
    borderWidth: 1,
  },
  fieldTypeChipText: { fontSize: 12, fontWeight: "600" },
  requiredRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  requiredLabel: { fontSize: 13, fontWeight: "500" },
  settingCard: { borderRadius: 14, padding: 16 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  settingInfo: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 15, fontWeight: "600" },
  settingDesc: { fontSize: 12, marginTop: 2 },
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
});
