import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Building2, X, Send, RefreshCw, Cross } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useButtonPress } from "@/hooks/useAnimations";
import { supabase } from "@/lib/supabase";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000;

let loginAttempts = 0;
let lockoutUntil: number | null = null;

const GLASS_BG = "rgba(255, 255, 255, 0.08)";
const GLASS_BORDER = "rgba(255, 255, 255, 0.15)";
const GLASS_BG_FOCUS = "rgba(255, 255, 255, 0.14)";
const GLASS_BORDER_FOCUS = "rgba(212, 168, 67, 0.5)";
const TEXT_ON_DARK = "#F0ECE6";
const TEXT_MUTED = "rgba(240, 236, 230, 0.55)";
const AMBER_GLOW = "rgba(212, 168, 67, 0.35)";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, sendPasswordResetEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const brandFade = useRef(new Animated.Value(0)).current;
  const brandSlide = useRef(new Animated.Value(-20)).current;
  const formItems = useRef(
    Array.from({ length: 6 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(30),
    }))
  ).current;
  const buttonGlow = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const loginButtonAnim = useButtonPress();
  const registerButtonAnim = useButtonPress();
  const createOrgButtonAnim = useButtonPress();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(brandFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(brandSlide, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start(() => {
      const staggerAnims = formItems.map((item, index) =>
        Animated.parallel([
          Animated.timing(item.opacity, {
            toValue: 1,
            duration: 350,
            delay: index * 70,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(item.translateY, {
            toValue: 0,
            duration: 350,
            delay: index * 70,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
        ])
      );
      Animated.parallel(staggerAnims).start();
    });

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(buttonGlow, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(buttonGlow, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );
    glow.start();

    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    );
    shimmer.start();

    return () => {
      glow.stop();
      shimmer.stop();
    };
  }, [brandFade, brandSlide, formItems, buttonGlow, shimmerAnim]);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState("");

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSec = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`Too many failed attempts. Please wait ${remainingSec} seconds.`);
      return;
    }

    if (lockoutUntil && Date.now() >= lockoutUntil) {
      lockoutUntil = null;
      loginAttempts = 0;
    }

    setIsLoading(true);
    setError("");

    const result = await login(email.trim(), password);

    if (result.success) {
      loginAttempts = 0;
      lockoutUntil = null;
      router.replace("/(tabs)");
    } else {
      loginAttempts += 1;
      console.log(`Login attempt ${loginAttempts}/${MAX_LOGIN_ATTEMPTS}`);

      if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
        setError(`Too many failed attempts. Please wait 60 seconds before trying again.`);
        setIsLoading(false);
        return;
      }

      const errorMsg = result.error || "Login failed";

      if (errorMsg.toLowerCase().includes("verify") || errorMsg.toLowerCase().includes("email not confirmed")) {
        setVerifyEmail(email.trim());
        setVerifyError("");
        setVerificationSent(false);
        setShowVerifyModal(true);
      } else {
        const attemptsLeft = MAX_LOGIN_ATTEMPTS - loginAttempts;
        setError(`${errorMsg}${attemptsLeft <= 2 ? ` (${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining)` : ''}`);
        if (Platform.OS !== "web") {
          Alert.alert("Login Failed", errorMsg);
        }
      }
    }

    setIsLoading(false);
  };

  const handleForgotPassword = () => {
    setResetEmail(email);
    setResetError("");
    setResetSuccess(false);
    setShowResetModal(true);
  };

  const handleSendResetEmail = async () => {
    if (!resetEmail.trim()) {
      setResetError("Please enter your email address");
      return;
    }

    setIsResetting(true);
    setResetError("");

    const result = await sendPasswordResetEmail(resetEmail.trim());

    if (result.success) {
      setResetSuccess(true);
    } else {
      setResetError(result.error || "Failed to send reset email");
    }

    setIsResetting(false);
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetEmail("");
    setResetError("");
    setResetSuccess(false);
  };

  const handleResendVerification = async () => {
    if (!verifyEmail.trim()) {
      setVerifyError("Email is required");
      return;
    }

    setIsResendingVerification(true);
    setVerifyError("");

    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: verifyEmail.trim().toLowerCase(),
      });

      if (!resendErr) {
        setVerificationSent(true);
      } else {
        setVerifyError(resendErr.message || "Failed to resend verification email");
      }
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Failed to resend verification email");
    }

    setIsResendingVerification(false);
  };

  const closeVerifyModal = () => {
    setShowVerifyModal(false);
    setVerifyEmail("");
    setVerifyError("");
    setVerificationSent(false);
  };

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH * 1.5, SCREEN_WIDTH * 1.5],
  });

  const glowOpacity = buttonGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

  const animStyle = (index: number) => ({
    opacity: formItems[index].opacity,
    transform: [{ translateY: formItems[index].translateY }],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0C1B2E', '#132D4A', '#0A2640', '#0E1F35']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.patternContainer} pointerEvents="none">
        <View style={[styles.patternCircle, { top: -40, right: -60, width: 220, height: 220, borderColor: 'rgba(212, 168, 67, 0.06)' }]} />
        <View style={[styles.patternCircle, { top: SCREEN_HEIGHT * 0.15, left: -90, width: 180, height: 180, borderColor: 'rgba(255, 255, 255, 0.04)' }]} />
        <View style={[styles.patternCircle, { bottom: SCREEN_HEIGHT * 0.25, right: -40, width: 120, height: 120, borderColor: 'rgba(212, 168, 67, 0.05)' }]} />
        <View style={[styles.patternCircle, { bottom: -70, left: 30, width: 200, height: 200, borderColor: 'rgba(255, 255, 255, 0.03)' }]} />
        <View style={[styles.patternArc, { top: SCREEN_HEIGHT * 0.08, right: 40 }]} />
        <View style={[styles.patternArc, { bottom: SCREEN_HEIGHT * 0.15, left: 20, transform: [{ rotate: '135deg' }] }]} />
        <View style={[styles.patternDot, { top: SCREEN_HEIGHT * 0.22, right: 50 }]} />
        <View style={[styles.patternDot, { top: SCREEN_HEIGHT * 0.55, left: 35 }]} />
        <View style={[styles.patternDot, { bottom: SCREEN_HEIGHT * 0.35, right: 30 }]} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 50, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.brandSection,
              { opacity: brandFade, transform: [{ translateY: brandSlide }] },
            ]}
          >
            <View style={styles.iconWrapper}>
              <View style={styles.iconInner}>
                <Cross size={28} color="#D4A843" strokeWidth={2.2} />
              </View>
              <View style={styles.iconGlowRing} />
            </View>
            <Text style={styles.appName}>ChurchConnect</Text>
            <Text style={styles.tagline}>United in faith, connected in love</Text>
          </Animated.View>

          <View style={styles.formSection}>
            {error ? (
              <Animated.View style={[styles.errorContainer, animStyle(0)]}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            <Animated.View style={animStyle(0)}>
              <View style={[styles.glassInput, emailFocused && styles.glassInputFocused]}>
                <Mail size={20} color={emailFocused ? "#D4A843" : TEXT_MUTED} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={TEXT_MUTED}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  testID="email-input"
                />
              </View>
            </Animated.View>

            <Animated.View style={animStyle(1)}>
              <View style={[styles.glassInput, passwordFocused && styles.glassInputFocused]}>
                <Lock size={20} color={passwordFocused ? "#D4A843" : TEXT_MUTED} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={TEXT_MUTED}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  testID="password-input"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={TEXT_MUTED} />
                  ) : (
                    <Eye size={20} color={TEXT_MUTED} />
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Animated.View style={animStyle(2)}>
              <TouchableOpacity
                style={styles.forgotRow}
                onPress={handleForgotPassword}
                disabled={isLoading}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={animStyle(3)}>
              <TouchableOpacity
                style={[styles.signInButton, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                onPressIn={loginButtonAnim.onPressIn}
                onPressOut={loginButtonAnim.onPressOut}
                disabled={isLoading}
                activeOpacity={1}
                testID="login-button"
              >
                <Animated.View style={[styles.signInButtonInner, { transform: [{ scale: loginButtonAnim.scale }] }]}>
                  <LinearGradient
                    colors={['rgba(212, 168, 67, 0.9)', 'rgba(200, 148, 62, 0.95)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.signInGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#0C1B2E" />
                    ) : (
                      <>
                        <Text style={styles.signInText}>Sign In</Text>
                        <View style={styles.arrowBubble}>
                          <ArrowRight size={16} color="#0C1B2E" strokeWidth={2.5} />
                        </View>
                      </>
                    )}
                  </LinearGradient>
                  <Animated.View
                    style={[
                      styles.shimmer,
                      { transform: [{ translateX: shimmerTranslate }], opacity: glowOpacity },
                    ]}
                  />
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[styles.dividerRow, animStyle(4)]}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>or</Text>
              <View style={styles.dividerLine} />
            </Animated.View>

            <Animated.View style={animStyle(4)}>
              <TouchableOpacity
                style={styles.glassOutlineButton}
                onPress={() => router.push("/register" as never)}
                onPressIn={registerButtonAnim.onPressIn}
                onPressOut={registerButtonAnim.onPressOut}
                disabled={isLoading}
                activeOpacity={1}
              >
                <Animated.View style={[styles.glassOutlineInner, { transform: [{ scale: registerButtonAnim.scale }] }]}>
                  <Text style={styles.glassOutlineText}>Create an Account</Text>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[styles.churchSection, animStyle(5)]}>
              <Text style={styles.churchLabel}>Want to register your church?</Text>
              <TouchableOpacity
                style={styles.churchButton}
                onPress={() => router.push("/register?createOrg=true" as never)}
                onPressIn={createOrgButtonAnim.onPressIn}
                onPressOut={createOrgButtonAnim.onPressOut}
                disabled={isLoading}
                activeOpacity={1}
              >
                <Animated.View style={[styles.churchButtonInner, { transform: [{ scale: createOrgButtonAnim.scale }] }]}>
                  <Building2 size={17} color="#D4A843" />
                  <Text style={styles.churchButtonText}>Create a New Church</Text>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showResetModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeResetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={closeResetModal} style={styles.closeBtn}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {resetSuccess ? (
              <View style={styles.successBlock}>
                <View style={styles.successCircle}>
                  <Send size={28} color="#D4A843" />
                </View>
                <Text style={styles.successTitle}>Email Sent!</Text>
                <Text style={styles.successBody}>
                  We&apos;ve sent a password reset link to{"\n"}
                  <Text style={styles.successHighlight}>{resetEmail}</Text>
                </Text>
                <Text style={styles.successHint}>
                  Check your inbox and follow the instructions to reset your password.
                </Text>
                <TouchableOpacity style={styles.doneBtn} onPress={closeResetModal}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modalDesc}>
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </Text>

                {resetError ? (
                  <View style={styles.modalErrorBox}>
                    <Text style={styles.modalErrorText}>{resetError}</Text>
                  </View>
                ) : null}

                <View style={styles.modalInput}>
                  <Mail size={20} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.modalInputText}
                    placeholder="Email address"
                    placeholderTextColor={Colors.textTertiary}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isResetting}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, isResetting && styles.buttonDisabled]}
                  onPress={handleSendResetEmail}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalPrimaryBtnText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalCancelBtn} onPress={closeResetModal} disabled={isResetting}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showVerifyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeVerifyModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Email</Text>
              <TouchableOpacity onPress={closeVerifyModal} style={styles.closeBtn}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {verificationSent ? (
              <View style={styles.successBlock}>
                <View style={styles.successCircle}>
                  <Send size={28} color="#D4A843" />
                </View>
                <Text style={styles.successTitle}>Email Sent!</Text>
                <Text style={styles.successBody}>
                  We&apos;ve sent a verification link to{"\n"}
                  <Text style={styles.successHighlight}>{verifyEmail}</Text>
                </Text>
                <Text style={styles.successHint}>
                  Check your inbox and click the link to verify your account, then try signing in again.
                </Text>
                <TouchableOpacity style={styles.doneBtn} onPress={closeVerifyModal}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.verifyIconRow}>
                  <Mail size={44} color="#D4A843" />
                </View>
                <Text style={styles.verifyHeading}>Email Not Verified</Text>
                <Text style={styles.modalDesc}>
                  Your email address hasn&apos;t been verified yet. Please check your inbox for the verification link, or request a new one.
                </Text>

                {verifyError ? (
                  <View style={styles.modalErrorBox}>
                    <Text style={styles.modalErrorText}>{verifyError}</Text>
                  </View>
                ) : null}

                <View style={styles.verifyEmailPill}>
                  <Mail size={16} color={Colors.textSecondary} />
                  <Text style={styles.verifyEmailPillText}>{verifyEmail}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, isResendingVerification && styles.buttonDisabled]}
                  onPress={handleResendVerification}
                  disabled={isResendingVerification}
                >
                  {isResendingVerification ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.modalBtnRow}>
                      <RefreshCw size={18} color="#fff" />
                      <Text style={styles.modalPrimaryBtnText}>Resend Verification Email</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalCancelBtn} onPress={closeVerifyModal} disabled={isResendingVerification}>
                  <Text style={styles.modalCancelText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C1B2E',
  },
  patternContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  patternCircle: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  patternArc: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.2,
    borderColor: "rgba(212, 168, 67, 0.06)",
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    transform: [{ rotate: '45deg' }],
  },
  patternDot: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(212, 168, 67, 0.12)",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  brandSection: {
    alignItems: "center",
    marginBottom: 44,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  iconInner: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "rgba(212, 168, 67, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(212, 168, 67, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlowRing: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(212, 168, 67, 0.1)",
  },
  appName: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: TEXT_ON_DARK,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    fontWeight: "400" as const,
    color: "rgba(240, 236, 230, 0.6)",
    letterSpacing: 0.2,
  },
  formSection: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: "rgba(196, 80, 80, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(196, 80, 80, 0.3)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: "#E88888",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500" as const,
  },
  glassInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 12,
  },
  glassInputFocused: {
    backgroundColor: GLASS_BG_FOCUS,
    borderColor: GLASS_BORDER_FOCUS,
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 17,
    fontSize: 16,
    color: TEXT_ON_DARK,
  },
  eyeButton: {
    padding: 4,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginBottom: 22,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 14,
    color: "#D4A843",
    fontWeight: "600" as const,
  },
  signInButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 4,
  },
  signInButtonInner: {
    borderRadius: 16,
    overflow: "hidden",
  },
  signInGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    gap: 10,
  },
  signInText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#0C1B2E",
    letterSpacing: 0.3,
  },
  arrowBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(12, 27, 46, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    width: 40,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  dividerLabel: {
    marginHorizontal: 16,
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: "500" as const,
  },
  glassOutlineButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  glassOutlineInner: {
    paddingVertical: 16,
    alignItems: "center",
  },
  glassOutlineText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: TEXT_ON_DARK,
  },
  churchSection: {
    marginTop: 28,
    alignItems: "center",
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  churchLabel: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginBottom: 14,
  },
  churchButton: {
    borderWidth: 1,
    borderColor: "rgba(212, 168, 67, 0.3)",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(212, 168, 67, 0.06)",
  },
  churchButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  churchButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#D4A843",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  modalDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  modalErrorBox: {
    backgroundColor: Colors.error + "12",
    borderWidth: 1,
    borderColor: Colors.error + "30",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  modalErrorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500" as const,
  },
  modalInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalInputText: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
  },
  modalPrimaryBtn: {
    backgroundColor: "#1B3A5C",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  modalPrimaryBtnText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#fff",
  },
  modalBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalCancelBtn: {
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  modalCancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  successBlock: {
    alignItems: "center",
    paddingVertical: 20,
  },
  successCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(212, 168, 67, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 12,
  },
  successBody: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  successHighlight: {
    fontWeight: "600" as const,
    color: Colors.text,
  },
  successHint: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 20,
  },
  doneBtn: {
    backgroundColor: "#1B3A5C",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 24,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#fff",
  },
  verifyIconRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  verifyHeading: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  verifyEmailPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  verifyEmailPillText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "500" as const,
  },
});
