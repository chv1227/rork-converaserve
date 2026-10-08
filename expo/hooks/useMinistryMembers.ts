import { useQuery } from "@tanstack/react-query";
import { db, displayName } from "@/lib/ministryWorkspace";

export interface RosterMember {
  id: string;
  role: string | null;
  joined_at: string | null;
  profile_id: string;
  profiles: { id: string; display_name: string | null; avatar_url: string | null } | null;
}

/** Active members of a ministry with their profile. Shared cache key with the roster screen. */
export function useMinistryMembers(ministryId?: string) {
  const query = useQuery<RosterMember[]>({
    queryKey: ["ministry-roster", ministryId],
    enabled: !!ministryId,
    queryFn: async () => {
      const { data, error } = await db
        .from("ministry_members")
        .select("id, role, joined_at, profile_id, profiles(id, display_name, avatar_url)")
        .eq("ministry_id", ministryId)
        .eq("is_active", true);
      if (error) throw error;
      return (data || []) as unknown as RosterMember[];
    },
  });

  const nameFor = (profileId: string | null | undefined): string => {
    if (!profileId) return "Unassigned";
    const m = (query.data || []).find((x) => x.profile_id === profileId);
    return m ? displayName(m.profiles) : "Former member";
  };

  return { ...query, members: query.data || [], nameFor };
}
