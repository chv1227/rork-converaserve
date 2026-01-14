import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, Stack, Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Users,
  Calendar,
  Check,
  Plus,
  Music,
  Heart,
  Baby,
  HandHeart,
  Video,
  MessageCircle,
  Play,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/providers/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import EventCard from "@/components/EventCard";
import { Event } from "@/types";

type IconComponentType = React.ComponentType<{ size: number; color: string }>;

const iconMap: Record<string, IconComponentType> = {
  Music,
  Users,
  Heart,
  Baby,
  HandHeart,
  Video,
};

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const ministryQuery = trpc.ministries.getById.useQuery(
    { id: id || "" },
    { enabled: !!id }
  );

  const eventsQuery = trpc.events.list.useQuery(
    { ministryId: id || "" },
    { enabled: !!id }
  );

  const ministry = ministryQuery.data;
  const events = eventsQuery.data || [];
  const isMember = useMemo(
    () => user?.ministries.includes(id || "") || false,
    [user?.ministries, id]
  );

  const joinMutation = trpc.ministries.join.useMutation({
    onSuccess: () => {
      console.log("Successfully joined ministry");
      queryClient.invalidateQueries();
      if (Platform.OS !== "web") {
        Alert.alert("Success", "You have joined this group!");
      }
    },
    onError: (error) => {
      console.error("Failed to join ministry:", error);
      if (Platform.OS !== "web") {
        Alert.alert("Error", "Failed to join group. Please try again.");
      }
    },
  });

  const leaveMutation = trpc.ministries.leave.useMutation({
    onSuccess: () => {
      console.log("Successfully left ministry");
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error("Failed to leave ministry:", error);
      if (Platform.OS !== "web") {
        Alert.alert("Error", "Failed to leave group. Please try again.");
      }
    },
  });

  const onRefresh = useCallback(() => {
    console.log("Refreshing group detail...");
    ministryQuery.refetch();
    eventsQuery.refetch();
  }, [ministryQuery, eventsQuery]);

  const handleJoinLeave = () => {
    if (!id) return;

    if (isMember) {
      if (Platform.OS === "web") {
        leaveMutation.mutate({ ministryId: id });
      } else {
        Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => leaveMutation.mutate({ ministryId: id }),
          },
        ]);
      }
    } else {
      joinMutation.mutate({ ministryId: id });
    }
  };

  const IconComponent = ministry ? iconMap[ministry.icon] || Users : Users;
  const isLoading = ministryQuery.isLoading;
  const isActionLoading = joinMutation.isPending || leaveMutation.isPending;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!ministry) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Group not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.heroContainer}>
        <Image source={{ uri: ministry.image }} style={styles.heroImage} contentFit="cover" />
        <View style={styles.heroOverlay} />

        <View style={[styles.heroHeader, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.heroBackButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroContent}>
          <View style={[styles.iconContainer, { backgroundColor: ministry.color }]}>
            <IconComponent size={28} color={Colors.textInverse} />
          </View>
          <Text style={styles.heroTitle}>{ministry.name}</Text>
          <View style={styles.heroStats}>
            <Users size={16} color={Colors.textInverse} />
            <Text style={styles.heroStatText}>{ministry.memberCount} members</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={ministryQuery.isRefetching || eventsQuery.isRefetching}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.joinButton,
              isMember ? styles.joinedButton : styles.notJoinedButton,
              { flex: isMember ? 1 : undefined },
            ]}
            onPress={handleJoinLeave}
            disabled={isActionLoading}
            activeOpacity={0.7}
          >
            {isActionLoading ? (
              <ActivityIndicator size="small" color={isMember ? Colors.primary : Colors.textInverse} />
            ) : isMember ? (
              <>
                <Check size={18} color={Colors.primary} />
                <Text style={styles.joinedButtonText}>Joined</Text>
              </>
            ) : (
              <>
                <Plus size={18} color={Colors.textInverse} />
                <Text style={styles.notJoinedButtonText}>Join Group</Text>
              </>
            )}
          </TouchableOpacity>

          {isMember && (
            <TouchableOpacity
              style={[styles.chatButton, { backgroundColor: ministry.color }]}
              onPress={() => router.push(`/chat/c-${id}` as Href)}
              activeOpacity={0.7}
            >
              <MessageCircle size={18} color={Colors.textInverse} />
              <Text style={styles.chatButtonText}>Group Chat</Text>
            </TouchableOpacity>
          )}
        </View>

        {id === "m1" && isMember && (
          <TouchableOpacity
            style={styles.musicPlayerButton}
            onPress={() => router.push("/worship" as Href)}
            activeOpacity={0.7}
          >
            <View style={styles.musicPlayerLeft}>
              <View style={[styles.musicPlayerIcon, { backgroundColor: ministry.color }]}>
                <Music size={24} color={Colors.textInverse} />
              </View>
              <View style={styles.musicPlayerInfo}>
                <Text style={styles.musicPlayerTitle}>Music Player</Text>
                <Text style={styles.musicPlayerSubtitle}>Practice songs & learn your parts</Text>
              </View>
            </View>
            <View style={[styles.musicPlayerPlayButton, { backgroundColor: ministry.color }]}>
              <Play size={18} color={Colors.textInverse} fill={Colors.textInverse} />
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <Text style={styles.description}>{ministry.description}</Text>
          </View>
        </View>

        {events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            {events.map((event: Event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => console.log("Event pressed:", event.id)}
              />
            ))}
          </View>
        )}

        {events.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <View style={styles.emptyCard}>
              <Calendar size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No upcoming events</Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
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
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  backButtonText: {
    color: Colors.textInverse,
    fontWeight: "600" as const,
  },
  heroContainer: {
    height: 280,
    position: "relative",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  heroBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroContent: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.textInverse,
    marginBottom: 8,
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroStatText: {
    fontSize: 14,
    color: Colors.textInverse,
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  notJoinedButton: {
    backgroundColor: Colors.primary,
  },
  joinedButton: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  notJoinedButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.textInverse,
  },
  joinedButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  chatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.textInverse,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  description: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  musicPlayerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  musicPlayerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  musicPlayerIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  musicPlayerInfo: {
    marginLeft: 14,
    flex: 1,
  },
  musicPlayerTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  musicPlayerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  musicPlayerPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
