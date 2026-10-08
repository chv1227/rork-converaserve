import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/ministryWorkspace";

export type PlanTier = "basic" | "standard" | "pro";

export const PLAN_RANK: Record<PlanTier, number> = { basic: 1, standard: 2, pro: 3 };

export const PLAN_LABEL: Record<PlanTier, string> = { basic: "Basic", standard: "Standard", pro: "Pro" };

/**
 * Plan check used by the ministry workspace.
 *
 * Access is granted when EITHER
 *   1. the signed-in user's own subscription allows it (`useSubscription().hasAccess`), OR
 *   2. the church the ministry belongs to has an active plan high enough
 *      (server-side `cc_has_plan(church_id, tier)` against `church_subscriptions`).
 *
 * (2) matters because members of a paying church do not have personal subscriptions,
 * so a user-only check would lock every tool for them.
 */
export function usePlanAccess(churchId?: string | null) {
  const { hasAccess, loading: subLoading, plan: userPlan } = useSubscription();
  const { user, currentOrganization } = useAuth();
  const cid = churchId || currentOrganization?.id || null;

  const churchPlanQuery = useQuery<number>({
    queryKey: ["church-plan-rank", cid],
    enabled: !!cid && !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      if (!cid) return 0;
      const tiers: PlanTier[] = ["pro", "standard", "basic"];
      const results = await Promise.all(
        tiers.map(async (tier) => {
          const { data, error } = await db.rpc("cc_has_plan", { cid, min_tier: tier });
          if (error) return false;
          return data === true;
        })
      );
      const idx = results.findIndex(Boolean);
      return idx === -1 ? 0 : PLAN_RANK[tiers[idx]];
    },
  });

  const churchRank = churchPlanQuery.data ?? 0;

  const canUse = useCallback(
    (minPlan: PlanTier | null | undefined): boolean => {
      if (!minPlan) return true;
      if (hasAccess(minPlan)) return true;
      return churchRank >= PLAN_RANK[minPlan];
    },
    [hasAccess, churchRank]
  );

  // useSubscription only resolves `loading` once a user exists.
  const loading = (!!user && subLoading) || (!!cid && !!user?.id && churchPlanQuery.isLoading);

  const churchPlan: PlanTier | null = useMemo(() => {
    if (churchRank >= 3) return "pro";
    if (churchRank === 2) return "standard";
    if (churchRank === 1) return "basic";
    return null;
  }, [churchRank]);

  return { canUse, loading, userPlan, churchPlan };
}
