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
import { Mail, Lock, Eye, EyeOff, ArrowRight, Building2, X, Send, RefreshCw, Sparkles } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { resendVerificationEmail } from "@/lib/supabase-auth";
import { useButtonPress } from "@/hooks/useAnimations";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  const loginButtonAnim = useButtonPress();
  const registerButtonAnim = useButtonPress();
  const createOrgButtonAnim = useButtonPress();

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
      ]),
    ]).start();

    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    );
    shimmer.start();

    return () => shimmer.stop();
  }, [fadeAnim, slideAnim, logoScale, logoOpacity, cardScale, shimmerAnim]);

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

    setIsLoading(true);
    setError("");

    const result = await login(email.trim(), password);

    if (result.success) {
      router.replace("/(tabs)");
    } else {
      const errorMsg = result.error || "Login failed";
      
      if (errorMsg.toLowerCase().includes("verify") || errorMsg.toLowerCase().includes("email not confirmed")) {
        setVerifyEmail(email.trim());
        setVerifyError("");
        setVerificationSent(false);
        setShowVerifyModal(true);
      } else {
        setError(errorMsg);
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
      await resendVerificationEmail(verifyEmail.trim().toLowerCase());
      setVerificationSent(true);
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
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B6B', '#FF8E53', '#FEC89A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
            <View style={styles.logoIconContainer}>
              <Sparkles size={32} color={Colors.textInverse} />
            </View>
            <Text style={styles.logo}>Church Connect</Text>
            <Text style={styles.tagline}>Building community, together</Text>
          </Animated.View>

          <Animated.View 
            style={[
              styles.formCard, 
              { 
                opacity: fadeAnim, 
                transform: [{ translateY: slideAnim }, { scale: cardScale }] 
              }
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.welcomeText}>Let's Get You Connected</Text>
              <Text style={styles.subtitle}>Sign in to stay connected with your church family and never miss a moment</Text>
            </View>

            {error ? (
              <Animated.View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            <View style={[styles.inputContainer, emailFocused && styles.inputContainerFocused]}>
              <View style={[styles.inputIcon, emailFocused && styles.inputIconFocused]}>
                <Mail size={20} color={emailFocused ? Colors.primary : Colors.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={Colors.textTertiary}
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

            <View style={[styles.inputContainer, passwordFocused && styles.inputContainerFocused]}>
              <View style={[styles.inputIcon, passwordFocused && styles.inputIconFocused]}>
                <Lock size={20} color={passwordFocused ? Colors.primary : Colors.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                editable={!isLoading}
                testID="password-input"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.textSecondary} />
                ) : (
                  <Eye size={20} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              onPressIn={loginButtonAnim.onPressIn}
              onPressOut={loginButtonAnim.onPressOut}
              disabled={isLoading}
              activeOpacity={1}
              testID="login-button"
            >
              <Animated.View style={[styles.loginButtonInner, { transform: [{ scale: loginButtonAnim.scale }] }]}>
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>Sign In</Text>
                      <View style={styles.arrowContainer}>
                        <ArrowRight size={18} color={Colors.textInverse} />
                      </View>
                    </>
                  )}
                </LinearGradient>
                <Animated.View 
                  style={[
                    styles.shimmerOverlay, 
                    { transform: [{ translateX: shimmerTranslate }] }
                  ]} 
                />
              </Animated.View>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => router.push("/register" as never)}
              onPressIn={registerButtonAnim.onPressIn}
              onPressOut={registerButtonAnim.onPressOut}
              disabled={isLoading}
              activeOpacity={1}
            >
              <Animated.View style={[styles.registerButtonInner, { transform: [{ scale: registerButtonAnim.scale }] }]}>
                <Text style={styles.registerButtonText}>Create an Account</Text>
              </Animated.View>
            </TouchableOpacity>

            <View style={styles.createOrgSection}>
              <Text style={styles.createOrgText}>Want to register your church?</Text>
              <TouchableOpacity
                style={styles.createOrgButton}
                onPress={() => router.push("/register?createOrg=true" as never)}
                onPressIn={createOrgButtonAnim.onPressIn}
                onPressOut={createOrgButtonAnim.onPressOut}
                disabled={isLoading}
                activeOpacity={1}
              >
                <Animated.View style={[styles.createOrgButtonInner, { transform: [{ scale: createOrgButtonAnim.scale }] }]}>
                  <Building2 size={18} color={Colors.secondary} />
                  <Text style={styles.createOrgButtonText}>Create a New Church</Text>
                </Animated.View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showResetModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeResetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={closeResetModal} style={styles.closeButton}>
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {resetSuccess ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Send size={32} color={Colors.primary} />
                </View>
                <Text style={styles.successTitle}>Email Sent!</Text>
                <Text style={styles.successText}>
                  We&apos;ve sent a password reset link to{"\n"}
                  <Text style={styles.successEmail}>{resetEmail}</Text>
                </Text>
                <Text style={styles.successHint}>
                  Check your inbox and follow the instructions to reset your password.
                </Text>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={closeResetModal}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </Text>

                {resetError ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{resetError}</Text>
                  </View>
                ) : null}

                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Mail size={20} color={Colors.textSecondary} />
                  </View>
                  <TextInput
                    style={styles.input}
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
                  style={[styles.resetButton, isResetting && styles.loginButtonDisabled]}
                  onPress={handleSendResetEmail}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.resetButtonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeResetModal}
                  disabled={isResetting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
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
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Email</Text>
              <TouchableOpacity onPress={closeVerifyModal} style={styles.closeButton}>
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {verificationSent ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Send size={32} color={Colors.primary} />
                </View>
                <Text style={styles.successTitle}>Email Sent!</Text>
                <Text style={styles.successText}>
                  We&apos;ve sent a verification link to{"\n"}
                  <Text style={styles.successEmail}>{verifyEmail}</Text>
                </Text>
                <Text style={styles.successHint}>
                  Check your inbox and click the link to verify your account, then try signing in again.
                </Text>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={closeVerifyModal}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.verifyIconContainer}>
                  <Mail size={48} color={Colors.primary} />
                </View>
                <Text style={styles.verifyTitle}>Email Not Verified</Text>
                <Text style={styles.modalSubtitle}>
                  Your email address hasn&apos;t been verified yet. Please check your inbox for the verification link, or request a new one.
                </Text>

                {verifyError ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{verifyError}</Text>
                  </View>
                ) : null}

                <View style={styles.verifyEmailDisplay}>
                  <Mail size={18} color={Colors.textSecondary} />
                  <Text style={styles.verifyEmailText}>{verifyEmail}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.resetButton, isResendingVerification && styles.loginButtonDisabled]}
                  onPress={handleResendVerification}
                  disabled={isResendingVerification}
                >
                  {isResendingVerification ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <>
                      <RefreshCw size={20} color={Colors.textInverse} />
                      <Text style={styles.resetButtonText}>Resend Verification Email</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeVerifyModal}
                  disabled={isResendingVerification}
                >
                  <Text style={styles.cancelButtonText}>Close</Text>
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
  },
  decorativeCircle1: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  decorativeCircle2: {
    position: "absolute",
    top: 200,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  decorativeCircle3: {
    position: "absolute",
    bottom: 100,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logo: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: Colors.textInverse,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: Colors.textInverse,
    opacity: 0.9,
    fontWeight: "500" as const,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 28,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
  },
  cardHeader: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: Colors.error + "12",
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.error + "30",
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500" as const,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "08",
  },
  inputIcon: {
    paddingLeft: 16,
    paddingRight: 4,
  },
  inputIconFocused: {
    opacity: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    fontSize: 16,
    color: Colors.text,
  },
  eyeIcon: {
    paddingRight: 16,
    paddingLeft: 8,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 20,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  loginButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  loginButtonInner: {
    overflow: "hidden",
    borderRadius: 16,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 60,
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.textInverse,
    letterSpacing: 0.2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  dividerText: {
    marginHorizontal: 16,
    color: Colors.textTertiary,
    fontSize: 13,
    fontWeight: "500" as const,
  },
  registerButton: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 16,
    overflow: "hidden",
  },
  registerButtonInner: {
    paddingVertical: 15,
    alignItems: "center",
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  createOrgSection: {
    marginTop: 24,
    alignItems: "center",
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  createOrgText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  createOrgButton: {
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: 16,
    overflow: "hidden",
  },
  createOrgButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  createOrgButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
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
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  resetButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.textInverse,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + "15",
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
  successText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  successEmail: {
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
  doneButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 24,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.textInverse,
  },
  verifyIconContainer: {
    alignItems: "center" as const,
    marginBottom: 16,
  },
  verifyTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    textAlign: "center" as const,
    marginBottom: 8,
  },
  verifyEmailDisplay: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  verifyEmailText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "500" as const,
  },
});
