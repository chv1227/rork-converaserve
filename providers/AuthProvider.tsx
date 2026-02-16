import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import { supabase } from "@/lib/supabase";
import { Organization, OrganizationRole } from "@/types";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

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
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  currentOrganization: Organization | null;
  currentMembership: Membership | null;
  organizations: (Organization & { role: OrganizationRole; joinedAt: string })[];
  error: string | null;
}

const ORG_STORAGE_KEY = "current_organization_v3";

async function getStoredOrganization(): Promise<Organization | null> {
  try {
    if (Platform.OS === "web") {
      const stored = localStorage.getItem(ORG_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    }
    const SecureStore = await import("expo-secure-store");
    const stored = await SecureStore.getItemAsync(ORG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

async function setStoredOrganization(org: Organization | null): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (org) {
        localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(org));
      } else {
        localStorage.removeItem(ORG_STORAGE_KEY);
      }
      return;
    }
    const SecureStore = await import("expo-secure-store");
    if (org) {
      await SecureStore.setItemAsync(ORG_STORAGE_KEY, JSON.stringify(org));
    } else {
      await SecureStore.deleteItemAsync(ORG_STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to store organization:", error);
  }
}

function createUserFromSupabase(supabaseUser: SupabaseUser, profile?: { name?: string; avatar?: string; phone?: string; role?: string }): User {
  const now = new Date().toISOString();
  const userEmail = (supabaseUser.email || "").toLowerCase();
  const isSuperAdmin = SUPER_ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);
  const displayName = profile?.name || supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "User";

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    name: displayName,
    avatar: profile?.avatar || supabaseUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1A7B74&color=fff`,
    role: isSuperAdmin ? "super_admin" : (profile?.role as UserRole) || "member",
    ministries: [],
    phone: profile?.phone || supabaseUser.user_metadata?.phone,
    joinedDate: supabaseUser.created_at || now,
    isActive: true,
    createdAt: supabaseUser.created_at || now,
    updatedAt: now,
  };
}

function mapChurchRoleToOrgRole(dbRole: string): OrganizationRole {
  switch (dbRole) {
    case 'owner': return 'super_admin';
    case 'admin': return 'organization_admin';
    case 'pastor': return 'organization_admin';
    default: return 'member';
  }
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
  const initDoneRef = useRef(false);
  const manualOrgSetRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initializeAuth = async () => {
      try {
        console.log("AuthProvider: Initializing Supabase auth...");
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("AuthProvider: Error getting session:", error);
          setState(prev => ({ ...prev, isLoading: false }));
          initDoneRef.current = true;
          return;
        }

        if (session?.user) {
          console.log("AuthProvider: Found existing session for user:", session.user.id);
          
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          const user = createUserFromSupabase(session.user, profile || undefined);
          const storedOrg = await getStoredOrganization();
          console.log("AuthProvider: Stored org:", storedOrg?.id, storedOrg?.name);

          let currentOrg = storedOrg;
          let initMembership: Membership | null = null;

          if (currentOrg) {
            const { data: specificMembership } = await supabase
              .from('user_church_roles')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('church_id', currentOrg.id)
              .eq('is_active', true)
              .maybeSingle();

            if (specificMembership) {
              const sm = specificMembership as any;
              initMembership = {
                id: sm.id,
                organizationId: sm.church_id,
                role: mapChurchRoleToOrgRole(sm.role),
                joinedAt: sm.created_at,
              };
              console.log('AuthProvider: Loaded stored org membership role:', initMembership.role);
            } else {
              console.log('AuthProvider: No membership found for stored org, clearing...');
              currentOrg = null;
              await setStoredOrganization(null);
            }
          }

          if (!currentOrg) {
            const { data: initMembershipData } = await supabase
              .from('user_church_roles')
              .select('*, churches(*)')
              .eq('user_id', session.user.id)
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const membershipData = initMembershipData as any;
            if (membershipData?.churches) {
              const org = membershipData.churches as {
                id: string;
                name: string;
                description: string | null;
                logo_url: string | null;
                contact_email: string | null;
                contact_phone: string | null;
                website: string | null;
                address_line1: string | null;
                created_at: string;
                updated_at: string;
              };
              currentOrg = {
                id: org.id,
                name: org.name,
                description: org.description || '',
                logo: org.logo_url || undefined,
                email: org.contact_email || undefined,
                phone: org.contact_phone || undefined,
                website: org.website || undefined,
                address: org.address_line1 || undefined,
                createdAt: org.created_at,
                updatedAt: org.updated_at,
              };
              initMembership = {
                id: membershipData.id,
                organizationId: membershipData.church_id,
                role: mapChurchRoleToOrgRole(membershipData.role),
                joinedAt: membershipData.created_at,
              };
              await setStoredOrganization(currentOrg);
              console.log('AuthProvider: Auto-selected org:', currentOrg.name, 'role:', initMembership.role);
            }
          }

          console.log('AuthProvider: Init complete. Org:', currentOrg?.name || 'none', 'Membership:', initMembership?.role || 'none');

          setState({
            user,
            session,
            isLoading: false,
            isAuthenticated: true,
            currentOrganization: currentOrg,
            currentMembership: initMembership,
            organizations: [],
            error: null,
          });
        } else {
          console.log("AuthProvider: No session found");
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("AuthProvider: Init error:", error);
        setState(prev => ({ ...prev, isLoading: false }));
      } finally {
        initDoneRef.current = true;
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthProvider: Auth state changed:", event);

      if (event === 'SIGNED_OUT' || !session) {
        await setStoredOrganization(null);
        manualOrgSetRef.current = false;
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

      if (event === 'INITIAL_SESSION' && !initDoneRef.current) {
        console.log('AuthProvider: Skipping INITIAL_SESSION - init still running');
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        console.log('AuthProvider: Token refreshed, updating session only');
        if (session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          const user = createUserFromSupabase(session.user, profile || undefined);
          setState(prev => ({
            ...prev,
            user,
            session,
            isAuthenticated: true,
          }));
        }
        return;
      }

      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const user = createUserFromSupabase(session.user, profile || undefined);

        if (manualOrgSetRef.current) {
          console.log('AuthProvider: Org was manually set, preserving current org on auth change');
          manualOrgSetRef.current = false;
          setState(prev => ({
            ...prev,
            user,
            session,
            isLoading: false,
            isAuthenticated: true,
          }));
          return;
        }

        const storedOrg = await getStoredOrganization();
        let orgOnChange: Organization | null = storedOrg;
        let changeMembership: Membership | null = null;

        if (storedOrg) {
          const { data: storedMembership } = await supabase
            .from('user_church_roles')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('church_id', storedOrg.id)
            .eq('is_active', true)
            .maybeSingle();

          if (storedMembership) {
            const sm = storedMembership as any;
            changeMembership = {
              id: sm.id,
              organizationId: sm.church_id,
              role: mapChurchRoleToOrgRole(sm.role),
              joinedAt: sm.created_at,
            };
            console.log('AuthProvider: Auth change - using stored org:', storedOrg.name, 'role:', changeMembership.role);
          } else {
            orgOnChange = null;
          }
        }

        if (!orgOnChange) {
          const { data: membershipOnChange } = await supabase
            .from('user_church_roles')
            .select('*, churches(*)')
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (membershipOnChange) {
            const md = membershipOnChange as any;
            if (md?.churches) {
              const o = md.churches as { id: string; name: string; description: string | null; logo_url: string | null; contact_email: string | null; contact_phone: string | null; website: string | null; address_line1: string | null; created_at: string; updated_at: string };
              orgOnChange = {
                id: o.id,
                name: o.name,
                description: o.description || '',
                logo: o.logo_url || undefined,
                email: o.contact_email || undefined,
                phone: o.contact_phone || undefined,
                website: o.website || undefined,
                address: o.address_line1 || undefined,
                createdAt: o.created_at,
                updatedAt: o.updated_at,
              };
              await setStoredOrganization(orgOnChange);
            }
            changeMembership = {
              id: md.id,
              organizationId: md.church_id,
              role: mapChurchRoleToOrgRole(md.role),
              joinedAt: md.created_at,
            };
            console.log('AuthProvider: Auth change - auto-selected org:', orgOnChange?.name);
          }
        }

        setState(prev => ({
          ...prev,
          user,
          session,
          isLoading: false,
          isAuthenticated: true,
          currentOrganization: orgOnChange || prev.currentOrganization,
          currentMembership: changeMembership || prev.currentMembership,
        }));
      }
    });

    return () => {
      subscription.unsubscribe();
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
      console.log("AuthProvider: Logging in with Supabase...");
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        console.error("AuthProvider: Login error:", error);
        return { success: false, error: error.message };
      }

      if (!data.user || !data.session) {
        return { success: false, error: "Login failed. Please try again." };
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const user = createUserFromSupabase(data.user, profile || undefined);

      const { data: membership } = await supabase
        .from('user_church_roles')
        .select('*, churches(*)')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      let currentOrg: Organization | null = null;
      let loginMembership: Membership | null = null;
      const membershipData2 = membership as any;
      if (membershipData2?.churches) {
        const org = membershipData2.churches as {
          id: string;
          name: string;
          description: string | null;
          logo_url: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          website: string | null;
          address_line1: string | null;
          created_at: string;
          updated_at: string;
        };
        currentOrg = {
          id: org.id,
          name: org.name,
          description: org.description || '',
          logo: org.logo_url || undefined,
          email: org.contact_email || undefined,
          phone: org.contact_phone || undefined,
          website: org.website || undefined,
          address: org.address_line1 || undefined,
          createdAt: org.created_at,
          updatedAt: org.updated_at,
        };
        await setStoredOrganization(currentOrg);
      }
      if (membershipData2) {
        loginMembership = {
          id: membershipData2.id,
          organizationId: membershipData2.church_id,
          role: mapChurchRoleToOrgRole(membershipData2.role),
          joinedAt: membershipData2.created_at,
        };
        console.log('AuthProvider: Login membership role:', loginMembership.role, 'from DB role:', membershipData2.role);
      }

      setState({
        user,
        session: data.session,
        isLoading: false,
        isAuthenticated: true,
        currentOrganization: currentOrg,
        currentMembership: loginMembership,
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
      console.log("AuthProvider: Registering with Supabase...");
      
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            phone: phone?.trim(),
          },
        },
      });

      if (error) {
        console.error("AuthProvider: Registration error:", error);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: "Registration failed. Please try again." };
      }

      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: data.user.email || email.toLowerCase().trim(),
          full_name: name.trim(),
          phone: phone?.trim() || null,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=1A7B74&color=fff`,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);

      if (profileError) {
        console.error("AuthProvider: Profile creation error:", profileError.message || JSON.stringify(profileError));
      }

      if (data.session) {
        const user = createUserFromSupabase(data.user, { name: name.trim(), phone: phone?.trim() });

        setState({
          user,
          session: data.session,
          isLoading: false,
          isAuthenticated: true,
          currentOrganization: null,
          currentMembership: null,
          organizations: [],
          error: null,
        });
      }

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
      console.log("AuthProvider: Sending password reset with Supabase...");
      
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim());

      if (error) {
        return { success: false, error: error.message };
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

    await setStoredOrganization(null);
    await supabase.auth.signOut();

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
    if (!state.user || !state.session) return;

    try {
      const { error } = await (supabase
        .from('users') as any)
        .update({
          full_name: updates.name,
          avatar_url: updates.avatar,
          phone: updates.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', state.user.id);

      if (error) {
        console.error("AuthProvider: Update user error:", error);
        return;
      }

      const updatedUser = { ...state.user, ...updates };
      setState(prev => ({ ...prev, user: updatedUser }));
    } catch (error) {
      console.error("AuthProvider: Update user error:", error);
    }
  }, [state.user, state.session]);

  const refreshUser = useCallback(async () => {
    if (!state.session) return;

    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', state.session.user.id)
        .single();

      if (profile) {
        const updatedUser = createUserFromSupabase(state.session.user, profile);
        setState(prev => ({ ...prev, user: updatedUser, error: null }));
      }
    } catch (error) {
      console.error("AuthProvider: Failed to refresh user:", error);
    }
  }, [state.session]);

  const changePassword = useCallback(async (newPassword: string) => {
    if (!state.session) {
      return { success: false, error: "Not authenticated" };
    }

    if (newPassword.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }

    try {
      console.log("AuthProvider: Changing password with Supabase...");
      
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: unknown) {
      console.error("AuthProvider: Change password error:", error);
      const message = error instanceof Error ? error.message : "Failed to change password. Please try again.";
      return { success: false, error: message };
    }
  }, [state.session]);

  const setCurrentOrganization = useCallback(async (organization: Organization | null, membership?: Membership | null) => {
    console.log('AuthProvider: setCurrentOrganization called:', organization?.id, organization?.name, 'role:', membership?.role);
    manualOrgSetRef.current = !!organization;
    await setStoredOrganization(organization);

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
    return state.session?.access_token || null;
  }, [state.session]);

  const isAdmin = useMemo(() => {
    if (state.user?.role === "admin" || state.user?.role === "super_admin") return true;
    if (state.currentMembership?.role === "super_admin" || state.currentMembership?.role === "organization_admin") return true;
    return false;
  }, [state.user?.role, state.currentMembership?.role]);

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

  const refreshOrganizations = useCallback(async () => {
    if (!state.session?.user) return;

    try {
      console.log("AuthProvider: Refreshing organizations...");
      
      const { data: memberships, error } = await supabase
        .from('user_church_roles')
        .select('*, churches(*)')
        .eq('user_id', state.session.user.id)
        .eq('is_active', true);

      if (error) {
        console.error("AuthProvider: Error fetching organizations:", error);
        return;
      }

      const orgs = (memberships || []).map((m: any) => {
        const church = m.churches as {
          id: string;
          name: string;
          description: string | null;
          logo_url: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          website: string | null;
          address_line1: string | null;
          created_at: string;
          updated_at: string;
        };
        return {
          id: church.id,
          name: church.name,
          description: church.description || '',
          logo: church.logo_url || undefined,
          email: church.contact_email || undefined,
          phone: church.contact_phone || undefined,
          website: church.website || undefined,
          address: church.address_line1 || undefined,
          createdAt: church.created_at,
          updatedAt: church.updated_at,
          role: mapChurchRoleToOrgRole(m.role),
          joinedAt: m.created_at,
          membershipId: m.id,
        };
      });

      setState(prev => {
        const newState = { ...prev, organizations: orgs };

        if (!prev.currentOrganization && orgs.length > 0) {
          const firstOrg = orgs[0];
          newState.currentOrganization = {
            id: firstOrg.id,
            name: firstOrg.name,
            description: firstOrg.description,
            logo: firstOrg.logo,
            email: firstOrg.email,
            phone: firstOrg.phone,
            website: firstOrg.website,
            address: firstOrg.address,
            createdAt: firstOrg.createdAt,
            updatedAt: firstOrg.updatedAt,
          };
          newState.currentMembership = {
            id: firstOrg.membershipId || firstOrg.id,
            organizationId: firstOrg.id,
            role: firstOrg.role,
            joinedAt: firstOrg.joinedAt,
          };
          setStoredOrganization(newState.currentOrganization);
          console.log("AuthProvider: Auto-selected organization:", firstOrg.name);
        }

        return newState;
      });

      console.log("AuthProvider: Found", orgs.length, "organizations");
      return orgs;
    } catch (error) {
      console.error("AuthProvider: Failed to refresh organizations:", error);
    }
  }, [state.session?.user]);

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
    refreshOrganizations,
  };
});
