import { createClient, SupabaseClient, Session, User as SupabaseUser } from "@supabase/supabase-js";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isNetworkError = 
        lastError.message.includes('Failed to fetch') ||
        lastError.message.includes('Network') ||
        lastError.message.includes('fetch') ||
        lastError.name === 'AuthRetryableFetchError';
      
      if (!isNetworkError || i === retries - 1) {
        throw lastError;
      }
      
      console.log(`Supabase: Retry ${i + 1}/${retries} after network error`);
      await sleep(RETRY_DELAY * (i + 1));
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === "web") {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error("Failed to store value:", error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error("Failed to remove value:", error);
    }
  },
};

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase URL and Anon Key are required");
    }

    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseInstance;
}

export interface AuthResult {
  user: SupabaseUser | null;
  session: Session | null;
}

function getSupabaseErrorMessage(error: { message?: string; code?: string }): string {
  const errorMessages: Record<string, string> = {
    invalid_credentials: "Invalid email or password",
    user_already_exists: "An account with this email already exists",
    invalid_email: "Please enter a valid email address",
    weak_password: "Password should be at least 6 characters",
    email_not_confirmed: "Please verify your email address",
    user_not_found: "No account found with this email",
    invalid_grant: "Invalid email or password",
    "User already registered": "An account with this email already exists",
    "Invalid login credentials": "Invalid email or password",
    "Email not confirmed": "Please verify your email address",
    "Password should be at least 6 characters": "Password should be at least 6 characters",
  };

  const errorMessage = error.message || "";
  const errorCode = error.code || "";

  if (errorMessages[errorCode]) {
    return errorMessages[errorCode];
  }

  for (const [key, value] of Object.entries(errorMessages)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  if (errorMessage.includes("Network") || errorMessage.includes("fetch")) {
    return "Unable to connect. Please check your internet connection.";
  }

  return errorMessage || "An unexpected error occurred. Please try again.";
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResult> {
  console.log("Supabase: Signing up user:", email);

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        full_name: displayName,
      },
    },
  });

  if (error) {
    console.error("Supabase sign up error:", error);
    throw new Error(getSupabaseErrorMessage(error));
  }

  console.log("Supabase: Sign up successful for:", email);
  return { user: data.user, session: data.session };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  console.log("Supabase: Signing in user:", email);

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Supabase sign in error:", error);
    throw new Error(getSupabaseErrorMessage(error));
  }

  console.log("Supabase: Sign in successful for:", email);
  return { user: data.user, session: data.session };
}

export async function signOut(): Promise<void> {
  console.log("Supabase: Signing out");

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Supabase sign out error:", error);
    throw new Error(getSupabaseErrorMessage(error));
  }

  console.log("Supabase: Sign out successful");
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  console.log("Supabase: Sending password reset email to:", email);

  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: undefined,
  });

  if (error) {
    console.error("Supabase password reset error:", error);
    throw new Error(getSupabaseErrorMessage(error));
  }

  console.log("Supabase: Password reset email sent to:", email);
}

export async function updateUserProfile(updates: {
  displayName?: string;
  avatarUrl?: string;
}): Promise<SupabaseUser | null> {
  console.log("Supabase: Updating user profile");

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.updateUser({
    data: {
      display_name: updates.displayName,
      full_name: updates.displayName,
      avatar_url: updates.avatarUrl,
    },
  });

  if (error) {
    console.error("Supabase profile update error:", error);
    throw new Error(getSupabaseErrorMessage(error));
  }

  console.log("Supabase: Profile updated successfully");
  return data.user;
}

export async function changePassword(newPassword: string): Promise<SupabaseUser | null> {
  console.log("Supabase: Changing password");

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error("Supabase change password error:", error);
    throw new Error(getSupabaseErrorMessage(error));
  }

  console.log("Supabase: Password changed successfully");
  return data.user;
}

export async function getCurrentSession(): Promise<Session | null> {
  try {
    const supabase = getSupabaseClient();
    
    const result = await withRetry(async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data;
    }, 2);

    return result.session;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const isNetworkError = 
      err.message.includes('Failed to fetch') ||
      err.message.includes('Network') ||
      err.name === 'AuthRetryableFetchError';
    
    if (isNetworkError) {
      console.log("Supabase: Network error getting session, will retry on next attempt");
    } else {
      console.error("Supabase get session error:", error);
    }
    return null;
  }
}

export async function getCurrentUser(): Promise<SupabaseUser | null> {
  try {
    const supabase = getSupabaseClient();
    
    const result = await withRetry(async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data;
    }, 2);

    return result.user;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const isNetworkError = 
      err.message.includes('Failed to fetch') ||
      err.message.includes('Network') ||
      err.name === 'AuthRetryableFetchError';
    
    if (isNetworkError) {
      console.log("Supabase: Network error getting user, will retry on next attempt");
      return null;
    }
    
    console.error("Supabase get user error:", error);
    
    // Handle "User from sub claim in JWT does not exist" error
    if (err.message?.includes("User from sub claim") || 
        err.message?.includes("does not exist") ||
        err.name === "AuthApiError") {
      console.log("Clearing invalid session due to non-existent user");
      try {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error("Error signing out invalid session:", signOutError);
      }
    }
    return null;
  }
}

export async function refreshSession(): Promise<Session | null> {
  console.log("Supabase: Refreshing session");

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    console.error("Supabase refresh session error:", error);
    return null;
  }

  console.log("Supabase: Session refreshed successfully");
  return data.session;
}

export async function deleteAccount(): Promise<void> {
  console.log("Supabase: Deleting account");
  
  throw new Error("Account deletion requires admin privileges. Please contact support.");
}

export async function resendVerificationEmail(email: string): Promise<void> {
  console.log("Supabase: Resending verification email to:", email);

  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    console.error("Supabase resend verification error:", error);
    throw new Error(getSupabaseErrorMessage(error));
  }

  console.log("Supabase: Verification email resent to:", email);
}

export function onAuthStateChange(
  callback: (session: Session | null) => void
): () => void {
  const supabase = getSupabaseClient();

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session);
    }
  );

  return () => {
    subscription.unsubscribe();
  };
}
