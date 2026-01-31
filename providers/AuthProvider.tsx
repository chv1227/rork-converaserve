import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import { setAuthToken } from "@/lib/trpc";
import { Organization, OrganizationRole } from "@/types";

export type UserRole = "member" | "leader" | "admin" | "super_admin";

const SUPER_ADMIN_EMAILS = [
  "chv1227@gmail.com",
  "coreytmoss@gmail.com",
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
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  currentOrganization: Organization | null;
  currentMembership: Membership | null;
  organizations: (Organization & { role: OrganizationRole; joinedAt: string })[];
  error: string | null;
}

const USER_KEY = "auth_user_v2";
const TOKEN_KEY = "auth_token_v2";
const ORG_KEY = "current_organization_v2";

async function fetchUserChurch(userId: string, token: string): Promise<Organization | null> {
  try {
    console.log("AuthProvider: Fetching user's active church...");
    const response = await fetch(`${process.env.EXPO_PUBLIC_RORK_API_BASE_URL || ''}/trpc/churches.getUserActiveChurch`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data?.result?.data?.church) {
        const church = data.result.data.church;
        console.log("AuthProvider: Found active church:", church.name);
        return {
          id: church.id,
          name: church.name,
          description: church.description || '',
          logo: church.logo,
          createdAt: church.createdAt,
          updatedAt: church.updatedAt,
        };
      }
    }
    
    console.log("AuthProvider: No active church found via API, trying organizations...");
    const orgResponse = await fetch(`${process.env.EXPO_PUBLIC_RORK_API_BASE_URL || ''}/trpc/organizations.getUserOrganizations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (orgResponse.ok) {
      const orgData = await orgResponse.json();
      if (orgData?.result?.data && orgData.result.data.length > 0) {
        const org = orgData.result.data[0];
        console.log("AuthProvider: Found organization:", org.name);
        return org;
      }
    }
    
    return null;
  } catch (error) {
    console.error("AuthProvider: Error fetching user church:", error);
    return null;
  }
}

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
    removeStoredValue(TOKEN_KEY),
    removeStoredValue(ORG_KEY),
  ]);
}

function createUserFromData(data: { id: string; email: string; name: string; avatar?: string; role?: string; phone?: string; createdAt?: string }): User {
  const now = new Date().toISOString();
  const userEmail = data.email?.toLowerCase() || "";
  const isSuperAdmin = SUPER_ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);
  
  return {
    id: data.id,
    email: data.email || "",
    name: data.name || data.email?.split("@")[0] || "User",
    avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || "User")}&background=1A7B74&color=fff`,
    role: isSuperAdmin ? "super_admin" : (data.role as UserRole) || "member",
    ministries: [],
    phone: data.phone,
    joinedDate: data.createdAt || now,
    isActive: true,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
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
      try {
        const [storedUser, storedToken, storedOrg] = await Promise.all([
          getStoredValue(USER_KEY),
          getStoredValue(TOKEN_KEY),
          getStoredValue(ORG_KEY),
        ]);

        if (!storedUser || !storedToken) {
          console.log("AuthProvider: No stored auth found");
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const user = JSON.parse(storedUser) as User;
        const cachedOrg = storedOrg ? JSON.parse(storedOrg) as Organization : null;

        const userEmail = (user.email || "").toLowerCase();
        const isSuperAdmin = SUPER_ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);
        if (isSuperAdmin && user.role !== "super_admin" && user.role !== "admin") {
          user.role = "super_admin";
        }

        setAuthToken(storedToken);

        let currentOrg = cachedOrg;
        if (!currentOrg && storedToken) {
          currentOrg = await fetchUserChurch(user.id, storedToken);
          if (currentOrg) {
            await setStoredValue(ORG_KEY, JSON.stringify(currentOrg));
          }
        }

        setState({
          user,
          token: storedToken,
          isAuthenticated: true,
          currentOrganization: currentOrg,
          currentMembership: null,
          organizations: [],
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("AuthProvider: Error loading stored auth", error);
        await clearAllAuthData();
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadStoredAuth();
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
      console.log("AuthProvider: Logging in...");
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_RORK_API_BASE_URL || ''}/trpc/auth.login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || data?.error) {
        const errorMessage = data?.error?.message || "Invalid email or password";
        return { success: false, error: errorMessage };
      }

      const result = data?.result?.data;
      if (!result?.user || !result?.token) {
        return { success: false, error: "Login failed. Please try again." };
      }

      const user = createUserFromData(result.user);
      const token = result.token;

      await setStoredValue(USER_KEY, JSON.stringify(user));
      await setStoredValue(TOKEN_KEY, token);
      
      setAuthToken(token);

      setState({
        user,
        token,
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
      console.log("AuthProvider: Registering...");
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_RORK_API_BASE_URL || ''}/trpc/auth.register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          name: name.trim(),
          phone: phone?.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || data?.error) {
        const errorMessage = data?.error?.message || "Registration failed. Please try again.";
        return { success: false, error: errorMessage };
      }

      const result = data?.result?.data;
      if (!result?.user || !result?.token) {
        return { success: false, error: "Registration failed. Please try again." };
      }

      const user = createUserFromData(result.user);
      const token = result.token;

      await setStoredValue(USER_KEY, JSON.stringify(user));
      await setStoredValue(TOKEN_KEY, token);
      
      setAuthToken(token);

      setState({
        user,
        token,
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
      console.log("AuthProvider: Sending password reset...");
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_RORK_API_BASE_URL || ''}/trpc/auth.requestPasswordReset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || data?.error) {
        const errorMessage = data?.error?.message || "Failed to send reset email";
        return { success: false, error: errorMessage };
      }

      return { success: true };
    } catch (error: unknown) {
      console.error("AuthProvider: Password reset error:", error);
      const message = error instanceof Error ? error.message : "Failed to send reset email. Please try again.";
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    console.log("AuthProvider: Logging out...");

    setAuthToken(null);
    await clearAllAuthData();

    setState({
      user: null,
      token: null,
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

    setState(prev => ({
      ...prev,
      user: updatedUser,
    }));
  }, [state.user]);

  const refreshUser = useCallback(async () => {
    if (!state.token) return;

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_RORK_API_BASE_URL || ''}/trpc/auth.me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.result?.data) {
          const updatedUser = createUserFromData(data.result.data);
          
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
        }
      }
    } catch (error) {
      console.error("AuthProvider: Failed to refresh user:", error);
    }
  }, [state.token, state.user]);

  const changePassword = useCallback(async (newPassword: string) => {
    if (!state.token) {
      return { success: false, error: "Not authenticated" };
    }

    if (newPassword.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }

    try {
      console.log("AuthProvider: Changing password...");
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_RORK_API_BASE_URL || ''}/trpc/auth.changePassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`,
        },
        body: JSON.stringify({
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || data?.error) {
        const errorMessage = data?.error?.message || "Failed to change password";
        return { success: false, error: errorMessage };
      }

      return { success: true };
    } catch (error: unknown) {
      console.error("AuthProvider: Change password error:", error);
      const message = error instanceof Error ? error.message : "Failed to change password. Please try again.";
      return { success: false, error: message };
    }
  }, [state.token]);

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
    return state.token;
  }, [state.token]);

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
    token: state.token,
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
