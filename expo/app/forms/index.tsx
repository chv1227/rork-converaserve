import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ClipboardList,
  Plus,
  FileText,
  Heart,
  UserCheck,
  ChevronRight,
  BarChart3,
} from "lucide-react-native";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

interface FormItem {
  id: string;
  church_id: string;
  title: string;
  description: string | null;
  form_type: string;
  is_active: boolean;
  response_count: number;
  created_at: string;
}

const FORM_TYPE_ICONS: Record<string, React.ReactNode> = {
  registration: <UserCheck size={20} color="#3B82F6" />,
  volunteer: <Heart size={20} color="#EF4444" />,
  prayer: <Heart size={20} color="#8B5CF6" />,
  general: <FileText size={20} color="#6B7280" />,
};

export default function FormsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { currentOrganization, isAdmin } = useAuth();
  const { isLoading: dataLoading } = useData();
  const [refreshing, setRefreshing] = useState(false);

  const formsQuery = useQuery<FormItem[]>({
    queryKey: ["forms", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data, error } = await (supabase as any)
        .from("forms")
        .select("*")
        .eq("church_id", currentOrganization.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) return [];
      return (data || []) as FormItem[];
    },
    enabled: !!currentOrganization?.id,
  });

  const forms = formsQuery.data || [];
  const isLoading = formsQuery.isLoading || dataLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await formsQuery.refetch();
    setRefreshing(false);
  }, [formsQuery]);

  if (isLoading && forms.length === 0) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.title, { color: colors.text }]}>Forms</Text>
        {isAdmin && (
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/forms/create" as any)}
            activeOpacity={0.7}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {forms.length === 0 ? (
          <View style={styles.emptyState}>
            <ClipboardList size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Forms Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
              {isAdmin ? "Create a form for registration, volunteering, or prayer requests." : "Check back later for available forms."}
            </Text>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.emptyCta, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/forms/create" as any)}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.emptyCtaText}>Create First Form</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          forms.map((form) => (
            <TouchableOpacity
              key={form.id}
              style={[styles.formCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push(`/forms/${form.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.formIconBox, { backgroundColor: colors.primary + "10" }]}>
                {FORM_TYPE_ICONS[form.form_type] || FORM_TYPE_ICONS.general}
              </View>
              <View style={styles.formContent}>
                <Text style={[styles.formTitle, { color: colors.text }]}>{form.title}</Text>
                {form.description ? (
                  <Text style={[styles.formDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {form.description}
                  </Text>
                ) : null}
                <View style={styles.formMeta}>
                  <View style={[styles.typeTag, { backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[styles.typeTagText, { color: colors.textSecondary }]}>
                      {form.form_type?.charAt(0).toUpperCase() + form.form_type?.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.responseCount}>
                    <BarChart3 size={12} color={colors.textTertiary} />
                    <Text style={[styles.responseText, { color: colors.textTertiary }]}>
                      {form.response_count || 0} responses
                    </Text>
                  </View>
                </View>
              </View>
              <ChevronRight size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28, fontWeight: "700" },
  createBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  emptyState: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: "center", marginTop: 6, paddingHorizontal: 40, lineHeight: 20 },
  emptyCta: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20 },
  emptyCtaText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  formCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  formIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 },
  formContent: { flex: 1 },
  formTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  formDesc: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  formMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  typeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeTagText: { fontSize: 11, fontWeight: "600" },
  responseCount: { flexDirection: "row", alignItems: "center", gap: 4 },
  responseText: { fontSize: 11, fontWeight: "500" },
});
