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
  Globe,
  Users,
  ChevronDown,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LightTheme } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { useData } from '@/providers/DataProvider';
import { Announcement, Ministry } from '@/types';

type FilterType = 'all' | 'pinned' | 'high' | 'normal' | 'low';
type AnnouncementType = 'all' | 'general' | 'ministry';

export default function AnnouncementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, currentOrganization } = useAuth();
  const { ministries } = useData();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showMinistryPicker, setShowMinistryPicker] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);
  const [isGeneralAnnouncement, setIsGeneralAnnouncement] = useState(true);

  const queryClient = useQueryClient();

  const announcementsQuery = useQuery({
    queryKey: ['announcements', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data, error } = await supabase
        .from('announcements')
        .select('*, ministries(name)')
        .eq('church_id', currentOrganization.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((a: { id: string; church_id: string; title: string; content: string; created_by_profile_id: string | null; created_at: string; ministry_id: string | null; priority: string; is_pinned: boolean; ministries: { name: string } | null }) => ({
        id: a.id,
        organizationId: a.church_id,
        title: a.title,
        content: a.content,
        author: '',
        authorRole: '',
        authorAvatar: '',
        date: a.created_at,
        ministryId: a.ministry_id || undefined,
        ministryName: a.ministries?.name || undefined,
        priority: a.priority as 'high' | 'normal' | 'low',
        isPinned: a.is_pinned,
      })) as Announcement[];
    },
    enabled: !!currentOrganization?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { organizationId: string; title: string; content: string; priority: string; ministryId?: string }) => {
      if (!user) throw new Error('Not logged in');
      const { error } = await supabase.from('announcements').insert({
        church_id: data.organizationId,
        title: data.title,
        content: data.content,
        priority: data.priority as 'low' | 'normal' | 'high',
        ministry_id: data.ministryId || null,
        created_by_profile_id: user.id,
        status: 'published' as const,
        is_pinned: false,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowCreateModal(false);
      resetCreateForm();
      Alert.alert('Success', 'Announcement created successfully');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const resetCreateForm = () => {
    setNewTitle('');
    setNewContent('');
    setNewPriority('normal');
    setSelectedMinistry(null);
    setIsGeneralAnnouncement(true);
  };

  const { refetch: refetchAnnouncements } = announcementsQuery;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAnnouncements();
    setRefreshing(false);
  }, [refetchAnnouncements]);

  const filteredAnnouncements = React.useMemo(() => {
    let result = announcementsQuery.data || [];

    // Filter by announcement type (general vs ministry)
    switch (announcementType) {
      case 'general':
        result = result.filter((a) => !a.ministryId);
        break;
      case 'ministry':
        result = result.filter((a) => !!a.ministryId);
        break;
    }

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
  }, [announcementsQuery.data, searchQuery, filterType, announcementType]);

  const handleCreateAnnouncement = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isGeneralAnnouncement && !selectedMinistry) {
      Alert.alert('Error', 'Please select a ministry for this announcement');
      return;
    }

    if (!currentOrganization?.id) {
      Alert.alert('Error', 'Please select a church first');
      return;
    }

    createMutation.mutate({
      organizationId: currentOrganization.id,
      title: newTitle.trim(),
      content: newContent.trim(),
      priority: newPriority,
      ministryId: isGeneralAnnouncement ? undefined : selectedMinistry?.id,
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
        return LightTheme.error;
      case 'low':
        return LightTheme.textTertiary;
      default:
        return LightTheme.primary;
    }
  };

  const renderAnnouncementCard = (announcement: Announcement) => (
    <TouchableOpacity
      key={announcement.id}
      style={[styles.card, announcement.isPinned && styles.pinnedCard]}
      onPress={() => setSelectedAnnouncement(announcement)}
      activeOpacity={0.7}
    >
      <View style={styles.cardTopRow}>
        {announcement.isPinned && (
          <View style={styles.pinnedBadge}>
            <Pin size={12} color={LightTheme.primary} />
            <Text style={styles.pinnedText}>Pinned</Text>
          </View>
        )}
        <View style={[styles.typeBadge, announcement.ministryId ? styles.ministryTypeBadge : styles.generalTypeBadge]}>
          {announcement.ministryId ? (
            <Users size={10} color={LightTheme.secondary} />
          ) : (
            <Globe size={10} color={LightTheme.primary} />
          )}
          <Text style={[styles.typeBadgeText, { color: announcement.ministryId ? LightTheme.secondary : LightTheme.primary }]}>
            {announcement.ministryId ? 'Ministry' : 'General'}
          </Text>
        </View>
      </View>

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

      {!!announcement.ministryName && (
        <View style={styles.ministryTag}>
          <Users size={12} color={LightTheme.textSecondary} />
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
              <ChevronLeft size={24} color={LightTheme.text} />
            </TouchableOpacity>
          ),
          headerRight: () =>
            canCreateAnnouncement ? (
              <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.headerButton}>
                <Plus size={24} color={LightTheme.primary} />
              </TouchableOpacity>
            ) : null,
          headerStyle: { backgroundColor: LightTheme.background },
          headerTitleStyle: { color: LightTheme.text, fontWeight: '700' as const },
          headerShadowVisible: false,
        }}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={LightTheme.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search announcements..."
            placeholderTextColor={LightTheme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, filterType !== 'all' && styles.filterButtonActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={20} color={filterType !== 'all' ? LightTheme.primary : LightTheme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.typeFilterContainer}>
        <TouchableOpacity
          style={[styles.typeFilterTab, announcementType === 'all' && styles.typeFilterTabActive]}
          onPress={() => setAnnouncementType('all')}
        >
          <Text style={[styles.typeFilterText, announcementType === 'all' && styles.typeFilterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeFilterTab, announcementType === 'general' && styles.typeFilterTabActive]}
          onPress={() => setAnnouncementType('general')}
        >
          <Globe size={14} color={announcementType === 'general' ? LightTheme.primary : LightTheme.textSecondary} />
          <Text style={[styles.typeFilterText, announcementType === 'general' && styles.typeFilterTextActive]}>
            General
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeFilterTab, announcementType === 'ministry' && styles.typeFilterTabActive]}
          onPress={() => setAnnouncementType('ministry')}
        >
          <Users size={14} color={announcementType === 'ministry' ? LightTheme.primary : LightTheme.textSecondary} />
          <Text style={[styles.typeFilterText, announcementType === 'ministry' && styles.typeFilterTextActive]}>
            Ministry
          </Text>
        </TouchableOpacity>
      </View>

      {announcementsQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={LightTheme.primary} />
          <Text style={styles.loadingText}>Loading announcements...</Text>
        </View>
      ) : filteredAnnouncements.length === 0 ? (
        <View style={styles.emptyContainer}>
          {canCreateAnnouncement && (
            <TouchableOpacity
              style={styles.emptyCreateButton}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.7}
            >
              <Plus size={28} color={LightTheme.textInverse} />
            </TouchableOpacity>
          )}
          <View style={styles.emptyIconContainer}>
            <Megaphone size={48} color={LightTheme.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No Announcements</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery || filterType !== 'all'
              ? 'Try adjusting your search or filters'
              : canCreateAnnouncement
                ? 'Tap the button above to create one'
                : 'Stay tuned for updates from your organization'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={LightTheme.primary} />
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
                <X size={24} color={LightTheme.text} />
              </TouchableOpacity>
            </View>

            {selectedAnnouncement && (
              <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                {selectedAnnouncement.isPinned && (
                  <View style={styles.pinnedBadge}>
                    <Pin size={14} color={LightTheme.primary} />
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
                <X size={24} color={LightTheme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.createScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Announcement Type *</Text>
              <View style={styles.announcementTypeContainer}>
                <TouchableOpacity
                  style={[styles.announcementTypeOption, isGeneralAnnouncement && styles.announcementTypeOptionActive]}
                  onPress={() => {
                    setIsGeneralAnnouncement(true);
                    setSelectedMinistry(null);
                  }}
                >
                  <View style={[styles.announcementTypeIcon, isGeneralAnnouncement && styles.announcementTypeIconActive]}>
                    <Globe size={18} color={isGeneralAnnouncement ? LightTheme.textInverse : LightTheme.primary} />
                  </View>
                  <View style={styles.announcementTypeTextContainer}>
                    <Text style={[styles.announcementTypeTitle, isGeneralAnnouncement && styles.announcementTypeTitleActive]}>
                      General
                    </Text>
                    <Text style={styles.announcementTypeDesc}>Visible to everyone on main page</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.announcementTypeOption, !isGeneralAnnouncement && styles.announcementTypeOptionActive]}
                  onPress={() => setIsGeneralAnnouncement(false)}
                >
                  <View style={[styles.announcementTypeIcon, !isGeneralAnnouncement && styles.announcementTypeIconActiveSecondary]}>
                    <Users size={18} color={!isGeneralAnnouncement ? LightTheme.textInverse : LightTheme.secondary} />
                  </View>
                  <View style={styles.announcementTypeTextContainer}>
                    <Text style={[styles.announcementTypeTitle, !isGeneralAnnouncement && styles.announcementTypeTitleActiveSecondary]}>
                      Ministry
                    </Text>
                    <Text style={styles.announcementTypeDesc}>Specific to a ministry group</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {!isGeneralAnnouncement && (
                <>
                  <Text style={styles.inputLabel}>Select Ministry *</Text>
                  <TouchableOpacity
                    style={styles.ministrySelector}
                    onPress={() => setShowMinistryPicker(true)}
                  >
                    <View style={styles.ministrySelectorContent}>
                      {selectedMinistry ? (
                        <>
                          <View style={[styles.ministryColorDot, { backgroundColor: selectedMinistry.color }]} />
                          <Text style={styles.ministrySelectorText}>{selectedMinistry.name}</Text>
                        </>
                      ) : (
                        <Text style={styles.ministrySelectorPlaceholder}>Choose a ministry</Text>
                      )}
                    </View>
                    <ChevronDown size={20} color={LightTheme.textSecondary} />
                  </TouchableOpacity>
                </>
              )}

              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter announcement title"
                placeholderTextColor={LightTheme.textTertiary}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.inputLabel}>Content *</Text>
              <TextInput
                style={[styles.input, styles.contentInput]}
                placeholder="Enter announcement content"
                placeholderTextColor={LightTheme.textTertiary}
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
                  <ActivityIndicator color={LightTheme.textInverse} />
                ) : (
                  <Text style={styles.createButtonText}>Create Announcement</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    {/* Ministry Picker Modal */}
      <Modal
        visible={showMinistryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMinistryPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMinistryPicker(false)}>
          <View style={styles.ministryPickerContent}>
            <Text style={styles.ministryPickerTitle}>Select Ministry</Text>
            <ScrollView style={styles.ministryPickerScroll} showsVerticalScrollIndicator={false}>
              {ministries.map((ministry) => (
                <TouchableOpacity
                  key={ministry.id}
                  style={[
                    styles.ministryPickerOption,
                    selectedMinistry?.id === ministry.id && styles.ministryPickerOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedMinistry(ministry);
                    setShowMinistryPicker(false);
                  }}
                >
                  <View style={[styles.ministryColorDot, { backgroundColor: ministry.color }]} />
                  <Text
                    style={[
                      styles.ministryPickerOptionText,
                      selectedMinistry?.id === ministry.id && styles.ministryPickerOptionTextActive,
                    ]}
                  >
                    {ministry.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {ministries.length === 0 && (
                <View style={styles.emptyMinistryContainer}>
                  <Text style={styles.emptyMinistryText}>No ministries available</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightTheme.background,
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
    backgroundColor: LightTheme.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: LightTheme.borderLight,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: LightTheme.text,
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: LightTheme.surface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: LightTheme.borderLight,
  },
  filterButtonActive: {
    borderColor: LightTheme.primary,
    backgroundColor: LightTheme.primaryLight + '15',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: LightTheme.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyCreateButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: LightTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: LightTheme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: `0 4px 8px ${LightTheme.primary}4D`,
      },
    }),
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: LightTheme.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: LightTheme.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: LightTheme.textSecondary,
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
    backgroundColor: LightTheme.surface,
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
    borderColor: LightTheme.primaryLight,
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
    color: LightTheme.primary,
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
    color: LightTheme.text,
  },
  authorRole: {
    fontSize: 12,
    color: LightTheme.textSecondary,
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
    color: LightTheme.textTertiary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: LightTheme.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  cardContent: {
    fontSize: 14,
    color: LightTheme.textSecondary,
    lineHeight: 20,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  generalTypeBadge: {
    backgroundColor: LightTheme.primaryLight + '20',
  },
  ministryTypeBadge: {
    backgroundColor: LightTheme.secondary + '20',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
  },
  typeFilterContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: LightTheme.surfaceSecondary,
    borderRadius: 12,
    padding: 4,
  },
  typeFilterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  typeFilterTabActive: {
    backgroundColor: LightTheme.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  typeFilterText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: LightTheme.textSecondary,
  },
  typeFilterTextActive: {
    color: LightTheme.primary,
    fontWeight: '600' as const,
  },
  ministryTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: LightTheme.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 12,
  },
  ministryTagText: {
    fontSize: 12,
    color: LightTheme.textSecondary,
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
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: LightTheme.text,
    marginBottom: 16,
  },
  filterOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  filterOptionActive: {
    backgroundColor: LightTheme.primaryLight + '20',
  },
  filterOptionText: {
    fontSize: 15,
    color: LightTheme.text,
  },
  filterOptionTextActive: {
    color: LightTheme.primary,
    fontWeight: '600' as const,
  },
  detailModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailModalContent: {
    backgroundColor: LightTheme.surface,
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
    borderBottomColor: LightTheme.borderLight,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: LightTheme.text,
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
    color: LightTheme.text,
  },
  detailAuthorRole: {
    fontSize: 13,
    color: LightTheme.textSecondary,
    marginTop: 2,
  },
  detailDate: {
    fontSize: 13,
    color: LightTheme.textTertiary,
  },
  detailAnnouncementTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: LightTheme.text,
    marginBottom: 16,
    lineHeight: 28,
  },
  detailContent: {
    fontSize: 15,
    color: LightTheme.textSecondary,
    lineHeight: 24,
  },
  createModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  createModalContent: {
    backgroundColor: LightTheme.surface,
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
    borderBottomColor: LightTheme.borderLight,
  },
  createTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: LightTheme.text,
  },
  createScroll: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: LightTheme.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: LightTheme.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: LightTheme.text,
    borderWidth: 1,
    borderColor: LightTheme.borderLight,
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
    backgroundColor: LightTheme.surface,
  },
  priorityOptionActive: {
    backgroundColor: LightTheme.surfaceSecondary,
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: LightTheme.textSecondary,
  },
  createButton: {
    backgroundColor: LightTheme.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: LightTheme.textInverse,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  announcementTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  announcementTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: LightTheme.borderLight,
    backgroundColor: LightTheme.surface,
  },
  announcementTypeOptionActive: {
    borderColor: LightTheme.primary,
    backgroundColor: LightTheme.primaryLight + '10',
  },
  announcementTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LightTheme.primaryLight + '30',
  },
  announcementTypeIconActive: {
    backgroundColor: LightTheme.primary,
  },
  announcementTypeIconActiveSecondary: {
    backgroundColor: LightTheme.secondary,
  },
  announcementTypeTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  announcementTypeTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: LightTheme.text,
  },
  announcementTypeTitleActive: {
    color: LightTheme.primary,
  },
  announcementTypeTitleActiveSecondary: {
    color: LightTheme.secondary,
  },
  announcementTypeDesc: {
    fontSize: 11,
    color: LightTheme.textTertiary,
    marginTop: 2,
  },
  ministrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: LightTheme.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: LightTheme.borderLight,
  },
  ministrySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ministrySelectorText: {
    fontSize: 15,
    color: LightTheme.text,
    fontWeight: '500' as const,
  },
  ministrySelectorPlaceholder: {
    fontSize: 15,
    color: LightTheme.textTertiary,
  },
  ministryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  ministryPickerContent: {
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    maxHeight: 400,
  },
  ministryPickerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: LightTheme.text,
    marginBottom: 16,
  },
  ministryPickerScroll: {
    maxHeight: 300,
  },
  ministryPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  ministryPickerOptionActive: {
    backgroundColor: LightTheme.primaryLight + '20',
  },
  ministryPickerOptionText: {
    fontSize: 15,
    color: LightTheme.text,
  },
  ministryPickerOptionTextActive: {
    color: LightTheme.primary,
    fontWeight: '600' as const,
  },
  emptyMinistryContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyMinistryText: {
    fontSize: 14,
    color: LightTheme.textTertiary,
  },
});
