import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

export function useCheckout() {
  const { user } = useAuth();

  const startCheckout = async (
    plan: "basic" | "standard" | "pro",
    billing: "monthly" | "annual"
  ) => {
    if (plan === "basic" && billing === "annual") return;

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        plan,
        billing,
        userId: user?.id,
        email: user?.email,
      },
    });

    if (error || !data?.url) {
      console.error("Checkout error:", error);
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      "rork-app://checkout"
    );

    return result;
  };

  return { startCheckout };
}
