import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import {
  Crown,
  Shield,
  Check,
  X,
  Clock,
  MessageSquare,
  ChevronRight,
} from "lucide-react-native";
import { LightTheme } from "@/constants/colors";
import { LeadershipInvitation } from "@/types";

interface LeadershipInvitationCardProps {
  invitation: LeadershipInvitation;
  onAccept: (invitation: LeadershipInvitation) => void;
  onDecline: (invitation: LeadershipInvitation) => void;
  onView: (invitation: LeadershipInvitation) => void;
}

export default function LeadershipInvitationCard({
  invitation,
  onAccept,
  onDecline,
  onView,
}: LeadershipInvitationCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const daysLeft = Math.ceil(
    (new Date(invitation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isExpiring = daysLeft <= 2;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleAccept = useCallback(() => {
    if (Platform.OS === "web") {
      if (confirm(`Accept leadership role for ${invitation.ministryName}?`)) {
        onAccept(invitation);
      }
    } else {
      Alert.alert(
        "Accept Invitation",
        `Are you sure you want to accept the ${invitation.role === "primary_leader" ? "Primary Leader" : "Co-Leader"} role for ${invitation.ministryName}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Accept", onPress: () => onAccept(invitation) },
        ]
      );
    }
  }, [invitation, onAccept]);

  const handleDecline = useCallback(() => {
    if (Platform.OS === "web") {
      if (confirm(`Decline leadership invitation for ${invitation.ministryName}?`)) {
        onDecline(invitation);
      }
    } else {
      Alert.alert(
        "Decline Invitation",
        `Are you sure you want to decline this leadership invitation?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Decline", style: "destructive", onPress: () => onDecline(invitation) },
        ]
      );
    }
  }, [invitation, onDecline]);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onView(invitation)}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: invitation.inviterAvatar }}
              style={styles.avatar}
            />
            <View style={[styles.roleBadge, invitation.role === "primary_leader" ? styles.primaryBadge : styles.coLeaderBadge]}>
              {invitation.role === "primary_leader" ? (
                <Crown size={10} color="#fff" />
              ) : (
                <Shield size={10} color="#fff" />
              )}
            </View>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Leadership Invitation</Text>
            <Text style={styles.ministryName}>{invitation.ministryName}</Text>
          </View>
          <ChevronRight size={18} color={LightTheme.textTertiary} />
        </View>

        <View style={styles.content}>
          <View style={styles.inviterRow}>
            <Text style={styles.inviterLabel}>Invited by</Text>
            <Text style={styles.inviterName}>{invitation.inviterName}</Text>
          </View>

          <View style={styles.roleRow}>
            <View style={[styles.roleTag, invitation.role === "primary_leader" ? styles.primaryTag : styles.coLeaderTag]}>
              {invitation.role === "primary_leader" ? (
                <Crown size={14} color={LightTheme.warning} />
              ) : (
                <Shield size={14} color={LightTheme.primary} />
              )}
              <Text style={[styles.roleText, invitation.role === "primary_leader" ? styles.primaryText : styles.coLeaderText]}>
                {invitation.role === "primary_leader" ? "Primary Leader" : "Co-Leader"}
              </Text>
            </View>

            <View style={[styles.expiryTag, isExpiring && styles.expiryTagUrgent]}>
              <Clock size={12} color={isExpiring ? LightTheme.error : LightTheme.textSecondary} />
              <Text style={[styles.expiryText, isExpiring && styles.expiryTextUrgent]}>
                {daysLeft} days left
              </Text>
            </View>
          </View>

          {!!invitation.message && (
            <View style={styles.messageContainer}>
              <MessageSquare size={14} color={LightTheme.textSecondary} />
              <Text style={styles.messageText} numberOfLines={2}>
                {`"${invitation.message}"`}
              </Text>
            </View>
          )}

          {!!invitation.transferType && (
            <View style={styles.transferInfo}>
              <Text style={styles.transferLabel}>Transfer Type:</Text>
              <Text style={styles.transferValue}>
                {invitation.transferType === "complete_handoff"
                  ? "Complete Handoff"
                  : invitation.transferType === "add_co_leader"
                  ? "Add as Co-Leader"
                  : "Gradual Transition"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={handleDecline}
            activeOpacity={0.7}
          >
            <X size={18} color={LightTheme.error} />
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={handleAccept}
            activeOpacity={0.7}
          >
            <Check size={18} color="#fff" />
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.borderLight,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  roleBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: LightTheme.surface,
  },
  primaryBadge: {
    backgroundColor: LightTheme.warning,
  },
  coLeaderBadge: {
    backgroundColor: LightTheme.primary,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: LightTheme.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  ministryName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: LightTheme.text,
  },
  content: {
    padding: 16,
  },
  inviterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  inviterLabel: {
    fontSize: 13,
    color: LightTheme.textSecondary,
    marginRight: 8,
  },
  inviterName: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: LightTheme.text,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  primaryTag: {
    backgroundColor: LightTheme.warningLight,
  },
  coLeaderTag: {
    backgroundColor: LightTheme.primary + "15",
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  primaryText: {
    color: LightTheme.warning,
  },
  coLeaderText: {
    color: LightTheme.primary,
  },
  expiryTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: LightTheme.surfaceSecondary,
    borderRadius: 6,
  },
  expiryTagUrgent: {
    backgroundColor: LightTheme.errorLight,
  },
  expiryText: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: LightTheme.textSecondary,
  },
  expiryTextUrgent: {
    color: LightTheme.error,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: LightTheme.surfaceSecondary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    color: LightTheme.textSecondary,
    fontStyle: "italic",
    lineHeight: 18,
  },
  transferInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  transferLabel: {
    fontSize: 12,
    color: LightTheme.textSecondary,
  },
  transferValue: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: LightTheme.text,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingTop: 0,
  },
  declineButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: LightTheme.error + "15",
  },
  declineText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: LightTheme.error,
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: LightTheme.success,
  },
  acceptText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
  },
});
