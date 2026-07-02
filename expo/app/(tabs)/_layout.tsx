import { Tabs } from "expo-router";
import { House, MessageCircle, Heart, UserPlus, Church } from "lucide-react-native";
import React from "react";
import { Platform, View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

import { useTheme } from "@/providers/ThemeProvider";

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarBackground: () => (
          <BlurView
            tint={isDark ? "dark" : "light"}
            intensity={80}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 4 : 6,
          height: Platform.OS === "ios" ? 64 : 58,
          backgroundColor: "transparent",
          overflow: "hidden",
          zIndex: 100,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
            },
            android: {
              elevation: 10,
            },
            web: {
              boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.08)",
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600" as const,
          marginTop: 0,
          width: 72,
          textAlign: "center",
          letterSpacing: -0.1,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },

      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? { alignItems: "center", justifyContent: "center" } : undefined}>
              <House size={focused ? size + 1 : size} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size, focused }) => (
            <MessageCircle size={focused ? size + 1 : size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="giving"
        options={{
          title: "Giving",
          tabBarIcon: ({ color, size, focused }) => (
            <Heart size={focused ? size + 1 : size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="signup"
        options={{
          title: "Join",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? { alignItems: "center", justifyContent: "center" } : undefined}>
              <UserPlus size={focused ? size + 1 : size} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="ministries"
        options={{
          title: "Ministries",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? { alignItems: "center", justifyContent: "center" } : undefined}>
              <Church size={focused ? size + 1 : size} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="groups" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
    </Tabs>
  );
}


