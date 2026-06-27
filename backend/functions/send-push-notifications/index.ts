// Supabase Edge Function: Process push notification queue
// Reads pending items from push_notification_queue, looks up Expo push tokens,
// and sends via Expo Push API (https://exp.host/--/api/v2/push/send)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PushQueueItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

Deno.serve(async (_req) => {
  try {
    // Fetch up to 100 pending notifications
    const { data: queueItems, error: queueError } = await supabase
      .from("push_notification_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(100);

    if (queueError) {
      console.error("Failed to fetch queue:", queueError);
      return new Response(JSON.stringify({ error: queueError.message }), { status: 500 });
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No pending notifications" }));
    }

    const items = queueItems as PushQueueItem[];
    const results = { sent: 0, failed: 0, total: items.length };

    // Group by user_id to batch token lookups
    const userIds = [...new Set(items.map((i) => i.user_id))];

    const { data: tokens, error: tokenError } = await supabase
      .from("user_push_tokens")
      .select("user_id, token")
      .in("user_id", userIds)
      .eq("is_active", true);

    if (tokenError) {
      console.error("Failed to fetch tokens:", tokenError);
      return new Response(JSON.stringify({ error: tokenError.message }), { status: 500 });
    }

    const tokenMap = new Map<string, string[]>();
    for (const t of tokens ?? []) {
      const existing = tokenMap.get(t.user_id) ?? [];
      existing.push(t.token);
      tokenMap.set(t.user_id, existing);
    }

    // Send push notifications in batches of 100 (Expo limit)
    const expoMessages: Array<{ to: string; title: string; body: string; data: Record<string, unknown> }> = [];
    const itemIdsToMark: string[] = [];

    for (const item of items) {
      const userTokens = tokenMap.get(item.user_id);
      if (!userTokens || userTokens.length === 0) {
        // No tokens for this user — mark as processed
        itemIdsToMark.push(item.id);
        continue;
      }

      for (const token of userTokens) {
        expoMessages.push({
          to: token,
          title: item.title,
          body: item.body,
          data: { ...item.data, notification_id: item.id },
        });
      }
      itemIdsToMark.push(item.id);
    }

    // Send in chunks of 100
    for (let i = 0; i < expoMessages.length; i += 100) {
      const chunk = expoMessages.slice(i, i + 100);
      try {
        const res = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(chunk),
        });

        const resBody = await res.json();
        console.log(`Expo push batch ${i / 100 + 1}:`, JSON.stringify(resBody).slice(0, 200));
      } catch (err) {
        console.error("Expo push error:", err);
        results.failed += chunk.length;
      }
    }

    // Mark queue items as processed
    const { error: updateError } = await supabase
      .from("push_notification_queue")
      .update({ status: "sent", processed_at: new Date().toISOString() })
      .in("id", itemIdsToMark);

    if (updateError) {
      console.error("Failed to mark items as sent:", updateError);
    }

    results.sent = itemIdsToMark.length;

    return new Response(JSON.stringify(results));
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
