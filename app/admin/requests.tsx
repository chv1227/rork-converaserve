import React, { useState, useEffect } from "react";
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
import { Image } from "expo-image";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Check,
  X,
  Clock,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";

type RequestStatus = "pending" | "approved" | "rejected";

export default function MinistryRequestsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [selectedStatus, setSelectedStatus] = useState<RequestStatus | "all">("pending");

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/(tabs)");
    }
  }, [isAdmin, router]);

  const requestsQuery = trpc.admin.getMinistryJoinRequests.useQuery(
    { status: selectedStatus !== "all" ? selectedStatus : undefined },
    { enabled: isAdmin }
  );

  const approveMutation = trpc.workflows.approve.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      Alert.alert("Success", "Request approved successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const rejectMutation = trpc.workflows.reject.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      Alert.alert("Success", "Request rejected");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleApprove = (requestId: string) => {
    if (Platform.OS === "web") {
      approveMutation.mutate({ requestId });
    } else {
      Alert.alert(
        "Approve Request",
        "Are you sure you want to approve this ministry join request?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Approve",
            onPress: () => approveMutation.mutate({ requestId }),
          },
        ]
      );
    }
  };

  const handleReject = (requestId: string) => {
    if (Platform.OS === "web") {
      rejectMutation.mutate({ requestId });
    } else {
      Alert.alert(
        "Reject Request",
        "Are you sure you want to reject this ministry join request?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reject",
            style: "destructive",
            onPress: () => rejectMutation.mutate({ requestId }),
          },
        ]
      );
    }
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case "approved":
        return Colors.success;
      case "rejected":
        return Colors.error;
      default:
        return Colors.warning;
    }
  };

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case "approved":
        return <CheckCircle size={16} color={Colors.success} />;
      case "rejected":
        return <XCircle size={16} color={Colors.error} />;
      default:
        return <Clock size={16} color={Colors.warning} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const statusFilters: { value: RequestStatus | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

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
            <Text style={styles.title}>Ministry Requests</Text>
            <Text style={styles.subtitle}>
              {requestsQuery.data?.filter((r) => r.status === "pending").length || 0} pending
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {statusFilters.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                selectedStatus === filter.value && styles.filterChipActive,
              ]}
              onPress={() => setSelectedStatus(filter.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === filter.value && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {requestsQuery.isLoading ? (
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {requestsQuery.data?.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyStateText}>No requests found</Text>
              <Text style={styles.emptyStateSubtext}>
                {selectedStatus === "pending"
                  ? "No pending ministry join requests"
                  : "No requests matching your filter"}
              </Text>
            </View>
          ) : (
            requestsQuery.data?.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.userRow}>
                    {request.requesterAvatar ? (
                      <Image
                        source={{ uri: request.requesterAvatar }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Users size={20} color={Colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{request.requesterName}</Text>
                      <Text style={styles.userEmail}>{request.requesterEmail}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(request.status) + "20" },
                    ]}
                  >
                    {getStatusIcon(request.status)}
                    <Text
                      style={[styles.statusText, { color: getStatusColor(request.status) }]}
                    >
                      {request.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.requestDetails}>
                  <View style={styles.ministryRow}>
                    <View
                      style={[
                        styles.ministryDot,
                        { backgroundColor: request.ministryColor || Colors.primary },
                      ]}
                    />
                    <Text style={styles.ministryName}>
                      Wants to join: <Text style={styles.ministryNameBold}>{request.ministryName}</Text>
                    </Text>
                  </View>
                  <Text style={styles.requestDate}>
                    Requested on {formatDate(request.createdAt)}
                  </Text>
                  {request.reviewerName && (
                    <Text style={styles.reviewerText}>
                      Reviewed by {request.reviewerName}
                    </Text>
                  )}
                  {request.reviewNote && (
                    <Text style={styles.reviewNote}>Note: {request.reviewNote}</Text>
                  )}
                </View>

                {request.status === "pending" && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApprove(request.id)}
                      disabled={approveMutation.isPending}
                      activeOpacity={0.7}
                    >
                      {approveMutation.isPending ? (
                        <ActivityIndicator size="small" color={Colors.textInverse} />
                      ) : (
                        <>
                          <Check size={16} color={Colors.textInverse} />
                          <Text style={styles.approveButtonText}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleReject(request.id)}
                      disabled={rejectMutation.isPending}
                      activeOpacity={0.7}
                    >
                      {rejectMutation.isPending ? (
                        <ActivityIndicator size="small" color={Colors.error} />
                      ) : (
                        <>
                          <X size={16} color={Colors.error} />
                          <Text style={styles.rejectButtonText}>Reject</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  requestCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700" as const,
  },
  requestDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  ministryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  ministryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ministryName: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  ministryNameBold: {
    fontWeight: "600" as const,
    color: Colors.text,
  },
  requestDate: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  reviewerText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  reviewNote: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    fontStyle: "italic",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.success,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textInverse,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.error + "15",
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.error,
  },
});
