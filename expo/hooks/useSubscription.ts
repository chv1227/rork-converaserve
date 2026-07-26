import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

const PLAN_MAP: Record<string, string> = {
  price_1ToEqUG9IwA8EsALFTDhBe0P: "basic",
  price_1ToEpZG9IwA8EsALtxk2Brsx: "standard",
  price_1TxJT5G9IwA8EsALs98IomDV: "standard",
  price_1ToEqkG9IwA8EsAL37fvjEuo: "pro",
  price_1TxJT6G9IwA8EsALstGzcgTU: "pro",
};

const PLAN_RANK: Record<string, number> = {
  basic: 1,
  standard: 2,
  pro: 3,
};

export function useSubscription() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<"basic" | "standard" | "pro" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchSubscription = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("price_id, status")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setPlan((PLAN_MAP[data.price_id] as any) ?? null);
        setStatus(data.status);
      }

      setLoading(false);
    };

    fetchSubscription();

    const channel = supabase
      .channel("subscription-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const updated = payload.new;
          setPlan((PLAN_MAP[updated.price_id] as any) ?? null);
          setStatus(updated.status);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const hasAccess = (requiredPlan: "basic" | "standard" | "pro") => {
    if (!plan || status !== "active") return false;
    return PLAN_RANK[plan] >= PLAN_RANK[requiredPlan];
  };

  const isActive = status === "active";

  return { plan, status, loading, hasAccess, isActive };
}
