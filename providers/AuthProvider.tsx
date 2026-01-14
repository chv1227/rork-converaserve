import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import {
  signInWithEmail,
  signUpWithEmail,
  sendPasswordResetEmail as supabaseSendPasswordReset,
  updateUserProfile,
  changePassword as supabaseChangePassword,
  getCurrentSession,
  getCurrentUser,
  signOut,
  onAuthStateChange,
} from "@/lib/supabase-auth";
import { setAuthToken } from "@/lib/trpc";
import { Organization, OrganizationRole } from "@/types";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";

export type UserRole = "member" | "leader" | "admin" | "super_admin";

const SUPER_ADMIN_EMAILS = [
  "chv1227@gmail.com",
];

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: UserRole;
  ministries: string[];
  phone?: string;
  joinedDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  role: OrganizationRole;
  joinedAt: string;
  organization?: Organization;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  currentOrganization: Organization | null;
  currentMembership: Membership | null;
  organizations: (Organization & { role: OrganizationRole; joinedAt: string })[];
  error: string | null;
}

const USER_KEY = "supabase_user_v1";
const ORG_KEY = "current_organization_v1";

async function getStoredValue(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setStoredValue(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch {
    console.error("Failed to store value for key:", key);
  }
}

async function removeStoredValue(key: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    console.error("Failed to remove value for key:", key);
  }
}

async function clearAllAuthData(): Promise<void> {
  await Promise.all([
    removeStoredValue(USER_KEY),
    removeStoredValue(ORG_KEY),
  ]);
}

