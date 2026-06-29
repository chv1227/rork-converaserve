import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  FlatList,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  MessageCircleHeart,
  HeartHandshake,
  Church,
  ArrowRight,
  ChevronRight,
} from "lucide-react-native";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    icon: MessageCircleHeart,
    title: "Stay Connected",
    description:
      "Connect with your church community through real-time messaging, group chats, and announcements that keep everyone in the loop.",
    gradient: ["#1B365D", "#1E4A6E"],
  },
  {
    id: "2",
    icon: HeartHandshake,
    title: "Give Easily",
    description:
      "Support your church with secure, one-tap giving. Track your donations and manage recurring gifts all in one place.",
    gradient: ["#1E4A6E", "#2E5A8A"],
  },
  {
    id: "3",
    icon: Church,
    title: "Join Ministries",
    description:
      "Discover and join ministries that match your gifts. Serve alongside your community and grow in faith together.",
    gradient: ["#2E5A8A", "#1B365D"],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      try {
        if (Platform.OS !== "web") {
          const SecureStore = await import("expo-secure-store");
          await SecureStore.setItemAsync("onboarding_complete_v1", "true");
        } else {
          localStorage.setItem("onboarding_complete_v1", "true");
        }
      } catch { /* proceed anyway */ }
      router.replace("/(tabs)");
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderSlide = ({ item }: { item: (typeof slides)[0] }) => {
    const IconComponent = item.icon;

    return (
      <View style={styles.slide}>
        <LinearGradient
          colors={["#0F2440", "#1B365D", "#1E4A6E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.slideGradient}
        >
          <View style={styles.slideContent}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={["rgba(200,148,62,0.3)", "rgba(212,168,67,0.15)"]}
                style={styles.iconGlow}
              >
                <IconComponent size={64} color="#D4A843" strokeWidth={1.5} />
              </LinearGradient>
            </View>

            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideDescription}>{item.description}</Text>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(item) => item.id}
        scrollEventThrottle={16}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => {
            const inputRange = [
              (index - 1) * SCREEN_WIDTH,
              index * SCREEN_WIDTH,
              (index + 1) * SCREEN_WIDTH,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: "clamp",
            });

            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: Colors.secondary,
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.footerRow}>
          {currentIndex < slides.length - 1 ? (
            <>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => {
                  void (async () => {
                    try {
                      if (Platform.OS !== "web") {
                        const SecureStore = await import("expo-secure-store");
                        await SecureStore.setItemAsync("onboarding_complete_v1", "true");
                      } else {
                        localStorage.setItem("onboarding_complete_v1", "true");
                      }
                    } catch { /* proceed anyway */ }
                    router.replace("/(tabs)");
                  })();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.secondary, Colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextButtonGradient}
                >
                  <ChevronRight size={22} color="#1B365D" />
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.secondary, Colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.getStartedGradient}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
                <ArrowRight size={20} color="#1B365D" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F2440",
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  slideGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  slideContent: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 160,
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.2)",
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  slideDescription: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "500" as const,
  },
  nextButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#D4A843",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  nextButtonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  getStartedButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#D4A843",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  getStartedGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#1B365D",
  },
});
