import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Switch,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Globe,
  ChevronRight,
  Check,
  Plus,
  X,
} from "lucide-react-native";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";

type EventType = "service" | "meeting" | "class" | "social" | "outreach" | "conference" | "other";

interface EventTypeOption {
  value: EventType;
  label: string;
  icon: string;
}

const EVENT_TYPES: EventTypeOption[] = [
  { value: "service", label: "Service", icon: "🕊" },
  { value: "meeting", label: "Meeting", icon: "👥" },
  { value: "class", label: "Class", icon: "📚" },
  { value: "social", label: "Social", icon: "🎉" },
  { value: "outreach", label: "Outreach", icon: "🤝" },
  { value: "conference", label: "Conference", icon: "🎤" },
  { value: "other", label: "Other", icon: "📌" },
];

export default function CreateEventScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { currentOrganization, user } = useAuth();
  const { ministries, refresh } = useData();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("meeting");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [onlineUrl, setOnlineUrl] = useState("");
  const [requiresRegistration, setRequiresRegistration] = useState(false);
  const [maxAttendees, setMaxAttendees] = useState("");
  const [selectedMinistryId, setSelectedMinistryId] = useState<string>("");
  const [allDay, setAllDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMinistryPicker, setShowMinistryPicker] = useState(false);

  const selectedMinistry = useMemo(
    () => ministries.find((m) => m.id === selectedMinistryId),
    [ministries, selectedMinistryId]
  );

  const isValid = useMemo(() => {
    if (!title.trim()) return false;
    if (!startDate.trim()) return false;
    return true;
  }, [title, startDate]);

  const handleSubmit = useCallback(async () => {
    if (!currentOrganization || !user) {
      Alert.alert("Error", "You must be logged in and have an organization selected.");
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTime = allDay
        ? `${startDate}T00:00:00`
        : `${startDate}T${startTime || "00:00"}:00`;
      const endDateTime = allDay
        ? `${endDate || startDate}T23:59:59`
        : endDate && endTime
          ? `${endDate}T${endTime}:00`
          : null;

      const payload: Record<string, unknown> = {
        church_id: currentOrganization.id,
        title: title.trim(),
        description: description.trim() || null,
        event_type: eventType,
        status: "published",
        start_datetime: startDateTime,
        end_datetime: endDateTime,
        all_day: allDay,
        location_name: location.trim() || null,
        is_online: isOnline,
        online_url: isOnline ? onlineUrl.trim() || null : null,
        requires_registration: requiresRegistration,
        max_attendees: maxAttendees ? parseInt(maxAttendees, 10) : null,
        created_by_profile_id: user.id,
      };

      if (selectedMinistryId) {
        payload.ministry_id = selectedMinistryId;
      }

      const { error } = await (supabase as any)
        .from("events")
        .insert(payload);

      if (error) {
        Alert.alert("Error", error.message || "Failed to create event.");
        setIsSubmitting(false);
        return;
      }

      await refresh();
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      Alert.alert("Error", message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    title, description, eventType, startDate, startTime, endDate, endTime,
    location, isOnline, onlineUrl, requiresRegistration, maxAttendees,
    selectedMinistryId, allDay, currentOrganization, user, refresh, router,
  ]);

  const inputStyle = useMemo(
    () => ({
      backgroundColor: colors.surfaceSecondary,
      color: colors.text,
      borderColor: colors.border,
    }),
    [colors]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Event</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        {/* Title */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Event Title</Text>
          <TextInput
            style={[styles.textInput, inputStyle]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Sunday Service"
            placeholderTextColor={colors.textTertiary}
            maxLength={120}
          />
        </View>

        {/* Event Type */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Event Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {EVENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor:
                      eventType === type.value ? colors.primary : colors.surfaceSecondary,
                    borderColor:
                      eventType === type.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setEventType(type.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.typeIcon}>{type.icon}</Text>
                <Text
                  style={[
                    styles.typeLabel,
                    {
                      color: eventType === type.value ? colors.textInverse : colors.textSecondary,
                    },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
          <TextInput
            style={[styles.textArea, inputStyle]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the event..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date & Time</Text>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={[styles.subLabel, { color: colors.textTertiary }]}>Start Date</Text>
              <TextInput
                style={[styles.textInput, inputStyle]}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            {!allDay && (
              <View style={styles.halfInput}>
                <Text style={[styles.subLabel, { color: colors.textTertiary }]}>Start Time</Text>
                <TextInput
                  style={[styles.textInput, inputStyle]}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            )}
          </View>

          <View style={[styles.row, { marginTop: 12 }]}>
            <View style={styles.halfInput}>
              <Text style={[styles.subLabel, { color: colors.textTertiary }]}>End Date</Text>
              <TextInput
                style={[styles.textInput, inputStyle]}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            {!allDay && (
              <View style={styles.halfInput}>
                <Text style={[styles.subLabel, { color: colors.textTertiary }]}>End Time</Text>
                <TextInput
                  style={[styles.textInput, inputStyle]}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            )}
          </View>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.textSecondary }]}>All Day</Text>
            <Switch
              value={allDay}
              onValueChange={setAllDay}
              trackColor={{ false: colors.border, true: colors.primary + "66" }}
              thumbColor={allDay ? colors.primary : colors.textTertiary}
            />
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Location</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelRow}>
              <MapPin size={16} color={colors.textSecondary} />
              <Text style={[styles.switchLabel, { color: colors.textSecondary, marginLeft: 8 }]}>
                In Person
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={(v) => {
                setIsOnline(v);
                if (!v) setOnlineUrl("");
              }}
              trackColor={{ false: colors.primary + "66", true: colors.border }}
              thumbColor={isOnline ? colors.textTertiary : colors.primary}
            />
            <View style={styles.switchLabelRow}>
              <Globe size={16} color={colors.textSecondary} />
              <Text style={[styles.switchLabel, { color: colors.textSecondary, marginLeft: 8 }]}>
                Online
              </Text>
            </View>
          </View>

          {isOnline ? (
            <TextInput
              style={[styles.textInput, inputStyle, { marginTop: 12 }]}
              value={onlineUrl}
              onChangeText={setOnlineUrl}
              placeholder="Meeting URL (Zoom, Google Meet, etc.)"
              placeholderTextColor={colors.textTertiary}
              keyboardType="url"
              autoCapitalize="none"
            />
          ) : (
            <TextInput
              style={[styles.textInput, inputStyle]}
              value={location}
              onChangeText={setLocation}
              placeholder="Address or location name"
              placeholderTextColor={colors.textTertiary}
            />
          )}
        </View>

        {/* Ministry */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Ministry (Optional)</Text>
          <TouchableOpacity
            style={[styles.pickerButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            onPress={() => setShowMinistryPicker(!showMinistryPicker)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pickerText,
                {
                  color: selectedMinistry ? colors.text : colors.textTertiary,
                },
              ]}
            >
              {selectedMinistry ? selectedMinistry.name : "Select a ministry"}
            </Text>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          {showMinistryPicker && (
            <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.pickerOption, { borderBottomColor: colors.borderLight }]}
                onPress={() => {
                  setSelectedMinistryId("");
                  setShowMinistryPicker(false);
                }}
              >
                <Text style={[styles.pickerOptionText, { color: colors.textSecondary }]}>None (General)</Text>
                {!selectedMinistryId && <Check size={16} color={colors.primary} />}
              </TouchableOpacity>
              {ministries.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.pickerOption, { borderBottomColor: colors.borderLight }]}
                  onPress={() => {
                    setSelectedMinistryId(m.id);
                    setShowMinistryPicker(false);
                  }}
                >
                  <View style={styles.pickerOptionLeft}>
                    <View style={[styles.ministryDot, { backgroundColor: m.color }]} />
                    <Text style={[styles.pickerOptionText, { color: colors.text }]}>{m.name}</Text>
                  </View>
                  {selectedMinistryId === m.id && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Registration Settings */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Registration</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelRow}>
              <Users size={16} color={colors.textSecondary} />
              <Text style={[styles.switchLabel, { color: colors.textSecondary, marginLeft: 8 }]}>
                Require Registration
              </Text>
            </View>
            <Switch
              value={requiresRegistration}
              onValueChange={setRequiresRegistration}
              trackColor={{ false: colors.border, true: colors.primary + "66" }}
              thumbColor={requiresRegistration ? colors.primary : colors.textTertiary}
            />
          </View>

          {requiresRegistration && (
            <View style={[styles.row, { marginTop: 12 }]}>
              <View style={styles.halfInput}>
                <Text style={[styles.subLabel, { color: colors.textTertiary }]}>Max Attendees</Text>
                <TextInput
                  style={[styles.textInput, inputStyle]}
                  value={maxAttendees}
                  onChangeText={setMaxAttendees}
                  placeholder="No limit"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.halfInput} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Submit */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: colors.surface,
            borderTopColor: colors.borderLight,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: isValid ? colors.primary : colors.border,
              opacity: isValid ? 1 : 0.6,
            },
          ]}
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Plus size={20} color={colors.textInverse} />
              <Text style={[styles.submitText, { color: colors.textInverse }]}>Create Event</Text>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: { width: 40 },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 6,
  },
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
    minHeight: 100,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  typeScroll: {
    marginBottom: 4,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
    gap: 6,
  },
  typeIcon: {
    fontSize: 14,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "500",
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
  pickerText: {
    fontSize: 15,
  },
  pickerDropdown: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  ministryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
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
  submitText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
