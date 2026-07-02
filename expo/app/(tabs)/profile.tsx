import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, Modal, Linking, TextInput, Share } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Settings,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  Users,
  Crown,
  X,
  MessageCircle,
  FileText,
  Lock,
  Eye,
  BellRing,
  Building2,
  Cog,
  Church,
  Pencil,
  Trash2,
  AlertTriangle,
  Link,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from '@/constants/colors';
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import React, { useState } from "react";
import { MinistryLegend, MinistryDots } from "@/components/MinistryIndicators";

function formatJoinDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showBorder?: boolean;
  danger?: boolean;
}

function MenuItem({ icon, title, subtitle, onPress, showBorder = true, danger = false }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !showBorder && styles.menuItemNoBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>{icon}</View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, danger && styles.menuTitleDanger]}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <ChevronRight size={18} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const { user, logout, deleteAccount, isAdmin, isSuperAdmin, currentOrganization, hasOrganization, isOrganizationSuperAdmin, changePassword } = useAuth();
  const { ministries, userMinistries } = useData();
  
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');



  const handleLogout = () => {
    if (Platform.OS === "web") {
      void logout();
      router.replace("/login" as any);
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login" as any);
          },
        },
      ]);
    }
  };

  const getRoleBadge = () => {
    if (isSuperAdmin) return { label: "Super Admin", color: Colors.secondary };
    if (isAdmin) return { label: "Admin", color: Colors.primary };
    if (user?.role === "leader") return { label: "Leader", color: Colors.secondary };
    return null;
  };

  const roleBadge = getRoleBadge();

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: themeColors.surface, borderBottomColor: themeColors.borderLight }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: themeColors.text }]}>Profile</Text>
          <TouchableOpacity
            style={[styles.headerEditButton, { backgroundColor: themeColors.primaryLight + '25' }]}
            onPress={() => router.push("/edit-profile" as any)}
            activeOpacity={0.7}
            testID="profile-edit-button"
          >
            <Pencil size={18} color={themeColors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: themeColors.surface }]}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: user.avatar }} style={styles.avatar} contentFit="cover" />
            {userMinistries.length > 0 && (
              <View style={styles.avatarMinistryDots}>
                <MinistryDots ministries={userMinistries} maxDots={4} size="medium" />
              </View>
            )}
          </View>
          <View style={styles.nameRow}>
            <Text style={[styles.userName, { color: themeColors.text }]}>{user.name}</Text>
            {roleBadge && (
              <View style={[styles.roleBadge, { backgroundColor: roleBadge.color + "20" }]}>
                <Crown size={12} color={roleBadge.color} />
                <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.userRole, { color: themeColors.textSecondary }]}>{user.role.replace("_", " ").toUpperCase()}</Text>

          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push("/edit-profile" as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Mail size={18} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{user.email}</Text>
          </View>
          {!!user.phone && (
            <View style={styles.infoItem}>
              <Phone size={18} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{user.phone}</Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <Calendar size={18} color={Colors.textSecondary} />
            <Text style={styles.infoText}>Joined {formatJoinDate(user.joinedDate)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Users size={18} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{userMinistries.length} ministries</Text>
          </View>
        </View>

        {hasOrganization && currentOrganization && (
          <>
            <Text style={styles.sectionTitle}>
              {isSuperAdmin || isOrganizationSuperAdmin ? "Church Management" : "My Church"}
            </Text>
            {isSuperAdmin || isOrganizationSuperAdmin ? (
              <View style={styles.churchManagementCard}>
                <View style={styles.churchHeader}>
                  <View style={styles.organizationIcon}>
                    <Building2 size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.organizationInfo}>
                    <Text style={styles.organizationName}>{currentOrganization.name}</Text>
                    <View style={styles.superAdminBadge}>
                      <Crown size={10} color={Colors.secondary} />
                      <Text style={styles.superAdminBadgeText}>Super Admin</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.managementActions}>
                  <TouchableOpacity 
                    style={styles.managementAction}
                    onPress={() => router.push("/church-management" as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.managementActionIcon, { backgroundColor: Colors.primary + "15" }]}>
                      <Users size={18} color={Colors.primary} />
                    </View>
                    <View style={styles.managementActionContent}>
                      <Text style={styles.managementActionTitle}>Manage Members</Text>
                      <Text style={styles.managementActionSubtitle}>View and manage all members</Text>
                    </View>
                    <ChevronRight size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.managementAction}
                    onPress={() => router.push("/admin/ministries" as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.managementActionIcon, { backgroundColor: "#8B5CF6" + "15" }]}>
                      <Shield size={18} color="#8B5CF6" />
                    </View>
                    <View style={styles.managementActionContent}>
                      <Text style={styles.managementActionTitle}>Manage Ministries</Text>
                      <Text style={styles.managementActionSubtitle}>Create and edit ministries</Text>
                    </View>
                    <ChevronRight size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.managementAction}
                    onPress={() => router.push("/organization/edit" as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.managementActionIcon, { backgroundColor: Colors.warning + "15" }]}>
                      <Cog size={18} color={Colors.warning} />
                    </View>
                    <View style={styles.managementActionContent}>
                      <Text style={styles.managementActionTitle}>Church Settings</Text>
                      <Text style={styles.managementActionSubtitle}>Edit organization settings</Text>
                    </View>
                    <ChevronRight size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>
                  
                  {isSuperAdmin && (
                    <TouchableOpacity 
                      style={[styles.managementAction, styles.managementActionLast]}
                      onPress={() => router.push("/churches" as any)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.managementActionIcon, { backgroundColor: "#0EA5E9" + "15" }]}>
                        <Church size={18} color="#0EA5E9" />
                      </View>
                      <View style={styles.managementActionContent}>
                        <Text style={styles.managementActionTitle}>Manage Churches</Text>
                        <Text style={styles.managementActionSubtitle}>Create and edit churches</Text>
                      </View>
                      <ChevronRight size={16} color={Colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.organizationCard}
                onPress={() => router.push("/organization" as any)}
                activeOpacity={0.7}
              >
                <View style={styles.organizationIcon}>
                  <Building2 size={24} color={Colors.primary} />
                </View>
                <View style={styles.organizationInfo}>
                  <Text style={styles.organizationName}>{currentOrganization.name}</Text>
                  <Text style={styles.organizationSubtitle}>View church info</Text>
                </View>
                <ChevronRight size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.myMinistriesHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>My Ministries</Text>
          {userMinistries.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/groups" as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewAllText, { color: themeColors.primary }]}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.ministriesGrid}>
          {userMinistries.map((ministry) => (
            <TouchableOpacity
              key={ministry.id}
              style={[styles.ministryBadge, { backgroundColor: themeColors.surface, borderLeftColor: ministry.color, borderLeftWidth: 3 }]}
              onPress={() => router.push(`/group/${ministry.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.ministryIconSmall, { backgroundColor: ministry.color + '20' }]}>
                <View style={[styles.ministryDot, { backgroundColor: ministry.color }]} />
              </View>
              <View style={styles.ministryBadgeContent}>
                <Text style={[styles.ministryName, { color: themeColors.text }]}>{ministry.name}</Text>
                <Text style={[styles.ministryMemberCount, { color: themeColors.textSecondary }]}>{ministry.memberCount} members</Text>
              </View>
              <ChevronRight size={16} color={themeColors.textTertiary} />
            </TouchableOpacity>
          ))}
          {userMinistries.length === 0 && (
            <TouchableOpacity
              style={[styles.noMinistriesCard, { backgroundColor: themeColors.surfaceSecondary }]}
              onPress={() => router.push("/(tabs)/groups" as any)}
              activeOpacity={0.7}
            >
              <Users size={24} color={themeColors.textTertiary} />
              <Text style={[styles.noMinistriesTitle, { color: themeColors.textSecondary }]}>Not a member of any ministries yet</Text>
              <Text style={[styles.noMinistriesSubtitle, { color: themeColors.textTertiary }]}>Tap to explore and join ministries</Text>
            </TouchableOpacity>
          )}
        </View>

        {ministries.length > 0 && (
          <MinistryLegend ministries={ministries} />
        )}

        {isAdmin && (
          <>
            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Admin</Text>
            <View style={[styles.menuSection, { backgroundColor: themeColors.surface }]}>
              <MenuItem
                icon={<Shield size={20} color="#7C3AED" />}
                title="Admin Dashboard"
                subtitle="Manage users, content, and settings"
                onPress={() => router.push("/admin" as any)}
                showBorder={false}
              />
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Settings</Text>
        <View style={[styles.menuSection, { backgroundColor: themeColors.surface }]}>
          <MenuItem
            icon={<Settings size={20} color={themeColors.primary} />}
            title="Account Settings"
            subtitle="Manage your account preferences"
            onPress={() => router.push("/edit-profile" as any)}
          />
          <MenuItem
            icon={<Bell size={20} color={themeColors.primary} />}
            title="Notifications"
            subtitle="Configure notification preferences"
            onPress={() => setNotificationsModalVisible(true)}
          />
          <MenuItem
            icon={<Shield size={20} color={themeColors.primary} />}
            title="Privacy & Security"
            subtitle="Manage your privacy settings"
            onPress={() => setPrivacyModalVisible(true)}
          />
          <MenuItem
            icon={<HelpCircle size={20} color={themeColors.primary} />}
            title="Help & Support"
            subtitle="Get help and contact support"
            onPress={() => setHelpModalVisible(true)}
          />
          <MenuItem
            icon={<Link size={20} color={themeColors.primary} />}
            title="Invite to Church"
            subtitle="Share an invite link with others"
            onPress={async () => {
              const orgName = currentOrganization?.name ?? 'our church';
              const inviteLink = currentOrganization?.id
                ? `https://churchconnect.app/join/${currentOrganization.id}`
                : 'https://churchconnect.app';
              try {
                await Share.share({
                  message: `Join me on ChurchConnect — ${orgName}! ${inviteLink}`,
                  title: `Join ${orgName} on ChurchConnect`,
                });
              } catch { /* user cancelled */ }
            }}
            showBorder={false}
          />
        </View>

        <View style={[styles.menuSection, { marginTop: 16, backgroundColor: themeColors.surface }]}>
          <MenuItem
            icon={<LogOut size={20} color={themeColors.error} />}
            title="Sign Out"
            onPress={handleLogout}
            showBorder
            danger
          />
          <MenuItem
            icon={<Trash2 size={20} color={themeColors.error} />}
            title="Delete Account"
            subtitle="Permanently remove your account and data"
            onPress={() => setDeleteAccountModalVisible(true)}
            showBorder={false}
            danger
          />
        </View>

        <Text style={[styles.version, { color: themeColors.textTertiary }]}>Version 1.0.0</Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Notifications Modal */}
      <Modal
        visible={notificationsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification Settings</Text>
              <TouchableOpacity
                onPress={() => setNotificationsModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <BellRing size={20} color={Colors.primary} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Push Notifications</Text>
                  <Text style={styles.settingSubtitle}>Receive alerts on your device</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.toggle, pushNotifications && styles.toggleActive]}
                onPress={() => setPushNotifications(!pushNotifications)}
              >
                <View style={[styles.toggleKnob, pushNotifications && styles.toggleKnobActive]} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Mail size={20} color={Colors.primary} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Email Notifications</Text>
                  <Text style={styles.settingSubtitle}>Receive updates via email</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.toggle, emailNotifications && styles.toggleActive]}
                onPress={() => setEmailNotifications(!emailNotifications)}
              >
                <View style={[styles.toggleKnob, emailNotifications && styles.toggleKnobActive]} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setNotificationsModalVisible(false);
                if (Platform.OS !== "web") {
                  Alert.alert("Saved", "Your notification preferences have been updated.");
                }
              }}
            >
              <Text style={styles.modalButtonText}>Save Preferences</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal
        visible={privacyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacy & Security</Text>
              <TouchableOpacity
                onPress={() => setPrivacyModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.privacyItem}
              onPress={() => {
                setPrivacyModalVisible(false);
                setChangePasswordModalVisible(true);
              }}
            >
              <Lock size={20} color={Colors.primary} />
              <View style={styles.privacyItemText}>
                <Text style={styles.privacyItemTitle}>Change Password</Text>
                <Text style={styles.privacyItemSubtitle}>Update your account password</Text>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.privacyItem}
              onPress={() => {
                if (Platform.OS !== "web") {
                  Alert.alert("Profile Visibility", "Your profile is visible to members of your church organization.");
                } else {
                  alert("Your profile is visible to members of your church organization.");
                }
              }}
            >
              <Eye size={20} color={Colors.primary} />
              <View style={styles.privacyItemText}>
                <Text style={styles.privacyItemTitle}>Profile Visibility</Text>
                <Text style={styles.privacyItemSubtitle}>Control who can see your profile</Text>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.privacyItem}
              onPress={() => {
                void Linking.openURL("https://churchconnect.app/privacy");
              }}
            >
              <FileText size={20} color={Colors.primary} />
              <View style={styles.privacyItemText}>
                <Text style={styles.privacyItemTitle}>Privacy Policy</Text>
                <Text style={styles.privacyItemSubtitle}>Read our privacy policy</Text>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => setPrivacyModalVisible(false)}
            >
              <Text style={styles.modalButtonTextSecondary}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal
        visible={helpModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Help & Support</Text>
              <TouchableOpacity
                onPress={() => setHelpModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.privacyItem}
              onPress={() => {
                if (Platform.OS !== "web") {
                  void Linking.openURL("mailto:support@churchconnect.app");
                }
              }}
            >
              <Mail size={20} color={Colors.primary} />
              <View style={styles.privacyItemText}>
                <Text style={styles.privacyItemTitle}>Email Support</Text>
                <Text style={styles.privacyItemSubtitle}>support@churchconnect.app</Text>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.privacyItem}
              onPress={() => {
                void Linking.openURL("https://churchconnect.app/faq");
              }}
            >
              <MessageCircle size={20} color={Colors.primary} />
              <View style={styles.privacyItemText}>
                <Text style={styles.privacyItemTitle}>FAQ</Text>
                <Text style={styles.privacyItemSubtitle}>Frequently asked questions</Text>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.privacyItem}
              onPress={() => {
                void Linking.openURL("https://churchconnect.app/terms");
              }}
            >
              <FileText size={20} color={Colors.primary} />
              <View style={styles.privacyItemText}>
                <Text style={styles.privacyItemTitle}>Terms of Service</Text>
                <Text style={styles.privacyItemSubtitle}>Read our terms and conditions</Text>
              </View>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </TouchableOpacity>

            <View style={styles.helpInfo}>
              <Text style={styles.helpInfoText}>Need immediate assistance?</Text>
              <Text style={styles.helpInfoSubtext}>Contact your church office during business hours</Text>
            </View>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => setHelpModalVisible(false)}
            >
              <Text style={styles.modalButtonTextSecondary}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteAccountModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDeleteAccountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <TouchableOpacity
                onPress={() => {
                  setDeleteAccountModalVisible(false);
                  setDeleteConfirmText('');
                }}
                style={styles.modalCloseButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.deleteWarningContainer}>
              <AlertTriangle size={32} color={Colors.error} />
              <Text style={styles.deleteWarningTitle}>This action is permanent</Text>
              <Text style={styles.deleteWarningText}>
                Deleting your account will permanently remove your profile, messages, and all associated data. This cannot be undone.
              </Text>
            </View>

            <Text style={styles.deleteConfirmLabel}>Type "DELETE" to confirm:</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder='Type "DELETE" here'
                placeholderTextColor={Colors.textTertiary}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                autoCapitalize="characters"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.deleteAccountButton,
                (deleteConfirmText !== 'DELETE' || isDeletingAccount) && styles.deleteAccountButtonDisabled,
              ]}
              onPress={async () => {
                if (deleteConfirmText !== 'DELETE') return;
                setIsDeletingAccount(true);
                try {
                  const result = await deleteAccount();
                  if (result.success) {
                    setDeleteAccountModalVisible(false);
                    setDeleteConfirmText('');
                    router.replace('/login' as any);
                  } else {
                    if (Platform.OS !== 'web') {
                      Alert.alert('Error', result.error || 'Failed to delete account');
                    } else {
                      alert(result.error || 'Failed to delete account');
                    }
                  }
                } catch {
                  if (Platform.OS !== 'web') {
                    Alert.alert('Error', 'Failed to delete account. Please try again.');
                  } else {
                    alert('Failed to delete account. Please try again.');
                  }
                } finally {
                  setIsDeletingAccount(false);
                }
              }}
              disabled={deleteConfirmText !== 'DELETE' || isDeletingAccount}
            >
              {isDeletingAccount ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.deleteAccountButtonText}>Delete My Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => {
                setDeleteAccountModalVisible(false);
                setDeleteConfirmText('');
              }}
            >
              <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setChangePasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => {
                  setChangePasswordModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                style={styles.modalCloseButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.passwordInputGroup}>
              <Text style={styles.passwordInputLabel}>Current Password</Text>
              <View style={styles.passwordInputContainer}>
                <Lock size={18} color={Colors.textSecondary} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter current password"
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
              </View>
            </View>

            <View style={styles.passwordInputGroup}>
              <Text style={styles.passwordInputLabel}>New Password</Text>
              <View style={styles.passwordInputContainer}>
                <Lock size={18} color={Colors.textSecondary} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter new password (min 6 characters)"
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </View>
            </View>

            <View style={styles.passwordInputGroup}>
              <Text style={styles.passwordInputLabel}>Confirm New Password</Text>
              <View style={styles.passwordInputContainer}>
                <Lock size={18} color={Colors.textSecondary} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm new password"
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalButton, isChangingPassword && styles.modalButtonDisabled]}
              onPress={async () => {
                if (!currentPassword || !newPassword || !confirmPassword) {
                  if (Platform.OS !== "web") {
                    Alert.alert("Error", "Please fill in all fields");
                  } else {
                    alert("Please fill in all fields");
                  }
                  return;
                }
                if (newPassword.length < 6) {
                  if (Platform.OS !== "web") {
                    Alert.alert("Error", "Password must be at least 6 characters");
                  } else {
                    alert("Password must be at least 6 characters");
                  }
                  return;
                }
                if (newPassword !== confirmPassword) {
                  if (Platform.OS !== "web") {
                    Alert.alert("Error", "Passwords do not match");
                  } else {
                    alert("Passwords do not match");
                  }
                  return;
                }
                
                setIsChangingPassword(true);
                try {
                  const result = await changePassword(newPassword);
                  if (result.success) {
                    setChangePasswordModalVisible(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    if (Platform.OS !== "web") {
                      Alert.alert("Success", "Your password has been updated");
                    } else {
                      alert("Your password has been updated");
                    }
                  } else {
                    if (Platform.OS !== "web") {
                      Alert.alert("Error", result.error || "Failed to change password");
                    } else {
                      alert(result.error || "Failed to change password");
                    }
                  }
                } catch {
                  if (Platform.OS !== "web") {
                    Alert.alert("Error", "Failed to change password. Please try again.");
                  } else {
                    alert("Failed to change password. Please try again.");
                  }
                } finally {
                  setIsChangingPassword(false);
                }
              }}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.modalButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "700" as const },
  headerEditButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  profileCard: {
    borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16 },
      android: { elevation: 3 },
      web: { boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)" },
    }),
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarMinistryDots: { position: "absolute", bottom: 0, right: -8, borderRadius: 12, paddingHorizontal: 4, paddingVertical: 2 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  userName: { fontSize: 22, fontWeight: "700" as const },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  userRole: { fontSize: 12, marginBottom: 16, letterSpacing: 1 },
  editButton: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  editButtonText: { fontSize: 14, fontWeight: "600" as const },
  infoSection: {
    borderRadius: 18, padding: 18, marginBottom: 24, gap: 14,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10 },
      android: { elevation: 2 },
      web: { boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)" },
    }),
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: { fontSize: 14 },
  sectionTitle: { fontSize: 12, fontWeight: "600" as const, marginBottom: 12, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  ministriesGrid: {
    flexDirection: "column",
    marginBottom: 24,
  },
  myMinistriesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.primary,
  },
  ministryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    width: "100%",
    marginBottom: 8,
  },
  ministryIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ministryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ministryBadgeContent: {
    flex: 1,
  },
  ministryName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  ministryMemberCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  noMinistriesCard: {
    width: "100%",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  noMinistriesTitle: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  noMinistriesSubtitle: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  menuSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuItemNoBorder: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuIconDanger: {
    backgroundColor: Colors.error + "15",
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  menuTitleDanger: {
    color: Colors.error,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  version: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: 24,
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
    maxHeight: "80%",
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
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  settingSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    padding: 2,
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.textInverse,
  },
  toggleKnobActive: {
    alignSelf: "flex-end",
  },
  modalButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  modalButtonSecondary: {
    backgroundColor: Colors.surfaceSecondary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.textInverse,
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  privacyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },
  privacyItemText: {
    flex: 1,
  },
  privacyItemTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  privacyItemSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  helpInfo: {
    backgroundColor: Colors.primary + "10",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: "center",
  },
  helpInfoText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  helpInfoSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  organizationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  organizationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  organizationInfo: {
    flex: 1,
  },
  organizationName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  organizationSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  churchManagementCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  churchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  superAdminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.secondary + "18",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    alignSelf: "flex-start",
    gap: 4,
  },
  superAdminBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.secondary,
  },
  managementActions: {
    marginTop: 12,
  },
  managementAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  managementActionLast: {
    borderBottomWidth: 0,
  },
  managementActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  managementActionContent: {
    flex: 1,
  },
  managementActionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  managementActionSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  noOrgCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  noOrgIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  noOrgTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  noOrgSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  noOrgButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  createOrgButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  createOrgButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textInverse,
  },
  joinOrgButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary + "15",
    borderRadius: 12,
    paddingVertical: 12,
  },
  joinOrgButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  passwordInputGroup: {
    marginBottom: 16,
  },
  passwordInputLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  deleteWarningContainer: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 16,
    backgroundColor: Colors.error + "08",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.error + "20",
  },
  deleteWarningTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.error,
    marginTop: 12,
    marginBottom: 8,
  },
  deleteWarningText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  deleteConfirmLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  deleteAccountButton: {
    backgroundColor: Colors.error,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  deleteAccountButtonDisabled: {
    opacity: 0.4,
  },
  deleteAccountButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.textInverse,
  },
});
