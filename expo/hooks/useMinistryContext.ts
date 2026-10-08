import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { db, WorkspaceMinistry } from "@/lib/ministryWorkspace";

export interface MinistryContextData {
  ministry: WorkspaceMinistry;
  profileId: string | null;
  profileName: string | null;
  role: string | null;
}

/**
 * Loads the ministry plus the signed-in user's profile + membership for it.
 * Shared by every screen under /ministry/[id]/*.
 *
 * `isLeader` mirrors the database rule `cc_is_ministry_leader` closely enough for UI;
 * RLS remains the source of truth (writes from non-leaders fail with an error).
 */
export function useMinistryContext(ministryId?: string) {
  const { user, isAdmin, isSuperAdmin } = useAuth();

  const query = useQuery<MinistryContextData>({
    queryKey: ["ministry-context", ministryId, user?.id],
    enabled: !!ministryId && !!user?.id,
    queryFn: async () => {
      const { data: ministry, error } = await db
        .from("ministries")
        .select("id, church_id, name, color, ministry_type, template")
        .eq("id", ministryId)
        .single();
      if (error) throw error;

      const { data: profile } = await db
        .from("profiles")
        .select("id, display_name")
        .eq("user_id", user!.id)
        .eq("church_id", ministry.church_id)
        .maybeSingle();

      let role: string | null = null;
      if (profile?.id) {
        const { data: membership } = await db
          .from("ministry_members")
          .select("role, is_active")
          .eq("ministry_id", ministryId)
          .eq("profile_id", profile.id)
          .maybeSingle();
        if (membership && membership.is_active !== false) role = membership.role || "member";
      }

      return {
        ministry: ministry as WorkspaceMinistry,
        profileId: (profile?.id as string) ?? null,
        profileName: (profile?.display_name as string) ?? null,
        role,
      };
    },
  });

  const role = query.data?.role ?? null;
  const isLeader = !!(isAdmin || isSuperAdmin || role === "leader" || role === "admin");
  const isMember = !!role || isLeader;

  return {
    ...query,
    ministry: query.data?.ministry ?? null,
    churchId: query.data?.ministry.church_id ?? null,
    profileId: query.data?.profileId ?? null,
    profileName: query.data?.profileName ?? null,
    role,
    isLeader,
    isMember,
  };
}
