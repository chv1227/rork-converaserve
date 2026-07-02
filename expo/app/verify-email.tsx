import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mail, RefreshCw, LogOut, CheckCircle } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { LightTheme } from '@/constants/colors';

const RESEND_COOLDOWN = 60;

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [fadeAnim, slideAnim, pulseAnim]);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || !user?.email) return;
    setIsResending(true);
    try {
      console.log("VerifyEmail: Resending verification email to:", user.email);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });
      if (error) {
        console.error("VerifyEmail: Resend error:", error.message);
        Alert.alert("Error", error.message || "Failed to resend email. Please try again.");
      } else {
        Alert.alert(
          "Email Sent",
          `A verification link has been sent to ${user.email}. Please check your inbox and spam folder.`
        );
        startCooldown();
      }
    } catch (err) {
      console.error("VerifyEmail: Resend catch:", err);
      Alert.alert("Error", "Failed to resend email. Please try again.");
    } finally {
      setIsResending(false);
    }
  }, [cooldown, user?.email, startCooldown]);

  const handleCheckVerification = useCallback(async () => {
    setIsChecking(true);
    try {
      console.log("VerifyEmail: Refreshing session to check verification...");
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("VerifyEmail: Refresh error:", error);
        Alert.alert("Error", "Unable to check verification status. Please try again.");
        return;
      }
      if (data.session?.user?.email_confirmed_at) {
        console.log("VerifyEmail: Email is now verified!");
        await supabase.auth.getSession();
      } else {
        Alert.alert(
          "Not Yet Verified",
          "Your email hasn't been verified yet. Please click the link in your email."
        );
      }
    } catch (err) {
      console.error("VerifyEmail: Check error:", err);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          console.log("VerifyEmail: Logging out");
          await logout();
        },
      },
    ]);
  }, [logout]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={["#0F2557", "#1A4B8C", "#0D3B6E"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Animated.View
          style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}
        >
          <Mail size={52} color="#fff" strokeWidth={1.5} />
        </Animated.View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.description}>
          Click the link in your email to verify your account and gain full access to the app.
        </Text>

        <View style={styles.stepContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
            <Text style={styles.stepText}>Open your email inbox</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <Text style={styles.stepText}>Find the email from us</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
            <Text style={styles.stepText}>Click "Verify Email" link</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCheckVerification}
          disabled={isChecking}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color={LightTheme.primary} />
          ) : (
            <>
              <CheckCircle size={20} color={LightTheme.primary} />
              <Text style={styles.primaryButtonText}>I've Verified My Email</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, cooldown > 0 && styles.secondaryButtonDisabled]}
          onPress={handleResend}
          disabled={isResending || cooldown > 0}
        >
          {isResending ? (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
          ) : (
            <>
              <RefreshCw size={18} color={cooldown > 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.9)"} />
              <Text style={[styles.secondaryButtonText, cooldown > 0 && styles.secondaryButtonTextDisabled]}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Verification Email"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.spamNote}>
          Can't find the email? Check your spam or junk folder.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButton: {
    position: "absolute",
    top: 56,
    right: 24,
    padding: 8,
    zIndex: 10,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
    width: "100%",
    maxWidth: 420,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#F4BE37",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  stepContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 32,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F4BE37",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#0F2557",
  },
  stepText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500" as const,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: LightTheme.primary,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: 20,
  },
  secondaryButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.9)",
  },
  secondaryButtonTextDisabled: {
    color: "rgba(255,255,255,0.35)",
  },
  spamNote: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
  },
});
