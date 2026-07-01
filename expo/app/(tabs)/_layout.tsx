import { Tabs } from "expo-router";
import { House, MessageCircle, Heart, UserPlus, Church } from "lucide-react-native";
import React from "react";
import { Platform, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderTopWidth: 1,
          borderTopColor: "rgba(0,0,0,0.06)",
          paddingTop: 4,
          paddingBottom: Platform.OS === "ios" ? 4 : 6,
          height: Platform.OS === "ios" ? 62 : 56,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          zIndex: 100,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
            web: {
              boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.05)",
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: "600" as const,
          marginTop: 0,
          width: 74,
          textAlign: "center",
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


