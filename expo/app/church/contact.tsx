import React, { useState, useCallback } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Globe,
  Clock,
  Send,
  MessageCircle,
  Check,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";

export default function ContactScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { currentOrganization, user } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const churchName = currentOrganization?.name || "Our Church";

  const contactMethods = [
    {
      icon: <Phone size={22} color="#FFFFFF" />,
      label: "Call Us",
      value: currentOrganization?.phone || "(555) 123-4567",
      color: "#10B981",
      action: () => {
        const phone = currentOrganization?.phone?.replace(/\D/g, "") || "5551234567";
        void Linking.openURL(`tel:${phone}`);
      },
    },
    {
      icon: <Mail size={22} color="#FFFFFF" />,
      label: "Email",
      value: currentOrganization?.email || "info@churchconnect.org",
      color: "#6366F1",
      action: () => {
        void Linking.openURL(`mailto:${currentOrganization?.email || "info@churchconnect.org"}`);
      },
    },
    {
      icon: <MapPin size={22} color="#FFFFFF" />,
      label: "Address",
      value: currentOrganization?.description || "123 Faith Avenue, Your City, ST 12345",
      color: "#EF4444",
      action: () => {
        void Linking.openURL("https://maps.google.com/?q=123+Faith+Avenue");
      },
    },
    {
      icon: <Globe size={22} color="#FFFFFF" />,
      label: "Website",
      value: currentOrganization?.name ? `${currentOrganization.name.toLowerCase().replace(/\s/g, "")}.org` : "churchconnect.org",
      color: "#0EA5E9",
      action: () => {
        void Linking.openURL("https://churchconnect.org");
      },
    },
  ];

  const handleSend = useCallback(async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Missing Fields", "Please enter a subject and message.");
      return;
    }

    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSending(true);

    try {
      const { error } = await (supabase as any)
        .from("internal_notes")
        .insert({
          church_id: currentOrganization?.id,
          title: `Contact: ${subject.trim()}`,
          content: `From: ${name.trim() || "Anonymous"} (${email.trim() || "No email"})\n\n${message.trim()}`,
          note_type: "contact",
          visibility: "staff",
          is_follow_up_required: true,
        });

      if (error) throw error;

      setSent(true);
    } catch (err) {
      console.log("Contact form error:", err);
      Alert.alert("Error", "Could not send your message. Please try again or use one of the contact methods below.");
    } finally {
      setIsSending(false);
    }
  }, [subject, message, name, email, currentOrganization?.id]);

  const handleReset = useCallback(() => {
    setSubject("");
    setMessage("");
    setSent(false);
  }, []);

  if (sent) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Contact</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: colors.success + "15" }]}>
            <Check size={48} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Message Sent!</Text>
          <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
            Thank you for reaching out. Our team will get back to you within 24-48 hours.
          </Text>
          <TouchableOpacity
            style={[styles.sendAnotherBtn, { backgroundColor: colors.primary }]}
            onPress={handleReset}
            activeOpacity={0.8}
          >
            <MessageCircle size={18} color="#FFFFFF" />
            <Text style={styles.sendAnotherText}>Send Another Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Contact Us</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Contact Methods */}
        <View style={styles.contactGrid}>
          {contactMethods.map((method, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.contactMethodCard, { backgroundColor: colors.surface }]}
              onPress={method.action}
              activeOpacity={0.7}
            >
              <View style={[styles.contactMethodIcon, { backgroundColor: method.color }]}>
                {method.icon}
              </View>
              <Text style={[styles.contactMethodLabel, { color: colors.text }]}>{method.label}</Text>
              <Text style={[styles.contactMethodValue, { color: colors.textSecondary }]} numberOfLines={1}>
                {method.value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Form */}
        <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Send Us a Message</Text>
          <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
            Have a question, prayer request, or just want to say hello? We'd love to hear from you.
          </Text>

          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Your Name</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight, color: colors.text }]}
              placeholder="Enter your name"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight, color: colors.text }]}
              placeholder="Enter your email"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Subject</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight, color: colors.text }]}
              placeholder="What's this about?"
              placeholderTextColor={colors.textTertiary}
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Message</Text>
            <TextInput
              style={[styles.fieldTextarea, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight, color: colors.text }]}
              placeholder="Write your message here..."
              placeholderTextColor={colors.textTertiary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: colors.primary },
              (!subject.trim() || !message.trim() || isSending) && { opacity: 0.5 },
            ]}
            onPress={handleSend}
            disabled={!subject.trim() || !message.trim() || isSending}
            activeOpacity={0.8}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Send size={18} color="#FFFFFF" />
                <Text style={styles.sendButtonText}>Send Message</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Office Hours */}
        <View style={[styles.hoursCard, { backgroundColor: colors.surface }]}>
          <Clock size={20} color={colors.primary} />
          <View style={styles.hoursContent}>
            <Text style={[styles.hoursTitle, { color: colors.text }]}>Office Hours</Text>
            <Text style={[styles.hoursText, { color: colors.textSecondary }]}>
              Monday - Thursday: 9:00 AM - 5:00 PM{"\n"}
              Friday: 9:00 AM - 12:00 PM{"\n"}
              Sunday: 8:00 AM - 1:00 PM
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    fontWeight: "700" as const,
  },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  contactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  contactMethodCard: {
    width: "47%",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  contactMethodIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  contactMethodLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
  },
  contactMethodValue: {
    fontSize: 12,
    textAlign: "center",
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  formField: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    marginBottom: 6,
  },
  fieldInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  fieldTextarea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 120,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  hoursCard: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  hoursContent: {
    flex: 1,
  },
  hoursTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  hoursText: {
    fontSize: 13,
    lineHeight: 20,
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  sendAnotherBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  sendAnotherText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
});
