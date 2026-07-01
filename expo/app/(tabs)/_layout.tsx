import { Tabs } from "expo-router";
import { House, MessageCircle, Heart, UserPlus, Church } from "lucide-react-native";
import React from "react";
import { Platform, View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

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
          bottom: Platform.OS === "ios" ? 20 : 10,
          left: 16,
          right: 16,
          borderRadius: 28,
          borderTopWidth: 0,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 6 : 10,
          height: Platform.OS === "ios" ? 82 : 70,
          backgroundColor: Platform.OS === "ios" ? "rgba(255, 255, 255, 0.88)" : "rgba(255, 255, 255, 0.95)",
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.10,
              shadowRadius: 24,
            },
            android: {
              elevation: 10,
            },
            web: {
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
            },
          }),
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              tint="light"
              intensity={85}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { borderRadius: 28, backgroundColor: "rgba(255,255,255,0.95)" }]} />
          ),
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700" as const,
          marginTop: 1,
          letterSpacing: 0.2,
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
          title: "Get Involved",
          tabBarIcon: ({ focused }) => (
            <View style={styles.centerTabButton}>
              <LinearGradient
                colors={["#1A7B74", "#0E5E58", "#084D47"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[
                  styles.centerTabGradient,
                  focused && styles.centerTabFocused,
                ]}
              >
                <UserPlus size={26} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
            </View>
          ),
          tabBarLabel: () => null,
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
      <Tabs.Screen name="more" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerTabButton: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Platform.OS === "ios" ? 0 : -4,
  },
  centerTabGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0E5E58",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  centerTabFocused: {
    transform: [{ scale: 1.08 }],
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
});
