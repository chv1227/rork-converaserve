import { useState } from "react";
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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mail, Lock, Eye, EyeOff, User, Phone, ArrowLeft, Send, X, RefreshCw } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

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
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState("");

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

    console.log("Attempting registration...");
    const result = await register(email.trim(), password, name.trim(), phone.trim() || undefined);

    if (result.success) {
      console.log("Registration successful");
      if (result.error && result.error.includes("verify your email")) {
        setVerificationEmail(email.trim());
        setShowVerificationModal(true);
      } else if (createOrg === 'true') {
        console.log("Redirecting to create organization");
        router.replace("/organization/create" as any);
      } else {
        console.log("Navigating to home");
        router.replace("/(tabs)");
      }
    } else {
      console.log("Registration failed:", result.error);
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
      const response = await fetch(`${process.env.EXPO_PUBLIC_RORK_API_BASE_URL || ''}/trpc/auth.resendVerification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verificationEmail,
        }),
      });
      
      if (response.ok) {
        console.log("Verification email resent");
        setResendSuccess(true);
      } else {
        const data = await response.json();
        console.error("Resend verification error:", data);
        setResendError(data?.error?.message || "Failed to resend verification email");
      }
    } catch (err) {
      console.error("Resend error:", err);
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
        colors={[Colors.primary, "#0D5C56"]}
        style={styles.headerGradient}
      >
        <View style={[styles.headerContent, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.formContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <Text style={styles.welcomeText}>{createOrg === 'true' ? 'Register Your Church' : 'Join Our Community'}</Text>
            <Text style={styles.subtitle}>{createOrg === 'true' ? 'First, create your account' : 'Create an account to get started'}</Text>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <User size={20} color={Colors.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Full name *"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Mail size={20} color={Colors.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email address *"
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Phone size={20} color={Colors.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Phone number (optional)"
                placeholderTextColor={Colors.textTertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Lock size={20} color={Colors.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Password *"
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
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

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Lock size={20} color={Colors.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Confirm password *"
                placeholderTextColor={Colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.back()} disabled={isLoading}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showVerificationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeVerificationModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Your Email</Text>
              <TouchableOpacity onPress={closeVerificationModal} style={styles.closeButton}>
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Send size={32} color={Colors.primary} />
              </View>
              <Text style={styles.successTitle}>Check Your Inbox</Text>
              <Text style={styles.successText}>
                We&apos;ve sent a verification link to{"\n"}
                <Text style={styles.successEmail}>{verificationEmail}</Text>
              </Text>
              <Text style={styles.successHint}>
                Click the link in the email to verify your account, then sign in.
              </Text>

              {resendError ? (
                <View style={styles.resendErrorContainer}>
                  <Text style={styles.resendErrorText}>{resendError}</Text>
                </View>
              ) : null}

              {resendSuccess ? (
                <View style={styles.resendSuccessContainer}>
                  <Text style={styles.resendSuccessText}>Verification email sent!</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.resendButton, isResending && styles.resendButtonDisabled]}
                onPress={handleResendVerification}
                disabled={isResending}
              >
                {isResending ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <RefreshCw size={18} color={Colors.primary} />
                    <Text style={styles.resendButtonText}>Resend Verification Email</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={closeVerificationModal}
              >
                <Text style={styles.doneButtonText}>Go to Sign In</Text>
              </TouchableOpacity>
            </View>
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
  headerGradient: {
    paddingBottom: 40,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.textInverse,
  },
  placeholder: {
    width: 40,
  },
  formContainer: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: Colors.error + "15",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  inputIcon: {
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.text,
  },
  eyeIcon: {
    paddingRight: 16,
  },
  registerButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.textInverse,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  loginText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
  resendErrorContainer: {
    backgroundColor: Colors.error + "15",
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    width: "100%",
  },
  resendErrorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: "center",
  },
  resendSuccessContainer: {
    backgroundColor: Colors.success + "15",
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    width: "100%",
  },
  resendSuccessText: {
    color: Colors.success,
    fontSize: 14,
    textAlign: "center",
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 16,
    marginTop: 24,
    width: "100%",
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 12,
    width: "100%",
    alignItems: "center",
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.textInverse,
  },
});
