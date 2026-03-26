import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/lib/trpc";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, ReactNode, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet, Text, Platform } from "react-native";

import Colors from "@/constants/colors";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { DataProvider } from "@/providers/DataProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { NotificationsProvider } from "@/providers/NotificationsProvider";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function AuthGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, emailVerified } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (isLoading || isNavigating) return;

    const inAuthGroup = segments[0] === "login" as string || segments[0] === "register" as string;
    const inOrganizationGroup = segments[0] === "organization" as string;
    const inVerifyEmail = segments[0] === "verify-email" as string;

    if (!isAuthenticated && !inAuthGroup && !inOrganizationGroup) {
      setIsNavigating(true);
      setTimeout(() => {
        router.replace("/login" as any);
        setIsNavigating(false);
      }, 100);
    } else if (isAuthenticated && !emailVerified && !inVerifyEmail && !inAuthGroup) {
      setIsNavigating(true);
      setTimeout(() => {
        router.replace("/verify-email" as any);
        setIsNavigating(false);
      }, 100);
    } else if (isAuthenticated && emailVerified && (segments[0] === "login" as string || inVerifyEmail)) {
      setIsNavigating(true);
      setTimeout(() => {
        router.replace("/(tabs)");
        setIsNavigating(false);
      }, 100);
    }
  }, [isLoading, isAuthenticated, emailVerified, segments, router, isNavigating]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  const { colors } = useTheme();
  
  return (
    <Stack screenOptions={{ 
        headerBackTitle: "Back",
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="login" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="register" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="verify-email" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="modal" 
        options={{ 
          presentation: "modal",
          headerShown: true,
          headerTitle: "Details",
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.textSecondary,
        }} 
      />
      <Stack.Screen 
        name="settings" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
      <Stack.Screen 
        name="group/[id]" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      <Stack.Screen 
        name="announcements/index" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />

      <Stack.Screen 
        name="chat/[id]" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
      <Stack.Screen 
        name="church-management" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
      <Stack.Screen 
        name="admin/ministries" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
      <Stack.Screen 
        name="admin/index" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
      <Stack.Screen 
        name="admin/users" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
      <Stack.Screen 
        name="admin/groups" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
      <Stack.Screen 
        name="admin/moderation" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
      <Stack.Screen 
        name="admin/create-church" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
      <Stack.Screen 
        name="edit-profile" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />

      <Stack.Screen 
        name="admin/requests" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
      <Stack.Screen 
        name="organization/index" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
      <Stack.Screen 
        name="organization/create" 
        options={{ 
          headerShown: false,
          presentation: "modal",
        }} 
      />
      <Stack.Screen 
        name="organization/join" 
        options={{ 
          headerShown: false,
          presentation: "modal",
        }} 
      />
      <Stack.Screen 
        name="organization/edit" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
      <Stack.Screen 
        name="organization/admin" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
      <Stack.Screen 
        name="churches/index" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
      <Stack.Screen 
        name="church/[id]/settings" 
        options={{ 
          headerShown: false,
          presentation: "card",
        }} 
      />
    </Stack>
  );
}

function AppContent() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationsProvider>
          <DataProvider>
            <AuthGate>
              <ThemedStatusBar />
              <RootLayoutNav />
            </AuthGate>
          </DataProvider>
        </NotificationsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function RootLayout() {
  useEffect(() => {
    const hideSplash = async () => {
      try {
        if (Platform.OS !== 'web') {
          await SplashScreen.hideAsync();
        }
      } catch {
        // Splash screen hide error can be safely ignored
      }
    };
    void hideSplash();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <AppContent />
          </QueryClientProvider>
        </trpc.Provider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
