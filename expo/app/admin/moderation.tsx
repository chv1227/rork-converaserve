import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  AlertTriangle,
  MessageSquare,
  FileText,
  Mail,
  X,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react-native";
import Colors from '@/constants/colors';
import { useAuth } from "@/providers/AuthProvider";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";

type ReportStatus = "pending" | "resolved" | "dismissed";

interface ReportItemProps {
  report: {
    id: string;
    contentType: string;
    content: string;
    reporterName: string;
    reason: string;
    status: ReportStatus;
    authorName: string;
    createdAt: string;
  };
  onResolve: () => void;
  onDismiss: () => void;
}

function ReportItem({ report, onResolve, onDismiss }: ReportItemProps) {
  const getContentTypeIcon = () => {
    switch (report.contentType) {
      case "post":
        return <FileText size={16} color={Colors.primary} />;
      case "comment":
        return <MessageSquare size={16} color={Colors.secondary} />;
      case "message":
        return <Mail size={16} color="#8B5CF6" />;
      default:
        return <AlertTriangle size={16} color={Colors.warning} />;
    }
  };

  const getStatusColor = () => {
    switch (report.status) {
      case "resolved":
        return "#10B981";
      case "dismissed":
        return Colors.textTertiary;
      default:
        return Colors.warning;
    }
  };

  const getStatusIcon = () => {
    switch (report.status) {
      case "resolved":
        return <CheckCircle size={14} color="#10B981" />;
      case "dismissed":
        return <XCircle size={14} color={Colors.textTertiary} />;
      default:
        return <Clock size={14} color={Colors.warning} />;
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={styles.reportItem}>
      <View style={styles.reportHeader}>
        <View style={styles.reportTypeRow}>
          <View style={[styles.reportTypeIcon, { backgroundColor: Colors.primary + "15" }]}>
            {getContentTypeIcon()}
          </View>
          <Text style={styles.reportType}>{report.contentType.toUpperCase()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + "20" }]}>
            {getStatusIcon()}
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={styles.reportDate}>{formatDate(report.createdAt)}</Text>
      </View>

      <View style={styles.reportContent}>
        <Text style={styles.reportLabel}>Reported Content:</Text>
        <Text style={styles.reportText} numberOfLines={3}>
          &ldquo;{report.content}&rdquo;
        </Text>
      </View>

      <View style={styles.reportMeta}>
        <View style={styles.reportMetaItem}>
          <Text style={styles.reportMetaLabel}>Reason:</Text>
          <Text style={styles.reportMetaValue}>{report.reason}</Text>
        </View>
        <View style={styles.reportMetaItem}>
          <Text style={styles.reportMetaLabel}>Author:</Text>
          <Text style={styles.reportMetaValue}>{report.authorName}</Text>
        </View>
        <View style={styles.reportMetaItem}>
          <Text style={styles.reportMetaLabel}>Reporter:</Text>
          <Text style={styles.reportMetaValue}>{report.reporterName}</Text>
        </View>
      </View>

      {report.status === "pending" && (
        <View style={styles.reportActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.resolveButton]}
            onPress={onResolve}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color={Colors.textInverse} />
            <Text style={styles.resolveButtonText}>Remove Content</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.dismissButton]}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <X size={16} color={Colors.textSecondary} />
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function ContentModeration() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("pending");

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/(tabs)");
    }
  }, [isAdmin, router]);

  const reportsQuery = useQuery({
    queryKey: ['reports', statusFilter],
    queryFn: async () => {
      // Return empty array as placeholder - reports table not yet implemented
      return [] as Array<{
        id: string;
        contentType: string;
        content: string;
        reporterName: string;
        reason: string;
        status: ReportStatus;
        authorName: string;
        createdAt: string;
      }>;
    },
    enabled: isAdmin,
  });

  const resolveReportMutation = useMutation({
    mutationFn: async (_data: { reportId: string; action: string; deleteContent?: boolean }) => {
      // Placeholder - reports table not yet implemented
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      if (Platform.OS !== "web") {
        Alert.alert("Success", "Report handled successfully");
      }
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const { mutate: resolveReport } = resolveReportMutation;

  const handleResolve = useCallback((reportId: string) => {
    if (Platform.OS === "web") {
      resolveReport({ reportId, action: "resolve", deleteContent: true });
    } else {
      Alert.alert(
        "Remove Content",
        "Are you sure you want to remove this content and resolve the report?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () =>
              resolveReport({ reportId, action: "resolve", deleteContent: true }),
          },
        ]
      );
    }
  }, [resolveReport]);

  const handleDismiss = useCallback((reportId: string) => {
    if (Platform.OS === "web") {
      resolveReport({ reportId, action: "dismiss" });
    } else {
      Alert.alert(
        "Dismiss Report",
        "Are you sure you want to dismiss this report? The content will remain.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Dismiss",
            onPress: () => resolveReport({ reportId, action: "dismiss" }),
          },
        ]
      );
    }
  }, [resolveReport]);

  const filters: { value: ReportStatus | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "resolved", label: "Resolved" },
    { value: "dismissed", label: "Dismissed" },
  ];

  const pendingCount = reportsQuery.data?.filter((r) => r.status === "pending").length || 0;

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Content Moderation</Text>
            <Text style={styles.subtitle}>
              {pendingCount} pending {pendingCount === 1 ? "report" : "reports"}
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                statusFilter === filter.value && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(filter.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === filter.value && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {reportsQuery.isLoading ? (
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : reportsQuery.data && reportsQuery.data.length > 0 ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {reportsQuery.data.map((report) => (
            <ReportItem
              key={report.id}
              report={report}
              onResolve={() => handleResolve(report.id)}
              onDismiss={() => handleDismiss(report.id)}
            />
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        <View style={[styles.container, styles.centered]}>
          <AlertTriangle size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Reports</Text>
          <Text style={styles.emptySubtitle}>
            {statusFilter === "all"
              ? "No reported content yet"
              : `No ${statusFilter} reports`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  filterChipTextActive: {
    color: Colors.textInverse,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  reportItem: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  reportTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reportTypeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  reportType: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  reportDate: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  reportContent: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  reportLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.textTertiary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reportText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    fontStyle: "italic" as const,
  },
  reportMeta: {
    gap: 8,
    marginBottom: 16,
  },
  reportMetaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  reportMetaLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    width: 80,
  },
  reportMetaValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "500" as const,
    flex: 1,
  },
  reportActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  resolveButton: {
    backgroundColor: Colors.error,
  },
  resolveButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textInverse,
  },
  dismissButton: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
