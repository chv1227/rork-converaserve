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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mail, Lock, Eye, EyeOff, User, Phone, ArrowLeft, Send, X, RefreshCw, Cross } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useButtonPress } from "@/hooks/useAnimations";
import { supabase } from "@/lib/supabase";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const GLASS_BG = "rgba(255, 255, 255, 0.08)";
const GLASS_BORDER = "rgba(255, 255, 255, 0.15)";
const GLASS_BG_FOCUS = "rgba(255, 255, 255, 0.14)";
const GLASS_BORDER_FOCUS = "rgba(212, 168, 67, 0.5)";
const TEXT_ON_DARK = "#F0ECE6";
const TEXT_MUTED = "rgba(240, 236, 230, 0.55)";

export default function RegisterScreen() {
  const router = useRouter();
  const { createOrg } = useLocalSearchParams<{ createOrg?: string }>();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState("");

  const brandFade = useRef(new Animated.Value(0)).current;
  const brandSlide = useRef(new Animated.Value(-20)).current;
  const formItems = useRef(
    Array.from({ length: 7 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(30),
    }))
  ).current;

  const registerButtonAnim = useButtonPress();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(brandFade, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(brandSlide, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start(() => {
      const staggers = formItems.map((item, i) =>
        Animated.parallel([
          Animated.timing(item.opacity, { toValue: 1, duration: 300, delay: i * 60, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
          Animated.timing(item.translateY, { toValue: 0, duration: 300, delay: i * 60, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        ])
      );
      Animated.parallel(staggers).start();
    });
  }, [brandFade, brandSlide, formItems]);

  const animStyle = (index: number) => ({
    opacity: formItems[index].opacity,
    transform: [{ translateY: formItems[index].translateY }],
  });

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all required fields");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await register(email.trim(), password, name.trim(), phone.trim() || undefined);

    if (result.success) {
      if (result.error && result.error.includes("verify your email")) {
        setVerificationEmail(email.trim());
        setShowVerificationModal(true);
      } else if (createOrg === 'true') {
        router.replace("/organization/create" as any);
      } else {
        router.replace("/(tabs)");
      }
    } else {
      setError(result.error || "Registration failed");
      if (Platform.OS !== "web") {
        Alert.alert("Registration Failed", result.error || "Please try again");
      }
    }
    setIsLoading(false);
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) return;
    setIsResending(true);
    setResendError("");
    setResendSuccess(false);
    try {
      const { error: resendErr } = await supabase.auth.resend({ type: 'signup', email: verificationEmail });
      if (!resendErr) {
        setResendSuccess(true);
      } else {
        setResendError(resendErr.message || "Failed to resend verification email");
      }
    } catch (err) {
      setResendError("Failed to resend verification email");
    }
    setIsResending(false);
  };

  const closeVerificationModal = () => {
    setShowVerificationModal(false);
    setResendSuccess(false);
    setResendError("");
    router.replace("/login" as any);
  };

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
        <View style={[styles.patternArc, { top: SCREEN_HEIGHT * 0.08, right: 40 }]} />
        <View style={[styles.patternArc, { bottom: SCREEN_HEIGHT * 0.15, left: 20, transform: [{ rotate: '135deg' }] }]} />
        <View style={[styles.patternDot, { top: SCREEN_HEIGHT * 0.22, right: 50 }]} />
        <View style={[styles.patternDot, { top: SCREEN_HEIGHT * 0.55, left: 35 }]} />
      </View>

      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 16 }]}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <ArrowLeft size={22} color={TEXT_ON_DARK} />
      </TouchableOpacity>

      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.brandSection, { opacity: brandFade, transform: [{ translateY: brandSlide }] }]}>
            <View style={styles.iconWrapper}>
              <View style={styles.iconInner}>
                <Cross size={24} color="#D4A843" strokeWidth={2.2} />
              </View>
            </View>
            <Text style={styles.appName}>{createOrg === 'true' ? 'Register Church' : 'Join ChurchConnect'}</Text>
            <Text style={styles.tagline}>United in faith, connected in love</Text>
          </Animated.View>

          <View style={styles.formSection}>
            {error ? (
              <Animated.View style={[styles.errorContainer, animStyle(0)]}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            <Animated.View style={animStyle(0)}>
              <View style={[styles.glassInput, focusedField === "name" && styles.glassInputFocused]}>
                <User size={20} color={focusedField === "name" ? "#D4A843" : TEXT_MUTED} />
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={TEXT_MUTED}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            </Animated.View>

            <Animated.View style={animStyle(1)}>
              <View style={[styles.glassInput, focusedField === "email" && styles.glassInputFocused]}>
                <Mail size={20} color={focusedField === "email" ? "#D4A843" : TEXT_MUTED} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={TEXT_MUTED}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            </Animated.View>

            <Animated.View style={animStyle(2)}>
              <View style={[styles.glassInput, focusedField === "phone" && styles.glassInputFocused]}>
                <Phone size={20} color={focusedField === "phone" ? "#D4A843" : TEXT_MUTED} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone number (optional)"
                  placeholderTextColor={TEXT_MUTED}
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setFocusedField("phone")}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="phone-pad"
                  editable={!isLoading}
                />
              </View>
            </Animated.View>

            <Animated.View style={animStyle(3)}>
              <View style={[styles.glassInput, focusedField === "password" && styles.glassInputFocused]}>
                <Lock size={20} color={focusedField === "password" ? "#D4A843" : TEXT_MUTED} />
                <TextInput
                  style={styles.input}
                  placeholder="Password (min 6 characters)"
                  placeholderTextColor={TEXT_MUTED}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showPassword ? <EyeOff size={20} color={TEXT_MUTED} /> : <Eye size={20} color={TEXT_MUTED} />}
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Animated.View style={animStyle(4)}>
              <View style={[styles.glassInput, focusedField === "confirm" && styles.glassInputFocused]}>
                <Lock size={20} color={focusedField === "confirm" ? "#D4A843" : TEXT_MUTED} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  placeholderTextColor={TEXT_MUTED}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField("confirm")}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
              </View>
            </Animated.View>

            <Animated.View style={animStyle(5)}>
              <TouchableOpacity
                style={[styles.signInButton, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                onPressIn={registerButtonAnim.onPressIn}
                onPressOut={registerButtonAnim.onPressOut}
                disabled={isLoading}
                activeOpacity={1}
              >
                <Animated.View style={[styles.signInButtonInner, { transform: [{ scale: registerButtonAnim.scale }] }]}>
                  <LinearGradient
                    colors={['rgba(212, 168, 67, 0.9)', 'rgba(200, 148, 62, 0.95)']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.signInGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#0C1B2E" />
                    ) : (
                      <Text style={styles.signInText}>
                        {createOrg === 'true' ? 'Create Account & Continue' : 'Create Account'}
                      </Text>
                    )}
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[styles.loginContainer, animStyle(6)]}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace("/login" as any)} disabled={isLoading}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showVerificationModal} animationType="slide" transparent={true} onRequestClose={closeVerificationModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Your Email</Text>
              <TouchableOpacity onPress={closeVerificationModal} style={styles.closeBtn}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {resendSuccess ? (
              <View style={styles.successBlock}>
                <View style={styles.successCircle}>
                  <Send size={28} color="#D4A843" />
                </View>
                <Text style={styles.successTitle}>Email Sent!</Text>
                <Text style={styles.successBody}>We've sent a verification link to{"\n"}<Text style={styles.successHighlight}>{verificationEmail}</Text></Text>
                <Text style={styles.successHint}>Check your inbox and click the link to verify your account, then sign in.</Text>
                <TouchableOpacity style={styles.doneBtn} onPress={closeVerificationModal}>
                  <Text style={styles.doneBtnText}>Go to Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.verifyIconRow}>
                  <Mail size={44} color="#D4A843" />
                </View>
                <Text style={styles.verifyHeading}>Check Your Inbox</Text>
                <Text style={styles.modalDesc}>We've sent a verification link to{"\n"}<Text style={{ fontWeight: "600", color: Colors.text }}>{verificationEmail}</Text></Text>
                <Text style={styles.verifyHint}>Click the link in the email to verify your account, then sign in.</Text>

                {resendError ? (
                  <View style={styles.modalErrorBox}>
                    <Text style={styles.modalErrorText}>{resendError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, isResending && styles.buttonDisabled]}
                  onPress={handleResendVerification}
                  disabled={isResending}
                >
                  {isResending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.modalBtnRow}>
                      <RefreshCw size={18} color="#fff" />
                      <Text style={styles.modalPrimaryBtnText}>Resend Verification Email</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalCancelBtn} onPress={closeVerificationModal} disabled={isResending}>
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
  container: { flex: 1, backgroundColor: '#0C1B2E' },
  patternContainer: { ...StyleSheet.absoluteFillObject },
  patternCircle: { position: "absolute", borderRadius: 999, borderWidth: 1.5, backgroundColor: "transparent" },
  patternArc: {
    position: "absolute", width: 80, height: 80, borderRadius: 40,
    borderWidth: 1.2, borderColor: "rgba(212, 168, 67, 0.06)",
    borderTopColor: "transparent", borderRightColor: "transparent", transform: [{ rotate: '45deg' }],
  },
  patternDot: { position: "absolute", width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(212, 168, 67, 0.12)" },
  backButton: { position: "absolute", left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", zIndex: 10 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 28 },
  brandSection: { alignItems: "center", marginBottom: 32 },
  iconWrapper: { width: 64, height: 64, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  iconInner: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(212, 168, 67, 0.12)",
    borderWidth: 1, borderColor: "rgba(212, 168, 67, 0.25)", alignItems: "center", justifyContent: "center",
  },
  appName: { fontSize: 28, fontWeight: "800" as const, color: TEXT_ON_DARK, letterSpacing: -0.5, marginBottom: 4 },
  tagline: { fontSize: 14, fontWeight: "400" as const, color: "rgba(240, 236, 230, 0.6)", letterSpacing: 0.2 },
  formSection: { flex: 1 },
  errorContainer: {
    backgroundColor: "rgba(196, 80, 80, 0.15)", borderWidth: 1, borderColor: "rgba(196, 80, 80, 0.3)",
    borderRadius: 14, padding: 14, marginBottom: 16,
  },
  errorText: { color: "#E88888", fontSize: 14, textAlign: "center", fontWeight: "500" as const },
  glassInput: {
    flexDirection: "row", alignItems: "center", backgroundColor: GLASS_BG,
    borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 16,
    paddingHorizontal: 16, marginBottom: 14, gap: 12,
  },
  glassInputFocused: {
    backgroundColor: GLASS_BG_FOCUS, borderColor: GLASS_BORDER_FOCUS,
    shadowColor: "#D4A843", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: TEXT_ON_DARK },
  eyeButton: { padding: 4 },
  signInButton: { borderRadius: 16, overflow: "hidden", marginBottom: 4 },
  signInButtonInner: { borderRadius: 16, overflow: "hidden" },
  signInGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 17, gap: 10,
  },
  signInText: { fontSize: 17, fontWeight: "700" as const, color: "#0C1B2E", letterSpacing: 0.3 },
  buttonDisabled: { opacity: 0.6 },
  loginContainer: { flexDirection: "row", justifyContent: "center", marginTop: 28, paddingTop: 24, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255, 255, 255, 0.08)" },
  loginText: { fontSize: 15, color: TEXT_MUTED },
  loginLink: { fontSize: 15, fontWeight: "600" as const, color: "#D4A843" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: "700" as const, color: Colors.text },
  closeBtn: { padding: 4 },
  modalDesc: { fontSize: 15, color: Colors.textSecondary, marginBottom: 20, lineHeight: 22, textAlign: "center" },
  modalErrorBox: { backgroundColor: Colors.error + "12", borderWidth: 1, borderColor: Colors.error + "30", borderRadius: 14, padding: 14, marginBottom: 16 },
  modalErrorText: { color: Colors.error, fontSize: 14, textAlign: "center", fontWeight: "500" as const },
  modalPrimaryBtn: { backgroundColor: "#1B3A5C", borderRadius: 16, paddingVertical: 16, alignItems: "center", justifyContent: "center", marginTop: 4 },
  modalPrimaryBtnText: { fontSize: 16, fontWeight: "600" as const, color: "#fff" },
  modalBtnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalCancelBtn: { paddingVertical: 16, alignItems: "center", marginTop: 4 },
  modalCancelText: { fontSize: 15, color: Colors.textSecondary, fontWeight: "500" as const },
  successBlock: { alignItems: "center", paddingVertical: 20 },
  successCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: "rgba(212, 168, 67, 0.12)", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: "700" as const, color: Colors.text, marginBottom: 12 },
  successBody: { fontSize: 15, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
  successHighlight: { fontWeight: "600" as const, color: Colors.text },
  successHint: { fontSize: 14, color: Colors.textTertiary, textAlign: "center", marginTop: 16, lineHeight: 20 },
  doneBtn: { backgroundColor: "#1B3A5C", borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48, marginTop: 24 },
  doneBtnText: { fontSize: 16, fontWeight: "600" as const, color: "#fff" },
  verifyIconRow: { alignItems: "center", marginBottom: 16 },
  verifyHeading: { fontSize: 20, fontWeight: "700" as const, color: Colors.text, textAlign: "center", marginBottom: 8 },
  verifyHint: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", marginBottom: 24, lineHeight: 20 },
});