function createUserFromSupabase(supabaseUser: SupabaseUser): User {
  const now = new Date().toISOString();
  const metadata = supabaseUser.user_metadata || {};
  const displayName = metadata.display_name || metadata.full_name || supabaseUser.email?.split("@")[0] || "User";
  const userEmail = supabaseUser.email?.toLowerCase() || "";
  const isSuperAdmin = SUPER_ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    name: displayName,
    avatar: metadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1A7B74&color=fff`,
    role: isSuperAdmin ? "super_admin" : "member",
    ministries: [],
    joinedDate: supabaseUser.created_at || now,
    isActive: true,
    createdAt: supabaseUser.created_at || now,
    updatedAt: now,
  };
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    currentOrganization: null,
    currentMembership: null,
    organizations: [],
    error: null,
  });

  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const loadStoredAuth = async () => {
      console.log("AuthProvider: Loading stored authentication...");
      try {
        const [storedUser, storedOrg] = await Promise.all([
          getStoredValue(USER_KEY),
          getStoredValue(ORG_KEY),
        ]);

        let session = null;
        let supabaseUser = null;
        
        try {
          session = await getCurrentSession();
          
          if (session) {
            supabaseUser = await getCurrentUser();
          }
        } catch {
          console.log("AuthProvider: Network error during auth check, using cached data if available");
          
          // If we have cached user data, use it even if network fails
          if (storedUser) {
            try {
              const cachedUser = JSON.parse(storedUser) as User;
              const cachedOrg = storedOrg ? JSON.parse(storedOrg) as Organization : null;
              
              console.log("AuthProvider: Using cached user data due to network error:", cachedUser.name);
              
              setState({
                user: cachedUser,
                session: null,
                isAuthenticated: true,
                currentOrganization: cachedOrg,
                currentMembership: null,
                organizations: [],
                isLoading: false,
                error: "Network connection issue. Some features may be limited.",
              });
              return;
            } catch {
              console.log("AuthProvider: Failed to parse cached data");
            }
          }
          
          setState(prev => ({ 
            ...prev, 
            isLoading: false,
            error: "Unable to connect. Please check your internet connection.",
          }));
          return;
        }
        
        // If no session, clear everything and return
        if (!session) {
          console.log("AuthProvider: No active session found");
          await clearAllAuthData();
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
        
        if (!supabaseUser) {
          console.log("AuthProvider: Session exists but user not found - clearing auth data");
          await clearAllAuthData();
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        let user: User;
        let cachedOrg: Organization | null = null;

        try {
          if (storedUser) {
            user = JSON.parse(storedUser) as User;
            user.id = supabaseUser.id;
            user.email = supabaseUser.email || user.email;
          } else {
            user = createUserFromSupabase(supabaseUser);
          }
          cachedOrg = storedOrg ? JSON.parse(storedOrg) as Organization : null;
        } catch (parseError) {
          console.error("AuthProvider: Failed to parse stored data", parseError);
          user = createUserFromSupabase(supabaseUser);
        }

        await setStoredValue(USER_KEY, JSON.stringify(user));

        console.log("AuthProvider: Session restored for user:", user.name);
        
        setAuthToken(session.access_token);
        console.log("AuthProvider: Token synced with tRPC client");
        
        setState({
          user,
          session,
          isAuthenticated: true,
          currentOrganization: cachedOrg,
          currentMembership: null,
          organizations: [],
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("AuthProvider: Error loading stored auth", error);
        
        // Don't clear auth data on network errors - keep cached state
        const err = error instanceof Error ? error : new Error(String(error));
        const isNetworkError = 
          err.message.includes('Failed to fetch') ||
          err.message.includes('Network') ||
          err.name === 'AuthRetryableFetchError';
        
        if (!isNetworkError) {
          await clearAllAuthData();
        }
        
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: isNetworkError ? "Unable to connect. Please check your internet connection." : null,
        }));
      }
    };

    loadStoredAuth();

    const unsubscribe = onAuthStateChange(async (session) => {
      console.log("AuthProvider: Auth state changed", session ? "logged in" : "logged out");
      
      if (!session) {
        setAuthToken(null);
        await clearAllAuthData();
        setState({
          user: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
          currentOrganization: null,
          currentMembership: null,
          organizations: [],
          error: null,
        });
        return;
      }

      // Get user - this will auto-clear invalid sessions
      const supabaseUser = await getCurrentUser();
      
      // If session exists but user doesn't, clear everything
      if (!supabaseUser) {
        console.log("AuthProvider: Auth state has session but no valid user - clearing");
        await clearAllAuthData();
        setState({
          user: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
          currentOrganization: null,
          currentMembership: null,
          organizations: [],
          error: null,
        });
        return;
      }
      
      if (supabaseUser) {
        const storedUser = await getStoredValue(USER_KEY);
        let user: User;

        if (storedUser) {
          try {
            user = JSON.parse(storedUser) as User;
            user.id = supabaseUser.id;
            user.email = supabaseUser.email || user.email;
          } catch {
            user = createUserFromSupabase(supabaseUser);
          }
        } else {
          user = createUserFromSupabase(supabaseUser);
        }

        await setStoredValue(USER_KEY, JSON.stringify(user));
        
        setAuthToken(session.access_token);

        setState(prev => ({
          ...prev,
          user,
          session,
          isAuthenticated: true,
          isLoading: false,
        }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, error: null }));

    if (!email || !password) {
      return { success: false, error: "Email and password are required" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: "Please enter a valid email address" };
    }

    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }

    try {
      console.log("AuthProvider: Attempting login for:", email);
      const result = await signInWithEmail(email.toLowerCase().trim(), password);

      if (!result.user || !result.session) {
        return { success: false, error: "Login failed. Please try again." };
      }

      const user = createUserFromSupabase(result.user);

      console.log("AuthProvider: Login successful for:", user.name);

      await setStoredValue(USER_KEY, JSON.stringify(user));
      
      setAuthToken(result.session.access_token);
      console.log("AuthProvider: Token synced after login");

      setState({
        user,
        session: result.session,
        isLoading: false,
        isAuthenticated: true,
        currentOrganization: null,
        currentMembership: null,
        organizations: [],
        error: null,
      });

      return { success: true };
    } catch (error: unknown) {
      console.error("AuthProvider: Login error:", error);
      const message = error instanceof Error ? error.message : "Login failed. Please try again.";
      setState(prev => ({ ...prev, error: message }));
      return { success: false, error: message };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, phone?: string) => {
    setState(prev => ({ ...prev, error: null }));

    if (!email || !password || !name) {
      return { success: false, error: "Email, password, and name are required" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: "Please enter a valid email address" };
    }

    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }

    if (name.length < 2) {
      return { success: false, error: "Name must be at least 2 characters" };
    }

    try {
      console.log("AuthProvider: Starting registration for:", email);
      const result = await signUpWithEmail(
        email.toLowerCase().trim(),
        password,
        name.trim()
      );

      if (!result.user) {
        return { success: false, error: "Registration failed. Please try again." };
      }

      if (!result.session) {
        return { 
          success: true, 
          error: "Please check your email to verify your account before signing in." 
        };
      }

      const user = createUserFromSupabase(result.user);
      
      if (phone) {
        user.phone = phone.trim();
      }

      console.log("AuthProvider: Registration successful for:", user.name);

      await setStoredValue(USER_KEY, JSON.stringify(user));
      
      setAuthToken(result.session.access_token);
      console.log("AuthProvider: Token synced after registration");

      setState({
        user,
        session: result.session,
        isLoading: false,
        isAuthenticated: true,
        currentOrganization: null,
        currentMembership: null,
        organizations: [],
        error: null,
      });

      return { success: true };
    } catch (error: unknown) {
      console.error("AuthProvider: Registration error:", error);
      const message = error instanceof Error ? error.message : "Registration failed. Please try again.";
      setState(prev => ({ ...prev, error: message }));
      return { success: false, error: message };
    }
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    if (!email) {
      return { success: false, error: "Email is required" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: "Please enter a valid email address" };
    }

    try {
      console.log("AuthProvider: Sending password reset email to:", email);
      await supabaseSendPasswordReset(email.toLowerCase().trim());
      console.log("AuthProvider: Password reset email sent");
      return { success: true };
    } catch (error: unknown) {
      console.error("AuthProvider: Password reset error:", error);
      const message = error instanceof Error ? error.message : "Failed to send reset email. Please try again.";
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    console.log("AuthProvider: Logging out...");

    try {
      await signOut();
    } catch (error) {
      console.error("AuthProvider: Sign out error:", error);
    }

    setAuthToken(null);
    await clearAllAuthData();
    console.log("AuthProvider: Logout complete");

    setState({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
      currentOrganization: null,
      currentMembership: null,
      organizations: [],
      error: null,
    });
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!state.user) return;

    const updatedUser = { ...state.user, ...updates };
    await setStoredValue(USER_KEY, JSON.stringify(updatedUser));

    if (updates.name || updates.avatar) {
      try {
        await updateUserProfile({
          displayName: updates.name,
          avatarUrl: updates.avatar,
        });
      } catch (error) {
        console.error("AuthProvider: Failed to update Supabase profile:", error);
      }
    }

    setState(prev => ({
      ...prev,
      user: updatedUser,
    }));
  }, [state.user]);

  const refreshUser = useCallback(async () => {
    try {
      const supabaseUser = await getCurrentUser();
      if (!supabaseUser) return;

      const updatedUser = createUserFromSupabase(supabaseUser);

      if (state.user) {
        updatedUser.role = state.user.role;
        updatedUser.ministries = state.user.ministries;
        updatedUser.phone = state.user.phone;
      }

      await setStoredValue(USER_KEY, JSON.stringify(updatedUser));

      setState(prev => ({
        ...prev,
        user: updatedUser,
        error: null,
      }));
    } catch (error) {
      console.error("AuthProvider: Failed to refresh user:", error);
    }
  }, [state.user]);

  const changePassword = useCallback(async (newPassword: string) => {
    if (!state.session) {
      return { success: false, error: "Not authenticated" };
    }

    if (newPassword.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }

    try {
      console.log("AuthProvider: Changing password...");
      await supabaseChangePassword(newPassword);
      console.log("AuthProvider: Password changed successfully");
      return { success: true };
    } catch (error: unknown) {
      console.error("AuthProvider: Change password error:", error);
      const message = error instanceof Error ? error.message : "Failed to change password. Please try again.";
      return { success: false, error: message };
    }
  }, [state.session]);

  const setCurrentOrganization = useCallback(async (organization: Organization | null, membership?: Membership | null) => {
    if (organization) {
      await setStoredValue(ORG_KEY, JSON.stringify(organization));
    } else {
      await removeStoredValue(ORG_KEY);
    }

    setState(prev => ({
      ...prev,
      currentOrganization: organization,
      currentMembership: membership || null,
    }));
  }, []);

  const setOrganizations = useCallback((orgs: (Organization & { role: OrganizationRole; joinedAt: string })[]) => {
    setState(prev => ({
      ...prev,
      organizations: orgs,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!state.session) return null;
    return state.session.access_token;
  }, [state.session]);

  const isAdmin = useMemo(() => {
    return state.user?.role === "admin" || state.user?.role === "super_admin";
  }, [state.user?.role]);

  const isSuperAdmin = useMemo(() => {
    return state.user?.role === "super_admin";
  }, [state.user?.role]);

  const isLeader = useMemo(() => {
    return state.user?.role === "leader" || isAdmin;
  }, [state.user?.role, isAdmin]);

  const isOrganizationAdmin = useMemo(() => {
    if (!state.currentMembership) return false;
    return state.currentMembership.role === "organization_admin" || state.currentMembership.role === "super_admin";
  }, [state.currentMembership]);

  const isOrganizationSuperAdmin = useMemo(() => {
    if (!state.currentMembership) return false;
    return state.currentMembership.role === "super_admin";
  }, [state.currentMembership]);

  const hasOrganization = useMemo(() => {
    return state.currentOrganization !== null;
  }, [state.currentOrganization]);

  return {
    user: state.user,
    token: state.session?.access_token || null,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    currentOrganization: state.currentOrganization,
    currentMembership: state.currentMembership,
    organizations: state.organizations,
    error: state.error,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    sendPasswordResetEmail,
    changePassword,
    getIdToken,
    setCurrentOrganization,
    setOrganizations,
    clearError,
    isAdmin,
    isSuperAdmin,
    isLeader,
    isOrganizationAdmin,
    isOrganizationSuperAdmin,
    hasOrganization,
  };
});
