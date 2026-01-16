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
  BarChart3,
  Vote,
  Trash2,
  XCircle,
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
import { MinistryMember, DiscussionPost, PrayerRequest, MinistryEvent, MinistryAnnouncement, Poll, PollOption } from "@/types";

type IconComponentType = React.ComponentType<{ size: number; color: string }>;

const iconMap: Record<string, IconComponentType> = {
  Music,
  Users,
  Heart,
  Sparkles,
};

type TabType = 'about' | 'members' | 'discussions' | 'prayers' | 'music';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [showDiscussionModal, setShowDiscussionModal] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showPollsListModal, setShowPollsListModal] = useState(false);
  const [newDiscussionTitle, setNewDiscussionTitle] = useState("");
  const [newDiscussionContent, setNewDiscussionContent] = useState("");
  const [newPrayerTitle, setNewPrayerTitle] = useState("");
  const [newPrayerContent, setNewPrayerContent] = useState("");
  const [isAnonymousPrayer, setIsAnonymousPrayer] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());

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

  const pollsQuery = trpc.polls.list.useQuery(
    { ministryId: id || "" },
    { enabled: !!id }
  );

  const createPollMutation = trpc.polls.create.useMutation({
    onSuccess: () => {
      console.log("Poll created successfully");
      queryClient.invalidateQueries({ queryKey: [['polls', 'list']] });
      pollsQuery.refetch();
      setShowPollModal(false);
      setNewPollQuestion("");
      setPollOptions(["", ""]);
      setAllowMultiple(false);
      Alert.alert("Success", "Poll created successfully!");
    },
    onError: (error) => {
      console.error("Failed to create poll:", error);
      Alert.alert("Error", "Failed to create poll. Please try again.");
    },
  });

  const votePollMutation = trpc.polls.vote.useMutation({
    onSuccess: () => {
      console.log("Vote recorded successfully");
      queryClient.invalidateQueries({ queryKey: [['polls', 'list']] });
      pollsQuery.refetch();
      setSelectedOptions(new Set());
    },
    onError: (error) => {
      console.error("Failed to vote:", error);
      Alert.alert("Error", error.message || "Failed to vote. Please try again.");
    },
  });

  const closePollMutation = trpc.polls.close.useMutation({
    onSuccess: () => {
      console.log("Poll closed successfully");
      queryClient.invalidateQueries({ queryKey: [['polls', 'list']] });
      pollsQuery.refetch();
      Alert.alert("Success", "Poll closed successfully!");
    },
    onError: (error) => {
      console.error("Failed to close poll:", error);
      Alert.alert("Error", "Failed to close poll. Please try again.");
    },
  });

  const deletePollMutation = trpc.polls.delete.useMutation({
    onSuccess: () => {
      console.log("Poll deleted successfully");
      queryClient.invalidateQueries({ queryKey: [['polls', 'list']] });
      pollsQuery.refetch();
      Alert.alert("Success", "Poll deleted successfully!");
    },
    onError: (error) => {
      console.error("Failed to delete poll:", error);
      Alert.alert("Error", "Failed to delete poll. Please try again.");
    },
  });

  const polls = pollsQuery.data || [];

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
    pollsQuery.refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [ministryQuery, eventsQuery, isDefaultMinistry, pollsQuery]);

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

  const handleCreatePoll = () => {
    if (!newPollQuestion.trim()) {
      Alert.alert("Error", "Please enter a poll question");
      return;
    }
    const validOptions = pollOptions.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      Alert.alert("Error", "Please enter at least 2 options");
      return;
    }
    if (!currentOrganization) {
      Alert.alert("Error", "Organization not found");
      return;
    }

    createPollMutation.mutate({
      ministryId: id || "",
      organizationId: currentOrganization.id,
      question: newPollQuestion.trim(),
      options: validOptions,
      allowMultiple,
      isAnonymous: false,
    });
  };

  const handleAddOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };

  const handleVote = (poll: Poll) => {
    if (selectedOptions.size === 0) {
      Alert.alert("Error", "Please select at least one option");
      return;
    }
    votePollMutation.mutate({
      pollId: poll.id,
      optionIds: Array.from(selectedOptions),
    });
  };

  const handleToggleOption = (poll: Poll, optionId: string) => {
    const hasVoted = poll.options.some((opt: PollOption) => opt.voterIds.includes(user?.id || ""));
    if (hasVoted) return;

    setSelectedOptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(optionId)) {
        newSet.delete(optionId);
      } else {
        if (!poll.allowMultiple) {
          newSet.clear();
        }
        newSet.add(optionId);
      }
      return newSet;
    });
  };

  const handleClosePoll = (pollId: string) => {
    Alert.alert("Close Poll", "Are you sure you want to close this poll?", [
      { text: "Cancel", style: "cancel" },
      { text: "Close", style: "destructive", onPress: () => closePollMutation.mutate({ pollId }) },
    ]);
  };

  const handleDeletePoll = (pollId: string) => {
    Alert.alert("Delete Poll", "Are you sure you want to delete this poll?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePollMutation.mutate({ pollId }) },
    ]);
  };

  const IconComponent = ministry ? (iconMap[ministry.icon] || Users) : Users;
  const isLoading = !isDefaultMinistry && ministryQuery.isLoading;
  const isActionLoading = joinMutation.isPending || leaveMutation.isPending;

  const tabs = useMemo(() => {
    const baseTabs: { key: TabType; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
      { key: 'about', label: 'About', icon: Megaphone },
      { key: 'members', label: 'Members', icon: Users },
      { key: 'discussions', label: 'Discuss', icon: MessageSquare },
      { key: 'prayers', label: 'Prayers', icon: Heart },
    ];

    if (id === 'worship-ministry' && isMember) {
      return [
        ...baseTabs.slice(0, 1),
        { key: 'music' as TabType, label: 'Music', icon: Music },
        ...baseTabs.slice(1),
      ];
    }
    return baseTabs;
  }, [id, isMember]);

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

  const renderEventsSection = () => (
    <View style={styles.eventsTopSection}>
      <View style={styles.eventsTopHeader}>
        <View style={[styles.eventsTopIconContainer, { backgroundColor: ministry.color + '15' }]}>
          <Calendar size={20} color={ministry.color} />
        </View>
        <Text style={styles.eventsTopTitle}>Upcoming Events</Text>
        <View style={styles.eventsCountBadge}>
          <Text style={styles.eventsCountText}>{events.length}</Text>
        </View>
      </View>
      
      {events.length === 0 ? (
        <View style={styles.eventsEmptyCard}>
          <Calendar size={28} color={Colors.textTertiary} />
          <Text style={styles.eventsEmptyText}>No upcoming events</Text>
          <Text style={styles.eventsEmptySubtext}>Check back later for new events</Text>
        </View>
      ) : (
        <View style={styles.eventsListContainer}>
          {(events as MinistryEvent[]).slice(0, 3).map((event, index) => (
            <TouchableOpacity 
              key={event.id} 
              style={[
                styles.eventCardTop,
                index === 0 && { borderLeftColor: ministry.color, borderLeftWidth: 3 }
              ]} 
              activeOpacity={0.7}
            >
              <View style={[styles.eventDateBadgeTop, { backgroundColor: ministry.color + '12' }]}>
                <Text style={[styles.eventDateDayTop, { color: ministry.color }]}>
                  {new Date(event.date).getDate()}
                </Text>
                <Text style={[styles.eventDateMonthTop, { color: ministry.color }]}>
                  {new Date(event.date).toLocaleString('default', { month: 'short' })}
                </Text>
              </View>
              <View style={styles.eventInfoTop}>
                <Text style={styles.eventTitleTop}>{event.title}</Text>
                <View style={styles.eventMetaRow}>
                  <View style={styles.eventMetaTop}>
                    <Clock size={11} color={Colors.textSecondary} />
                    <Text style={styles.eventMetaTextTop}>{event.time}</Text>
                  </View>
                  <View style={styles.eventMetaTop}>
                    <MapPin size={11} color={Colors.textSecondary} />
                    <Text style={styles.eventMetaTextTop} numberOfLines={1}>{event.location}</Text>
                  </View>
                </View>
                {event.isRecurring && (
                  <View style={styles.recurringBadgeTop}>
                    <Text style={styles.recurringTextTop}>{event.recurrencePattern}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.eventAttendeesTop, { backgroundColor: ministry.color + '10' }]}>
                <Users size={12} color={ministry.color} />
                <Text style={[styles.eventAttendeesTextTop, { color: ministry.color }]}>{event.attendeesCount}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {events.length > 3 && (
            <TouchableOpacity style={styles.viewAllEventsButton} activeOpacity={0.7}>
              <Text style={[styles.viewAllEventsText, { color: ministry.color }]}>
                View all {events.length} events
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  const renderMusicTab = () => (
    <View style={styles.section}>
      <View style={styles.musicTabHeader}>
        <View style={[styles.musicTabIconContainer, { backgroundColor: ministry.color + '15' }]}>
          <Music size={24} color={ministry.color} />
        </View>
        <View style={styles.musicTabHeaderText}>
          <Text style={styles.musicTabTitle}>Worship Music</Text>
          <Text style={styles.musicTabSubtitle}>Practice songs & learn your vocal parts</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.musicPlayerCard, { borderLeftColor: ministry.color }]}
        onPress={() => router.push("/worship" as Href)}
        activeOpacity={0.7}
      >
        <View style={[styles.musicPlayerCardIcon, { backgroundColor: ministry.color }]}>
          <Play size={28} color={Colors.textInverse} fill={Colors.textInverse} />
        </View>
        <View style={styles.musicPlayerCardInfo}>
          <Text style={styles.musicPlayerCardTitle}>Open Music Player</Text>
          <Text style={styles.musicPlayerCardDesc}>Browse and play worship songs</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.musicFeatures}>
        <View style={styles.musicFeatureItem}>
          <View style={[styles.musicFeatureIcon, { backgroundColor: '#EC489915' }]}>
            <Music size={18} color="#EC4899" />
          </View>
          <View style={styles.musicFeatureText}>
            <Text style={styles.musicFeatureTitle}>Vocal Parts</Text>
            <Text style={styles.musicFeatureDesc}>Soprano, Alto, Tenor, Bass</Text>
          </View>
        </View>
        <View style={styles.musicFeatureItem}>
          <View style={[styles.musicFeatureIcon, { backgroundColor: '#3B82F615' }]}>
            <MessageSquare size={18} color="#3B82F6" />
          </View>
          <View style={styles.musicFeatureText}>
            <Text style={styles.musicFeatureTitle}>Lyrics Display</Text>
            <Text style={styles.musicFeatureDesc}>Follow along with synced lyrics</Text>
          </View>
        </View>
        <View style={styles.musicFeatureItem}>
          <View style={[styles.musicFeatureIcon, { backgroundColor: '#10B98115' }]}>
            <Calendar size={18} color="#10B981" />
          </View>
          <View style={styles.musicFeatureText}>
            <Text style={styles.musicFeatureTitle}>Practice Anytime</Text>
            <Text style={styles.musicFeatureDesc}>Access songs on the go</Text>
          </View>
        </View>
      </View>
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
          {!isMember ? (
            <TouchableOpacity
              style={[styles.joinButton, styles.notJoinedButton]}
              onPress={handleJoinLeave}
              disabled={isActionLoading}
              activeOpacity={0.7}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <>
                  <Plus size={18} color={Colors.textInverse} />
                  <Text style={styles.notJoinedButtonText}>Join Group</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.prayersButton, { backgroundColor: ministry.color + '15', borderColor: ministry.color }]}
                onPress={() => setActiveTab('prayers')}
                activeOpacity={0.7}
              >
                <Heart size={18} color={ministry.color} />
                <Text style={[styles.prayersButtonText, { color: ministry.color }]}>Prayers</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chatButton, { backgroundColor: ministry.color }]}
                onPress={() => setShowPollsListModal(true)}
                activeOpacity={0.7}
              >
                <BarChart3 size={18} color={Colors.textInverse} />
                <Text style={styles.chatButtonText}>Group Poll</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {activeTab === 'about' && renderEventsSection()}

        {activeTab === 'about' && renderAboutTab()}
        {activeTab === 'members' && renderMembersTab()}
        {activeTab === 'discussions' && renderDiscussionsTab()}
        {activeTab === 'prayers' && renderPrayersTab()}
        {activeTab === 'music' && renderMusicTab()}

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

      <Modal
        visible={showPollsListModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPollsListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group Polls</Text>
              <TouchableOpacity onPress={() => setShowPollsListModal(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.createPollButton, { backgroundColor: ministry.color }]}
                onPress={() => {
                  setShowPollsListModal(false);
                  setShowPollModal(true);
                }}
              >
                <Plus size={20} color={Colors.textInverse} />
                <Text style={styles.createPollButtonText}>Create New Poll</Text>
              </TouchableOpacity>

              {pollsQuery.isLoading ? (
                <View style={styles.pollLoadingContainer}>
                  <ActivityIndicator size="large" color={ministry.color} />
                </View>
              ) : polls.length === 0 ? (
                <View style={styles.noPollsContainer}>
                  <BarChart3 size={48} color={Colors.textTertiary} />
                  <Text style={styles.noPollsText}>No polls yet</Text>
                  <Text style={styles.noPollsSubtext}>Create a poll to gather feedback from the group</Text>
                </View>
              ) : (
                polls.map((poll: Poll) => {
                  const hasVoted = poll.options.some((opt: PollOption) => opt.voterIds.includes(user?.id || ""));
                  const isCreator = poll.createdBy === user?.id;
                  return (
                    <View key={poll.id} style={[styles.pollCard, !poll.isActive && styles.pollCardClosed]}>
                      <View style={styles.pollHeader}>
                        <View style={styles.pollCreatorInfo}>
                          <View style={[styles.pollCreatorAvatar, { backgroundColor: ministry.color + '20' }]}>
                            <Vote size={16} color={ministry.color} />
                          </View>
                          <View>
                            <Text style={styles.pollCreatorName}>{poll.createdByName}</Text>
                            <Text style={styles.pollDate}>
                              {new Date(poll.createdAt).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                        {!poll.isActive && (
                          <View style={styles.closedBadge}>
                            <Text style={styles.closedBadgeText}>Closed</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.pollQuestion}>{poll.question}</Text>
                      
                      {poll.allowMultiple && (
                        <Text style={styles.multipleHint}>Select multiple options</Text>
                      )}

                      <View style={styles.pollOptionsContainer}>
                        {poll.options.map((option: PollOption) => {
                          const percentage = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
                          const isSelected = selectedOptions.has(option.id);
                          const userVotedThis = option.voterIds.includes(user?.id || "");
                          
                          return (
                            <TouchableOpacity
                              key={option.id}
                              style={[
                                styles.pollOption,
                                isSelected && { borderColor: ministry.color, borderWidth: 2 },
                                userVotedThis && { borderColor: ministry.color, borderWidth: 2 },
                              ]}
                              onPress={() => handleToggleOption(poll, option.id)}
                              disabled={hasVoted || !poll.isActive}
                              activeOpacity={0.7}
                            >
                              <View style={styles.pollOptionContent}>
                                <View style={styles.pollOptionLeft}>
                                  {!hasVoted && poll.isActive ? (
                                    <View style={[
                                      styles.pollCheckbox,
                                      isSelected && { backgroundColor: ministry.color, borderColor: ministry.color }
                                    ]}>
                                      {isSelected && <Check size={12} color={Colors.textInverse} />}
                                    </View>
                                  ) : userVotedThis ? (
                                    <View style={[styles.pollCheckbox, { backgroundColor: ministry.color, borderColor: ministry.color }]}>
                                      <Check size={12} color={Colors.textInverse} />
                                    </View>
                                  ) : null}
                                  <Text style={styles.pollOptionText}>{option.text}</Text>
                                </View>
                                {(hasVoted || !poll.isActive) && (
                                  <Text style={[styles.pollOptionPercent, { color: ministry.color }]}>
                                    {percentage}%
                                  </Text>
                                )}
                              </View>
                              {(hasVoted || !poll.isActive) && (
                                <View style={styles.pollProgressBarBg}>
                                  <View 
                                    style={[
                                      styles.pollProgressBar, 
                                      { width: `${percentage}%`, backgroundColor: ministry.color + '40' }
                                    ]} 
                                  />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={styles.pollFooter}>
                        <Text style={styles.pollVoteCount}>
                          {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}
                        </Text>
                        
                        {!hasVoted && poll.isActive && (
                          <TouchableOpacity
                            style={[styles.voteButton, { backgroundColor: ministry.color }]}
                            onPress={() => handleVote(poll)}
                            disabled={selectedOptions.size === 0 || votePollMutation.isPending}
                          >
                            {votePollMutation.isPending ? (
                              <ActivityIndicator size="small" color={Colors.textInverse} />
                            ) : (
                              <Text style={styles.voteButtonText}>Vote</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>

                      {isCreator && (
                        <View style={styles.pollActions}>
                          {poll.isActive && (
                            <TouchableOpacity
                              style={styles.pollActionButton}
                              onPress={() => handleClosePoll(poll.id)}
                            >
                              <XCircle size={16} color={Colors.warning} />
                              <Text style={[styles.pollActionText, { color: Colors.warning }]}>Close</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.pollActionButton}
                            onPress={() => handleDeletePoll(poll.id)}
                          >
                            <Trash2 size={16} color={Colors.error} />
                            <Text style={[styles.pollActionText, { color: Colors.error }]}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPollModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPollModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Poll</Text>
              <TouchableOpacity onPress={() => setShowPollModal(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Question</Text>
              <TextInput
                style={styles.input}
                placeholder="What would you like to ask?"
                placeholderTextColor={Colors.textTertiary}
                value={newPollQuestion}
                onChangeText={setNewPollQuestion}
              />

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Options</Text>
              {pollOptions.map((option, index) => (
                <View key={index} style={styles.pollOptionInputRow}>
                  <TextInput
                    style={[styles.input, styles.pollOptionInput]}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={Colors.textTertiary}
                    value={option}
                    onChangeText={(value) => handleOptionChange(index, value)}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity
                      style={styles.removeOptionButton}
                      onPress={() => handleRemoveOption(index)}
                    >
                      <X size={20} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {pollOptions.length < 10 && (
                <TouchableOpacity
                  style={styles.addOptionButton}
                  onPress={handleAddOption}
                >
                  <Plus size={18} color={ministry.color} />
                  <Text style={[styles.addOptionText, { color: ministry.color }]}>Add Option</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.anonymousToggle}
                onPress={() => setAllowMultiple(!allowMultiple)}
              >
                <View style={[styles.checkbox, allowMultiple && { backgroundColor: ministry.color, borderColor: ministry.color }]}>
                  {allowMultiple && <Check size={14} color={Colors.textInverse} />}
                </View>
                <Text style={styles.anonymousText}>Allow multiple selections</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: ministry.color }]}
              onPress={handleCreatePoll}
              disabled={createPollMutation.isPending}
            >
              {createPollMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <>
                  <BarChart3 size={18} color={Colors.textInverse} />
                  <Text style={styles.submitButtonText}>Create Poll</Text>
                </>
              )}
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
  prayersButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  prayersButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
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
  eventsTopSection: {
    marginBottom: 24,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  eventsTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  eventsTopIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  eventsTopTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  eventsCountBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventsCountText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  eventsEmptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  eventsEmptyText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  eventsEmptySubtext: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  eventsListContainer: {
    gap: 10,
  },
  eventCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    padding: 12,
  },
  eventDateBadgeTop: {
    width: 46,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventDateDayTop: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  eventDateMonthTop: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
  },
  eventInfoTop: {
    flex: 1,
  },
  eventTitleTop: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  eventMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  eventMetaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  eventMetaTextTop: {
    fontSize: 11,
    color: Colors.textSecondary,
    maxWidth: 100,
  },
  recurringBadgeTop: {
    backgroundColor: Colors.infoLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  recurringTextTop: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.info,
  },
  eventAttendeesTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 8,
  },
  eventAttendeesTextTop: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  viewAllEventsButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  viewAllEventsText: {
    fontSize: 14,
    fontWeight: '600' as const,
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
  musicTabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  musicTabIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  musicTabHeaderText: {
    flex: 1,
  },
  musicTabTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  musicTabSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  musicPlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  musicPlayerCardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  musicPlayerCardInfo: {
    flex: 1,
  },
  musicPlayerCardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  musicPlayerCardDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  musicFeatures: {
    gap: 12,
  },
  musicFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
  },
  musicFeatureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  musicFeatureText: {
    flex: 1,
  },
  musicFeatureTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  musicFeatureDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
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
  createPollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  createPollButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  pollLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noPollsContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 8,
  },
  noPollsText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  noPollsSubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center' as const,
  },
  pollCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  pollCardClosed: {
    opacity: 0.7,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pollCreatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pollCreatorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollCreatorName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  pollDate: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  closedBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closedBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  pollQuestion: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 24,
  },
  multipleHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 12,
  },
  pollOptionsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  pollOption: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  pollOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pollOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pollCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollOptionText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  pollOptionPercent: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  pollProgressBarBg: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    marginTop: 10,
  },
  pollProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  pollFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pollVoteCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  voteButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  pollActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  pollActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pollActionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  pollOptionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pollOptionInput: {
    flex: 1,
  },
  removeOptionButton: {
    padding: 8,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  addOptionText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
