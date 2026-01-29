import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Search,
  Plus,
  X,
  Users,
  Crown,
  Shield,
  UserMinus,
  RefreshCw,
  Check,
  Clock,
  AlertTriangle,
  Send,
  Calendar,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { ministryTemplates } from "@/mocks/ministryTemplates";
import { MinistryLeaderRole, LeadershipTransferType } from "@/types";

interface Leader {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string;
  role: MinistryLeaderRole;
  status: "active" | "pending";
  joinedAt: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  name?: string;
  role: MinistryLeaderRole;
  status: "pending" | "expired";
  sentAt: string;
  expiresAt: string;
}

interface MemberSearchResult {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

const mockLeaders: Leader[] = [
  {
    id: "l1",
    userId: "u1",
    name: "James Wilson",
    email: "james@church.org",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    role: "primary_leader",
    status: "active",
    joinedAt: "2024-01-15",
  },
  {
    id: "l2",
    userId: "u2",
    name: "Emily Brown",
    email: "emily@church.org",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    role: "co_leader",
    status: "active",
    joinedAt: "2024-03-20",
  },
];

const mockPendingInvitations: PendingInvitation[] = [
  {
    id: "inv1",
    email: "sarah@church.org",
    name: "Sarah Johnson",
    role: "co_leader",
    status: "pending",
    sentAt: "2026-01-25",
    expiresAt: "2026-02-01",
  },
];

const mockMembers: MemberSearchResult[] = [
  { id: "m1", name: "Michael Chen", email: "michael@church.org", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face" },
  { id: "m2", name: "Sarah Davis", email: "sarah.d@church.org", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face" },
  { id: "m3", name: "David Martinez", email: "david@church.org", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" },
  { id: "m4", name: "Lisa Thompson", email: "lisa@church.org", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face" },
];

interface LeaderCardProps {
  leader: Leader;
  onRemove: () => void;
  onTransfer: () => void;
  isPrimary: boolean;
  color: string;
}

function LeaderCard({ leader, onRemove, onTransfer, isPrimary, color }: LeaderCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[styles.leaderCard, { transform: [{ scale: scaleAnim }] }]}>
      <Image source={{ uri: leader.avatar }} style={styles.leaderAvatar} />
      <View style={styles.leaderInfo}>
        <View style={styles.leaderNameRow}>
          <Text style={styles.leaderName}>{leader.name}</Text>
          {isPrimary && (
            <View style={[styles.primaryBadge, { backgroundColor: color + "20" }]}>
              <Crown size={12} color={color} />
              <Text style={[styles.primaryBadgeText, { color }]}>Primary</Text>
            </View>
          )}
        </View>
        <Text style={styles.leaderEmail}>{leader.email}</Text>
        <Text style={styles.leaderJoined}>Joined {new Date(leader.joinedAt).toLocaleDateString()}</Text>
      </View>
      <View style={styles.leaderActions}>
        {isPrimary ? (
          <TouchableOpacity style={[styles.actionBtn, styles.transferBtn]} onPress={onTransfer} activeOpacity={0.7}>
            <RefreshCw size={16} color={Colors.warning} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.actionBtn, styles.removeBtn]} onPress={onRemove} activeOpacity={0.7}>
            <UserMinus size={16} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

interface InvitationCardProps {
  invitation: PendingInvitation;
  onResend: () => void;
  onCancel: () => void;
}

function InvitationCard({ invitation, onResend, onCancel }: InvitationCardProps) {
  const isExpired = new Date(invitation.expiresAt) < new Date();
  const daysLeft = Math.ceil((new Date(invitation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <View style={[styles.invitationCard, isExpired && styles.invitationExpired]}>
      <View style={styles.invitationIcon}>
        {isExpired ? (
          <AlertTriangle size={20} color={Colors.error} />
        ) : (
          <Clock size={20} color={Colors.warning} />
        )}
      </View>
      <View style={styles.invitationInfo}>
        <Text style={styles.invitationName}>{invitation.name || invitation.email}</Text>
        <Text style={styles.invitationEmail}>{invitation.email}</Text>
        <Text style={[styles.invitationStatus, isExpired ? styles.expiredText : styles.pendingText]}>
          {isExpired ? "Expired" : `Expires in ${daysLeft} days`}
        </Text>
      </View>
      <View style={styles.invitationActions}>
        <TouchableOpacity style={styles.resendBtn} onPress={onResend} activeOpacity={0.7}>
          <Send size={14} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelInviteBtn} onPress={onCancel} activeOpacity={0.7}>
          <X size={14} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MinistryLeadersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();

  const [leaders, setLeaders] = useState<Leader[]>(mockLeaders);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>(mockPendingInvitations);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [selectedRole, setSelectedRole] = useState<MinistryLeaderRole>("co_leader");
  const [inviteMessage, setInviteMessage] = useState("");
  const [transferType, setTransferType] = useState<LeadershipTransferType>("complete_handoff");
  const [transferDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const template = ministryTemplates.find((t) => t.id === id);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length > 1) {
      const results = mockMembers.filter(
        (m) =>
          m.name.toLowerCase().includes(query.toLowerCase()) ||
          m.email.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, []);

  const handleInviteLeader = useCallback(async () => {
    if (!selectedMember) {
      if (Platform.OS === "web") {
        alert("Please select a member to invite");
      } else {
        Alert.alert("Error", "Please select a member to invite");
      }
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newInvitation: PendingInvitation = {
        id: `inv-${Date.now()}`,
        email: selectedMember.email,
        name: selectedMember.name,
        role: selectedRole,
        status: "pending",
        sentAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      setPendingInvitations((prev) => [...prev, newInvitation]);
      setShowInviteModal(false);
      setSelectedMember(null);
      setSearchQuery("");
      setInviteMessage("");

      if (Platform.OS === "web") {
        alert(`Invitation sent to ${selectedMember.name}`);
      } else {
        Alert.alert("Success", `Leadership invitation sent to ${selectedMember.name}`);
      }
    } catch (error) {
      console.error("Failed to send invitation:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMember, selectedRole]);

  const handleTransferLeadership = useCallback(async () => {
    if (!selectedMember) {
      if (Platform.OS === "web") {
        alert("Please select a member to transfer leadership to");
      } else {
        Alert.alert("Error", "Please select a member to transfer leadership to");
      }
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setShowTransferModal(false);
      setSelectedMember(null);
      setSearchQuery("");

      if (Platform.OS === "web") {
        alert(`Leadership transfer request sent to ${selectedMember.name}`);
      } else {
        Alert.alert(
          "Transfer Initiated",
          `A leadership transfer request has been sent to ${selectedMember.name}. The transfer will complete once they accept.`
        );
      }
    } catch (error) {
      console.error("Failed to transfer leadership:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMember]);

  const handleRemoveLeader = useCallback((leader: Leader) => {
    const confirmRemove = () => {
      setLeaders((prev) => prev.filter((l) => l.id !== leader.id));
    };

    if (Platform.OS === "web") {
      if (confirm(`Remove ${leader.name} as a leader?`)) {
        confirmRemove();
      }
    } else {
      Alert.alert(
        "Remove Leader",
        `Are you sure you want to remove ${leader.name} as a leader of this ministry?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: confirmRemove },
        ]
      );
    }
  }, []);

  const handleResendInvitation = useCallback((invitation: PendingInvitation) => {
    setPendingInvitations((prev) =>
      prev.map((inv) =>
        inv.id === invitation.id
          ? { ...inv, sentAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), status: "pending" as const }
          : inv
      )
    );

    if (Platform.OS === "web") {
      alert("Invitation resent");
    } else {
      Alert.alert("Success", "Invitation has been resent");
    }
  }, []);

  const handleCancelInvitation = useCallback((invitation: PendingInvitation) => {
    setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));
  }, []);

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Access denied</Text>
      </View>
    );
  }

  if (!template) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Ministry not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Leadership</Text>
            <Text style={styles.subtitle}>{template.name}</Text>
          </View>
          <TouchableOpacity
            style={[styles.inviteButton, { backgroundColor: template.color }]}
            onPress={() => setShowInviteModal(true)}
            activeOpacity={0.7}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={18} color={template.color} />
            <Text style={styles.sectionTitle}>Current Leaders</Text>
            <Text style={styles.sectionCount}>{leaders.length}</Text>
          </View>

          {leaders.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No leaders assigned yet</Text>
              <TouchableOpacity
                style={[styles.addFirstButton, { backgroundColor: template.color }]}
                onPress={() => setShowInviteModal(true)}
                activeOpacity={0.7}
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.addFirstText}>Add Leader</Text>
              </TouchableOpacity>
            </View>
          ) : (
            leaders.map((leader) => (
              <LeaderCard
                key={leader.id}
                leader={leader}
                onRemove={() => handleRemoveLeader(leader)}
                onTransfer={() => setShowTransferModal(true)}
                isPrimary={leader.role === "primary_leader"}
                color={template.color}
              />
            ))
          )}
        </View>

        {pendingInvitations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={18} color={Colors.warning} />
              <Text style={styles.sectionTitle}>Pending Invitations</Text>
              <Text style={styles.sectionCount}>{pendingInvitations.length}</Text>
            </View>

            {pendingInvitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitation={invitation}
                onResend={() => handleResendInvitation(invitation)}
                onCancel={() => handleCancelInvitation(invitation)}
              />
            ))}
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Leadership Roles</Text>
          <View style={styles.infoItem}>
            <Crown size={16} color={template.color} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Primary Leader</Text>
              <Text style={styles.infoDescription}>
                Full control over ministry settings, can invite/remove leaders, and transfer leadership.
              </Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Shield size={16} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Co-Leader</Text>
              <Text style={styles.infoDescription}>
                Can edit ministry content, manage events, and invite new co-leaders.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Invite Leader Modal */}
      <Modal visible={showInviteModal} animationType="slide" transparent onRequestClose={() => setShowInviteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Leader</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)} style={styles.modalClose}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Search Member</Text>
                <View style={styles.searchContainer}>
                  <Search size={18} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or email..."
                    placeholderTextColor={Colors.textTertiary}
                    value={searchQuery}
                    onChangeText={handleSearch}
                  />
                </View>

                {searchResults.length > 0 && (
                  <View style={styles.searchResults}>
                    {searchResults.map((member) => (
                      <TouchableOpacity
                        key={member.id}
                        style={[styles.searchResultItem, selectedMember?.id === member.id && styles.searchResultSelected]}
                        onPress={() => {
                          setSelectedMember(member);
                          setSearchResults([]);
                          setSearchQuery(member.name);
                        }}
                        activeOpacity={0.7}
                      >
                        <Image source={{ uri: member.avatar }} style={styles.searchResultAvatar} />
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>{member.name}</Text>
                          <Text style={styles.searchResultEmail}>{member.email}</Text>
                        </View>
                        {selectedMember?.id === member.id && <Check size={18} color={Colors.success} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {selectedMember && (
                  <View style={styles.selectedMember}>
                    <Image source={{ uri: selectedMember.avatar }} style={styles.selectedMemberAvatar} />
                    <View style={styles.selectedMemberInfo}>
                      <Text style={styles.selectedMemberName}>{selectedMember.name}</Text>
                      <Text style={styles.selectedMemberEmail}>{selectedMember.email}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedMember(null)}>
                      <X size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Role</Text>
                <View style={styles.roleOptions}>
                  <TouchableOpacity
                    style={[styles.roleOption, selectedRole === "primary_leader" && styles.roleOptionSelected]}
                    onPress={() => setSelectedRole("primary_leader")}
                    activeOpacity={0.7}
                  >
                    <Crown size={18} color={selectedRole === "primary_leader" ? template.color : Colors.textSecondary} />
                    <Text style={[styles.roleOptionText, selectedRole === "primary_leader" && { color: template.color }]}>
                      Primary Leader
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleOption, selectedRole === "co_leader" && styles.roleOptionSelected]}
                    onPress={() => setSelectedRole("co_leader")}
                    activeOpacity={0.7}
                  >
                    <Shield size={18} color={selectedRole === "co_leader" ? template.color : Colors.textSecondary} />
                    <Text style={[styles.roleOptionText, selectedRole === "co_leader" && { color: template.color }]}>
                      Co-Leader
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Message (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Add a personal message to the invitation..."
                  placeholderTextColor={Colors.textTertiary}
                  value={inviteMessage}
                  onChangeText={setInviteMessage}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: template.color }, (!selectedMember || isLoading) && styles.submitButtonDisabled]}
                onPress={handleInviteLeader}
                disabled={!selectedMember || isLoading}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Send size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>Send Invitation</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Transfer Leadership Modal */}
      <Modal visible={showTransferModal} animationType="slide" transparent onRequestClose={() => setShowTransferModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transfer Leadership</Text>
              <TouchableOpacity onPress={() => setShowTransferModal(false)} style={styles.modalClose}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.warningBox}>
                <AlertTriangle size={20} color={Colors.warning} />
                <Text style={styles.warningText}>
                  This will transfer primary leadership of the ministry. Make sure you have selected the right person.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Transfer To</Text>
                <View style={styles.searchContainer}>
                  <Search size={18} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search member..."
                    placeholderTextColor={Colors.textTertiary}
                    value={searchQuery}
                    onChangeText={handleSearch}
                  />
                </View>

                {searchResults.length > 0 && (
                  <View style={styles.searchResults}>
                    {searchResults.map((member) => (
                      <TouchableOpacity
                        key={member.id}
                        style={[styles.searchResultItem, selectedMember?.id === member.id && styles.searchResultSelected]}
                        onPress={() => {
                          setSelectedMember(member);
                          setSearchResults([]);
                          setSearchQuery(member.name);
                        }}
                        activeOpacity={0.7}
                      >
                        <Image source={{ uri: member.avatar }} style={styles.searchResultAvatar} />
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>{member.name}</Text>
                          <Text style={styles.searchResultEmail}>{member.email}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Transfer Type</Text>
                <TouchableOpacity
                  style={[styles.transferOption, transferType === "complete_handoff" && styles.transferOptionSelected]}
                  onPress={() => setTransferType("complete_handoff")}
                  activeOpacity={0.7}
                >
                  <View style={styles.transferOptionRadio}>
                    {transferType === "complete_handoff" && <View style={[styles.transferOptionRadioInner, { backgroundColor: template.color }]} />}
                  </View>
                  <View style={styles.transferOptionContent}>
                    <Text style={styles.transferOptionTitle}>Complete Handoff</Text>
                    <Text style={styles.transferOptionDesc}>You will be removed as leader immediately</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.transferOption, transferType === "add_co_leader" && styles.transferOptionSelected]}
                  onPress={() => setTransferType("add_co_leader")}
                  activeOpacity={0.7}
                >
                  <View style={styles.transferOptionRadio}>
                    {transferType === "add_co_leader" && <View style={[styles.transferOptionRadioInner, { backgroundColor: template.color }]} />}
                  </View>
                  <View style={styles.transferOptionContent}>
                    <Text style={styles.transferOptionTitle}>Add as Co-Leader</Text>
                    <Text style={styles.transferOptionDesc}>Both of you will remain as leaders</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.transferOption, transferType === "gradual_transition" && styles.transferOptionSelected]}
                  onPress={() => setTransferType("gradual_transition")}
                  activeOpacity={0.7}
                >
                  <View style={styles.transferOptionRadio}>
                    {transferType === "gradual_transition" && <View style={[styles.transferOptionRadioInner, { backgroundColor: template.color }]} />}
                  </View>
                  <View style={styles.transferOptionContent}>
                    <Text style={styles.transferOptionTitle}>Gradual Transition</Text>
                    <Text style={styles.transferOptionDesc}>Schedule the transfer for a future date</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {transferType === "gradual_transition" && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Transfer Date</Text>
                  <TouchableOpacity style={styles.dateInput} activeOpacity={0.7}>
                    <Calendar size={18} color={Colors.textSecondary} />
                    <Text style={styles.dateInputText}>{transferDate || "Select date..."}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: Colors.warning }, (!selectedMember || isLoading) && styles.submitButtonDisabled]}
                onPress={handleTransferLeadership}
                disabled={!selectedMember || isLoading}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <RefreshCw size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>Transfer Leadership</Text>
                  </>
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
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
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
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inviteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: Colors.surface,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 16,
  },
  addFirstButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addFirstText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
  },
  leaderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  leaderAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  leaderName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  primaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  primaryBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  leaderEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  leaderJoined: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  leaderActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  transferBtn: {
    backgroundColor: Colors.warning + "15",
  },
  removeBtn: {
    backgroundColor: Colors.error + "15",
  },
  invitationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  invitationExpired: {
    borderLeftColor: Colors.error,
    opacity: 0.7,
  },
  invitationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.warningLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  invitationEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  invitationStatus: {
    fontSize: 11,
    fontWeight: "500" as const,
  },
  pendingText: {
    color: Colors.warning,
  },
  expiredText: {
    color: Colors.error,
  },
  invitationActions: {
    flexDirection: "row",
    gap: 8,
  },
  resendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelInviteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.error + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  infoSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  infoDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.warningLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: Colors.text,
    marginLeft: 8,
  },
  searchResults: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: "hidden",
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchResultSelected: {
    backgroundColor: Colors.primary + "10",
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  searchResultEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  selectedMember: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.successLight,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  selectedMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  selectedMemberInfo: {
    flex: 1,
  },
  selectedMemberName: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  selectedMemberEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  roleOptions: {
    flexDirection: "row",
    gap: 12,
  },
  roleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  roleOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "08",
  },
  roleOptionText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  transferOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  transferOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "08",
  },
  transferOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  transferOptionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  transferOptionContent: {
    flex: 1,
  },
  transferOptionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  transferOptionDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  dateInputText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#fff",
  },
});
