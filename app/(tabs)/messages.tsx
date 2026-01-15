import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Href } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import ConversationItem from "@/components/ConversationItem";

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentOrganization } = useAuth();
  const { conversations, isLoading, isRefreshing, refresh } = useData();
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    console.log("Refreshing messages...");
    setLocalRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.log("Refresh error:", error);
    } finally {
      setLocalRefreshing(false);
    }
  }, [refresh]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>{conversations.length} conversations</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            onPress={() => {
              console.log("Navigating to chat:", item.id);
              router.push(`/chat/${item.id}` as Href);
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={localRefreshing || isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <>
            {isLoading && conversations.length === 0 && currentOrganization && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <MessageCircle size={40} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyText}>No ministry chats yet</Text>
            <Text style={styles.emptySubtext}>
              Join a ministry group to start messaging with other members
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 80,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  setupBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  setupBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  setupBannerText: {
    flex: 1,
  },
  setupBannerTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  setupBannerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
});
