import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  Megaphone,
  Pin,
  ChevronLeft,
  Plus,
  X,
  Filter,
  Search,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/providers/AuthProvider';
import { Announcement } from '@/types';

type FilterType = 'all' | 'pinned' | 'high' | 'normal' | 'low';

export default function AnnouncementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, currentOrganization } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'normal' | 'low'>('normal');

  const announcementsQuery = trpc.announcements.list.useQuery(
    { organizationId: currentOrganization?.id },
    { enabled: !!currentOrganization?.id }
  );

  const createMutation = trpc.announcements.create.useMutation({
    onSuccess: () => {
      announcementsQuery.refetch();
      setShowCreateModal(false);
      resetCreateForm();
      Alert.alert('Success', 'Announcement created successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const resetCreateForm = () => {
    setNewTitle('');
    setNewContent('');
    setNewPriority('normal');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await announcementsQuery.refetch();
    setRefreshing(false);
  }, [announcementsQuery]);

  const filteredAnnouncements = React.useMemo(() => {
    let result = announcementsQuery.data || [];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.content.toLowerCase().includes(query) ||
          a.author.toLowerCase().includes(query)
      );
    }

    switch (filterType) {
      case 'pinned':
        result = result.filter((a) => a.isPinned);
        break;
      case 'high':
        result = result.filter((a) => a.priority === 'high');
        break;
      case 'normal':
        result = result.filter((a) => a.priority === 'normal');
        break;
      case 'low':
        result = result.filter((a) => a.priority === 'low');
        break;
    }

    return result;
  }, [announcementsQuery.data, searchQuery, filterType]);

  const handleCreateAnnouncement = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    createMutation.mutate({
      title: newTitle.trim(),
      content: newContent.trim(),
      priority: newPriority,
      organizationId: currentOrganization?.id,
    });
  };

  const canCreateAnnouncement = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'leader';

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return Colors.error;
      case 'low':
        return Colors.textTertiary;
      default:
        return Colors.primary;
    }
  };

  const renderAnnouncementCard = (announcement: Announcement) => (
    <TouchableOpacity
      key={announcement.id}
      style={[styles.card, announcement.isPinned && styles.pinnedCard]}
      onPress={() => setSelectedAnnouncement(announcement)}
      activeOpacity={0.7}
    >
      {announcement.isPinned && (
        <View style={styles.pinnedBadge}>
          <Pin size={12} color={Colors.primary} />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <Image
          source={{ uri: announcement.authorAvatar }}
          style={styles.avatar}
          contentFit="cover"
        />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{announcement.author}</Text>
          <Text style={styles.authorRole}>{announcement.authorRole}</Text>
        </View>
        <View style={styles.metaContainer}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(announcement.priority) + '20' }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(announcement.priority) }]}>
              {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
            </Text>
          </View>
          <Text style={styles.date}>{formatDate(announcement.date)}</Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>{announcement.title}</Text>
      <Text style={styles.cardContent} numberOfLines={3}>
        {announcement.content}
      </Text>

      {announcement.ministryName && (
        <View style={styles.ministryTag}>
          <Text style={styles.ministryTagText}>{announcement.ministryName}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const filterOptions: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All Announcements' },
    { key: 'pinned', label: 'Pinned Only' },
    { key: 'high', label: 'High Priority' },
    { key: 'normal', label: 'Normal Priority' },
    { key: 'low', label: 'Low Priority' },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Announcements',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () =>
            canCreateAnnouncement ? (
              <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.headerButton}>
                <Plus size={24} color={Colors.primary} />
              </TouchableOpacity>
            ) : null,
          headerStyle: { backgroundColor: Colors.background },
          headerTitleStyle: { color: Colors.text, fontWeight: '700' },
          headerShadowVisible: false,
        }}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search announcements..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, filterType !== 'all' && styles.filterButtonActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={20} color={filterType !== 'all' ? Colors.primary : Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {announcementsQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading announcements...</Text>
        </View>
      ) : filteredAnnouncements.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Megaphone size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No Announcements</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery || filterType !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Stay tuned for updates from your organization'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredAnnouncements.map(renderAnnouncementCard)}
        </ScrollView>
      )}

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade" onRequestClose={() => setShowFilterModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilterModal(false)}>
          <View style={styles.filterModalContent}>
            <Text style={styles.filterModalTitle}>Filter By</Text>
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.filterOption, filterType === option.key && styles.filterOptionActive]}
                onPress={() => {
                  setFilterType(option.key);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, filterType === option.key && styles.filterOptionTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={!!selectedAnnouncement}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAnnouncement(null)}
      >
        <View style={styles.detailModalContainer}>
          <View style={[styles.detailModalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Announcement</Text>
              <TouchableOpacity onPress={() => setSelectedAnnouncement(null)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selectedAnnouncement && (
              <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                {selectedAnnouncement.isPinned && (
                  <View style={styles.pinnedBadge}>
                    <Pin size={14} color={Colors.primary} />
                    <Text style={styles.pinnedText}>Pinned</Text>
                  </View>
                )}

                <View style={styles.detailAuthorRow}>
                  <Image
                    source={{ uri: selectedAnnouncement.authorAvatar }}
                    style={styles.detailAvatar}
                    contentFit="cover"
                  />
                  <View style={styles.detailAuthorInfo}>
                    <Text style={styles.detailAuthorName}>{selectedAnnouncement.author}</Text>
                    <Text style={styles.detailAuthorRole}>{selectedAnnouncement.authorRole}</Text>
                  </View>
                  <Text style={styles.detailDate}>{formatDate(selectedAnnouncement.date)}</Text>
                </View>

                <Text style={styles.detailAnnouncementTitle}>{selectedAnnouncement.title}</Text>
                <Text style={styles.detailContent}>{selectedAnnouncement.content}</Text>

                {selectedAnnouncement.ministryName && (
                  <View style={styles.ministryTag}>
                    <Text style={styles.ministryTagText}>{selectedAnnouncement.ministryName}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.createModalContainer}>
          <View style={[styles.createModalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.createHeader}>
              <Text style={styles.createTitle}>New Announcement</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.createScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter announcement title"
                placeholderTextColor={Colors.textTertiary}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.inputLabel}>Content *</Text>
              <TextInput
                style={[styles.input, styles.contentInput]}
                placeholder="Enter announcement content"
                placeholderTextColor={Colors.textTertiary}
                value={newContent}
                onChangeText={setNewContent}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.priorityOptions}>
                {(['low', 'normal', 'high'] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      newPriority === priority && styles.priorityOptionActive,
                      { borderColor: getPriorityColor(priority) },
                    ]}
                    onPress={() => setNewPriority(priority)}
                  >
                    <Text
                      style={[
                        styles.priorityOptionText,
                        newPriority === priority && { color: getPriorityColor(priority) },
                      ]}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.createButton, createMutation.isPending && styles.createButtonDisabled]}
                onPress={handleCreateAnnouncement}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color={Colors.textInverse} />
                ) : (
                  <Text style={styles.createButtonText}>Create Announcement</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButton: {
    padding: 4,
  },
  headerButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: Colors.text,
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '15',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  pinnedCard: {
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: '#FFF5F5',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  authorRole: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  metaContainer: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
  },
  date: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  cardContent: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  ministryTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 12,
  },
  ministryTagText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  filterOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  filterOptionActive: {
    backgroundColor: Colors.primaryLight + '20',
  },
  filterOptionText: {
    fontSize: 15,
    color: Colors.text,
  },
  filterOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  detailModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailModalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  detailScroll: {
    flex: 1,
  },
  detailAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  detailAuthorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  detailAuthorName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  detailAuthorRole: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailDate: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  detailAnnouncementTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
    lineHeight: 28,
  },
  detailContent: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  createModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  createModalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
  },
  createHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  createTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  createScroll: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  contentInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  priorityOptionActive: {
    backgroundColor: Colors.surfaceSecondary,
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
