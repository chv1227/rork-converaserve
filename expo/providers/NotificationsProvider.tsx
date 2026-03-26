import { useEffect, useRef, useCallback, useMemo } from "react";
import { Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

interface NotificationContent {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

async function getNotifications() {
  if (Platform.OS === "web") return null;
  return await import("expo-notifications");
}

export const [NotificationsProvider, useNotifications] = createContextHook(() => {
  const { user } = useAuth();
  const listenerRef = useRef<any>(null);
  const responseListenerRef = useRef<any>(null);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    try {
      const N = await getNotifications();
      if (!N) return false;
      const { status: existing } = await N.getPermissionsAsync();
      if (existing === "granted") return true;
      const { status } = await N.requestPermissionsAsync();
      console.log("NotificationsProvider: Permission status:", status);
      return status === "granted";
    } catch (err) {
      console.error("NotificationsProvider: requestPermissions error:", err);
      return false;
    }
  }, []);

  const registerPushToken = useCallback(async (userId: string) => {
    if (Platform.OS === "web") return;
    try {
      const N = await getNotifications();
      if (!N) return;
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      if (!projectId) {
        console.warn("NotificationsProvider: No EXPO_PUBLIC_PROJECT_ID set");
        return;
      }
      const tokenData = await N.getExpoPushTokenAsync({ projectId });
      console.log("NotificationsProvider: Expo push token obtained");
      await (supabase as any)
        .from("user_push_tokens")
        .upsert({
          user_id: userId,
          token: tokenData.data,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        });
      console.log("NotificationsProvider: Push token stored for user:", userId);
    } catch (err) {
      console.error("NotificationsProvider: registerPushToken error:", err);
    }
  }, []);

  const scheduleLocal = useCallback(async (content: NotificationContent, delaySecs = 1) => {
    if (Platform.OS === "web") return;
    try {
      const N = await getNotifications();
      if (!N) return;
      await N.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data ?? {},
          sound: true,
        },
        trigger: delaySecs <= 0 ? null : ({ seconds: delaySecs } as any),
      });
      console.log("NotificationsProvider: Scheduled local notification:", content.title);
    } catch (err) {
      console.error("NotificationsProvider: scheduleLocal error:", err);
    }
  }, []);

  const notifyAnnouncement = useCallback(
    (title: string, body: string) =>
      scheduleLocal({ title: `📢 ${title}`, body, data: { type: "announcement" } }),
    [scheduleLocal]
  );

  const notifyMessage = useCallback(
    (senderName: string, preview: string) =>
      scheduleLocal({
        title: `💬 ${senderName}`,
        body: preview,
        data: { type: "message" },
      }),
    [scheduleLocal]
  );

  const notifyEvent = useCallback(
    (eventTitle: string, description: string) =>
      scheduleLocal({
        title: `📅 ${eventTitle}`,
        body: description,
        data: { type: "event" },
      }),
    [scheduleLocal]
  );

  const notifyPrayerRequest = useCallback(
    (requesterName: string, preview: string) =>
      scheduleLocal({
        title: `🙏 Prayer Request from ${requesterName}`,
        body: preview,
        data: { type: "prayer" },
      }),
    [scheduleLocal]
  );

  useEffect(() => {
    if (Platform.OS === "web") return;

    let mounted = true;
    let cleanupFns: (() => void)[] = [];

    const setup = async () => {
      const N = await getNotifications();
      if (!N || !mounted) return;

      N.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      if (user?.id) {
        const granted = await requestPermissions();
        if (granted && mounted) {
          await registerPushToken(user.id);
        }
      }

      const sub1 = N.addNotificationReceivedListener((notification) => {
        console.log(
          "NotificationsProvider: Notification received:",
          notification.request.content.title
        );
      });

      const sub2 = N.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("NotificationsProvider: Notification tapped, type:", data?.type);
      });

      listenerRef.current = sub1;
      responseListenerRef.current = sub2;

      cleanupFns.push(() => sub1.remove(), () => sub2.remove());
    };

    void setup();

    return () => {
      mounted = false;
      cleanupFns.forEach((fn) => fn());
    };
  }, [user?.id, requestPermissions, registerPushToken]);

  return useMemo(() => ({
    requestPermissions,
    scheduleLocal,
    notifyAnnouncement,
    notifyMessage,
    notifyEvent,
    notifyPrayerRequest,
  }), [requestPermissions, scheduleLocal, notifyAnnouncement, notifyMessage, notifyEvent, notifyPrayerRequest]);
});
