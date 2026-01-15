import React, { useCallback, useMemo, useState } from "react";
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
  Modal,
  TextInput,
  KeyboardAvoidingView,
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
  Sparkles,
  MessageCircle,
  Play,
  MessageSquare,
  Clock,
  MapPin,
  X,
  Send,
  Megaphone,
  Mail,
  Star,
  Shield,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/providers/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import DiscussionCard from "@/components/DiscussionCard";
import PrayerRequestCard from "@/components/PrayerRequestCard";
import MemberCard from "@/components/MemberCard";
import {
  getMinistryById,
  getMembersForMinistry,
  getDiscussionsForMinistry,
  getPrayerRequestsForMinistry,
  getEventsForMinistry,
  getAnnouncementsForMinistry,
  getMissionStatement,
} from "@/mocks/ministryData";
import { MinistryMember, DiscussionPost, PrayerRequest, MinistryEvent, MinistryAnnouncement } from "@/types";

type IconComponentType = React.ComponentType<{ size: number; color: string }>;

const iconMap: Record<string, IconComponentType> = {
  Music,
  Users,
  Heart,
  Sparkles,
};

type TabType = 'about' | 'members' | 'discussions' | 'prayers' | 'events';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [showDiscussionModal, setShowDiscussionModal] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [newDiscussionTitle, setNewDiscussionTitle] = useState("");
  const [newDiscussionContent, setNewDiscussionContent] = useState("");
  const [newPrayerTitle, setNewPrayerTitle] = useState("");
  const [newPrayerContent, setNewPrayerContent] = useState("");
  const [isAnonymousPrayer, setIsAnonymousPrayer] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isDefaultMinistry = id?.startsWith('worship-') || id?.startsWith('prayer-') || id?.startsWith('deacon-') || id?.startsWith('children');

  const mockMinistry = useMemo(() => isDefaultMinistry ? getMinistryById(id || '') : null, [isDefaultMinistry, id]);
  const mockDiscussions = useMemo(() => isDefaultMinistry ? getDiscussionsForMinistry(id || '') : [], [isDefaultMinistry, id]);
  const mockPrayerRequests = useMemo(() => isDefaultMinistry ? getPrayerRequestsForMinistry(id || '') : [], [isDefaultMinistry, id]);
  const mockEvents = useMemo(() => isDefaultMinistry ? getEventsForMinistry(id || '') : [], [isDefaultMinistry, id]);
  const mockAnnouncements = useMemo(() => isDefaultMinistry ? getAnnouncementsForMinistry(id || '') : [], [isDefaultMinistry, id]);
  const missionStatement = useMemo(() => isDefaultMinistry ? getMissionStatement(id || '') : '', [isDefaultMinistry, id]);

  const ministryQuery = trpc.ministries.getById.useQuery(
    { id: id || "" },
    { enabled: !!id && !isDefaultMinistry }
  );

  const eventsQuery = trpc.events.list.useQuery(
    { ministryId: id || "" },
    { enabled: !!id && !isDefaultMinistry }
  );

  const ministry = isDefaultMinistry ? mockMinistry : ministryQuery.data;
  const events = isDefaultMinistry ? mockEvents : (eventsQuery.data || []);
  const members = useMemo(() => isDefaultMinistry ? getMembersForMinistry(id || '') : [], [isDefaultMinistry, id]);
  const discussions = isDefaultMinistry ? mockDiscussions : [];
  const prayerRequests = isDefaultMinistry ? mockPrayerRequests : [];
  const announcements = isDefaultMinistry ? mockAnnouncements : [];
  const leaders = useMemo(() => members.filter(m => m.role === 'leader' || m.role === 'admin'), [members]);

  const isMember = useMemo(
    () => user?.ministries.includes(id || "") || isDefaultMinistry,
    [user?.ministries, id, isDefaultMinistry]
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
    setIsRefreshing(true);
    if (!isDefaultMinistry) {
      ministryQuery.refetch();
      eventsQuery.refetch();
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [ministryQuery, eventsQuery, isDefaultMinistry]);

  const handleJoinLeave = () => {
    if (!id) return;

    if (isMember && !isDefaultMinistry) {
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
    } else if (!isDefaultMinistry) {
      joinMutation.mutate({ ministryId: id });
    } else {
      Alert.alert("Joined!", "You are now a member of this ministry.");
    }
  };

  const handlePostDiscussion = () => {
    if (!newDiscussionTitle.trim() || !newDiscussionContent.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    Alert.alert("Success", "Your discussion has been posted!");
    setShowDiscussionModal(false);
    setNewDiscussionTitle("");
    setNewDiscussionContent("");
  };

  const handlePostPrayer = () => {
    if (!newPrayerTitle.trim() || !newPrayerContent.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    Alert.alert("Success", "Your prayer request has been shared!");
    setShowPrayerModal(false);
    setNewPrayerTitle("");
    setNewPrayerContent("");
    setIsAnonymousPrayer(false);
  };

  const IconComponent = ministry ? (iconMap[ministry.icon] || Users) : Users;
  const isLoading = !isDefaultMinistry && ministryQuery.isLoading;
  const isActionLoading = joinMutation.isPending || leaveMutation.isPending;

  const tabs: { key: TabType; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
    { key: 'about', label: 'About', icon: Megaphone },
    { key: 'members', label: 'Members', icon: Users },
    { key: 'discussions', label: 'Discuss', icon: MessageSquare },
    { key: 'prayers', label: 'Prayers', icon: Heart },
    { key: 'events', label: 'Events', icon: Calendar },
  ];

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

  const handleMessageLeader = (leaderId: string) => {
    router.push(`/chat/${leaderId}` as Href);
  };

  const renderAboutTab = () => (
    <>
      <View style={styles.section}>
        <View style={styles.missionHeader}>
          <View style={[styles.missionIconContainer, { backgroundColor: ministry.color + '15' }]}>
            <Star size={20} color={ministry.color} />
          </View>
          <Text style={styles.missionTitle}>Our Mission</Text>
        </View>
        <View style={[styles.missionCard, { borderLeftColor: ministry.color }]}>
          <Text style={styles.missionText}>
            {missionStatement || ministry.description}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.leadersHeader}>
          <View style={[styles.leadersIconContainer, { backgroundColor: ministry.color + '15' }]}>
            <Shield size={20} color={ministry.color} />
          </View>
          <Text style={styles.leadersTitle}>Leadership</Text>
        </View>
        
        {leaders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Users size={32} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No leaders assigned yet</Text>
          </View>
        ) : (
          <View style={styles.leadersGrid}>
            {leaders.map((leader: MinistryMember) => (
              <View key={leader.id} style={styles.leaderCard}>
                <Image source={{ uri: leader.avatar }} style={styles.leaderAvatar} />
                <View style={styles.leaderInfo}>
                  <Text style={styles.leaderName}>{leader.name}</Text>
                  <View style={[styles.leaderRoleBadge, { backgroundColor: ministry.color + '15' }]}>
                    <Text style={[styles.leaderRoleText, { color: ministry.color }]}>
                      {leader.role === 'leader' ? 'Ministry Leader' : 'Admin'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.messageLeaderButton, { backgroundColor: ministry.color }]}
                  onPress={() => handleMessageLeader(leader.id)}
                  activeOpacity={0.7}
                >
                  <Mail size={18} color={Colors.textInverse} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {announcements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Announcements</Text>
          {announcements.map((announcement: MinistryAnnouncement) => (
            <View key={announcement.id} style={[styles.announcementCard, announcement.priority === 'high' && styles.announcementCardHigh]}>
              <View style={styles.announcementHeader}>
                <Image source={{ uri: announcement.authorAvatar }} style={styles.announcementAvatar} />
                <View style={styles.announcementAuthorInfo}>
                  <Text style={styles.announcementAuthor}>{announcement.authorName}</Text>
                  <Text style={styles.announcementDate}>
                    {new Date(announcement.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {announcement.priority === 'high' && (
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityText}>Important</Text>
                  </View>
                )}
              </View>
              <Text style={styles.announcementTitle}>{announcement.title}</Text>
              <Text style={styles.announcementContent}>{announcement.content}</Text>
            </View>
          ))}
        </View>
      )}

      {id === "worship-ministry" && isMember && (
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
    </>
  );

  const renderMembersTab = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Members ({members.length})</Text>
      </View>
      
      <Text style={styles.roleLabel}>Leadership</Text>
      {members.filter(m => m.role === 'leader' || m.role === 'admin').map((member: MinistryMember) => (
        <MemberCard key={member.id} member={member} />
      ))}
      
      <Text style={[styles.roleLabel, { marginTop: 16 }]}>Members</Text>
      {members.filter(m => m.role === 'member').map((member: MinistryMember) => (
        <MemberCard key={member.id} member={member} />
      ))}
    </View>
  );

  const renderDiscussionsTab = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Discussions</Text>
        {isMember && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: ministry.color }]}
            onPress={() => setShowDiscussionModal(true)}
          >
            <Plus size={16} color={Colors.textInverse} />
            <Text style={styles.addButtonText}>New</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {discussions.length === 0 ? (
        <View style={styles.emptyCard}>
          <MessageSquare size={32} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>No discussions yet</Text>
          <Text style={styles.emptySubtext}>Start the conversation!</Text>
        </View>
      ) : (
        discussions.map((post: DiscussionPost) => (
          <DiscussionCard key={post.id} post={post} />
        ))
      )}
    </View>
  );

  const renderPrayersTab = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Prayer Requests</Text>
        {isMember && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: ministry.color }]}
            onPress={() => setShowPrayerModal(true)}
          >
            <Plus size={16} color={Colors.textInverse} />
            <Text style={styles.addButtonText}>Share</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {prayerRequests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Heart size={32} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>No prayer requests</Text>
          <Text style={styles.emptySubtext}>Share your prayer needs</Text>
        </View>
      ) : (
        prayerRequests.map((request: PrayerRequest) => (
          <PrayerRequestCard key={request.id} request={request} />
        ))
      )}
    </View>
  );

  const renderEventsTab = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
      </View>
      
      {events.length === 0 ? (
        <View style={styles.emptyCard}>
          <Calendar size={32} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>No upcoming events</Text>
        </View>
      ) : (
        (events as MinistryEvent[]).map((event) => (
          <TouchableOpacity key={event.id} style={styles.eventCard} activeOpacity={0.7}>
            <View style={[styles.eventDateBadge, { backgroundColor: ministry.color + '15' }]}>
              <Text style={[styles.eventDateDay, { color: ministry.color }]}>
                {new Date(event.date).getDate()}
              </Text>
              <Text style={[styles.eventDateMonth, { color: ministry.color }]}>
                {new Date(event.date).toLocaleString('default', { month: 'short' })}
              </Text>
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <View style={styles.eventMeta}>
                <Clock size={12} color={Colors.textSecondary} />
                <Text style={styles.eventMetaText}>{event.time}</Text>
              </View>
              <View style={styles.eventMeta}>
                <MapPin size={12} color={Colors.textSecondary} />
                <Text style={styles.eventMetaText}>{event.location}</Text>
              </View>
              {event.isRecurring && (
                <View style={styles.recurringBadge}>
                  <Text style={styles.recurringText}>{event.recurrencePattern}</Text>
                </View>
              )}
            </View>
            <View style={styles.eventAttendees}>
              <Users size={14} color={Colors.textSecondary} />
              <Text style={styles.eventAttendeesText}>{event.attendeesCount}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

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

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && { backgroundColor: ministry.color + '15' }]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <TabIcon size={16} color={isActive ? ministry.color : Colors.textSecondary} />
                <Text style={[styles.tabText, isActive && { color: ministry.color }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
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

        {activeTab === 'about' && renderAboutTab()}
        {activeTab === 'members' && renderMembersTab()}
        {activeTab === 'discussions' && renderDiscussionsTab()}
        {activeTab === 'prayers' && renderPrayersTab()}
        {activeTab === 'events' && renderEventsTab()}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={showDiscussionModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDiscussionModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Discussion</Text>
              <TouchableOpacity onPress={() => setShowDiscussionModal(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Discussion topic..."
                placeholderTextColor={Colors.textTertiary}
                value={newDiscussionTitle}
                onChangeText={setNewDiscussionTitle}
              />
              <Text style={styles.inputLabel}>Content</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Share your thoughts..."
                placeholderTextColor={Colors.textTertiary}
                value={newDiscussionContent}
                onChangeText={setNewDiscussionContent}
                multiline
                numberOfLines={4}
              />
            </View>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: ministry.color }]}
              onPress={handlePostDiscussion}
            >
              <Send size={18} color={Colors.textInverse} />
              <Text style={styles.submitButtonText}>Post Discussion</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showPrayerModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPrayerModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Prayer Request</Text>
              <TouchableOpacity onPress={() => setShowPrayerModal(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Brief description..."
                placeholderTextColor={Colors.textTertiary}
                value={newPrayerTitle}
                onChangeText={setNewPrayerTitle}
              />
              <Text style={styles.inputLabel}>Prayer Request</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Share your prayer need..."
                placeholderTextColor={Colors.textTertiary}
                value={newPrayerContent}
                onChangeText={setNewPrayerContent}
                multiline
                numberOfLines={4}
              />
              <TouchableOpacity
                style={styles.anonymousToggle}
                onPress={() => setIsAnonymousPrayer(!isAnonymousPrayer)}
              >
                <View style={[styles.checkbox, isAnonymousPrayer && { backgroundColor: ministry.color, borderColor: ministry.color }]}>
                  {isAnonymousPrayer && <Check size={14} color={Colors.textInverse} />}
                </View>
                <Text style={styles.anonymousText}>Post anonymously</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: ministry.color }]}
              onPress={handlePostPrayer}
            >
              <Heart size={18} color={Colors.textInverse} />
              <Text style={styles.submitButtonText}>Share Prayer</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    height: 220,
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
    bottom: 20,
    left: 20,
    right: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.textInverse,
    marginBottom: 6,
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
  tabsContainer: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
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
    marginBottom: 20,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textInverse,
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
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  missionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  missionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 4,
  },
  missionText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
    fontStyle: 'italic' as const,
  },
  leadersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  leadersIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadersTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  leadersGrid: {
    gap: 12,
  },
  leaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  leaderAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  leaderRoleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  leaderRoleText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  messageLeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  announcementCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  announcementCardHigh: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  announcementAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  announcementAuthorInfo: {
    flex: 1,
  },
  announcementAuthor: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  announcementDate: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  priorityBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.warning,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  announcementContent: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  eventDateBadge: {
    width: 50,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  eventDateDay: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  eventDateMonth: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  eventMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  recurringBadge: {
    backgroundColor: Colors.infoLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
  },
  recurringText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.info,
  },
  eventAttendees: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  eventAttendeesText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  musicPlayerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonymousText: {
    fontSize: 14,
    color: Colors.text,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
});
