import { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import EventCard from "@/components/EventCard";

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { currentOrganization } = useAuth();
  const { events, isLoading, isRefreshing, refresh } = useData();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    console.log("Refreshing calendar...");
    setLocalRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.log("Refresh error:", error);
    } finally {
      setLocalRefreshing(false);
    }
  }, [refresh]);

  const currentMonth = selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const daysInMonth = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(i);
    }

    return days;
  }, [selectedDate]);

  const eventsOnDate = useMemo(() => {
    const dateStr = selectedDate.toISOString().split("T")[0];
    return events.filter((e) => e.date === dateStr);
  }, [events, selectedDate]);

  const hasEventsOnDay = useCallback(
    (day: number) => {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const dateStr = new Date(year, month, day).toISOString().split("T")[0];
      return events.some((e) => e.date === dateStr);
    },
    [events, selectedDate]
  );

  const changeMonth = (delta: number) => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + delta);
      return newDate;
    });
  };

  const selectDay = (day: number) => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(day);
      return newDate;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => day === selectedDate.getDate();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Calendar</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={localRefreshing || isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {isLoading && events.length === 0 && currentOrganization && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        <View style={styles.calendarCard}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navButton}>
              <ChevronLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{currentMonth}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navButton}>
              <ChevronRight size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekDays}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <Text key={day} style={styles.weekDay}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {daysInMonth.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  day && isSelected(day) && styles.selectedDay,
                  day && isToday(day) && !isSelected(day) && styles.todayDay,
                ]}
                onPress={() => day && selectDay(day)}
                disabled={!day}
              >
                {day && (
                  <>
                    <Text
                      style={[
                        styles.dayText,
                        isSelected(day) && styles.selectedDayText,
                        isToday(day) && !isSelected(day) && styles.todayDayText,
                      ]}
                    >
                      {day}
                    </Text>
                    {hasEventsOnDay(day) && (
                      <View
                        style={[styles.eventDot, isSelected(day) && styles.selectedEventDot]}
                      />
                    )}
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>
            Events on {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </Text>
          {eventsOnDate.length > 0 ? (
            eventsOnDate.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => console.log("Event pressed:", event.id)}
              />
            ))
          ) : (
            <View style={styles.noEvents}>
              <Text style={styles.noEventsText}>No events scheduled for this day</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  calendarCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  weekDays: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textTertiary,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  dayText: {
    fontSize: 14,
    color: Colors.text,
  },
  selectedDay: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  selectedDayText: {
    color: Colors.textInverse,
    fontWeight: "600" as const,
  },
  todayDay: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 20,
  },
  todayDayText: {
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
  selectedEventDot: {
    backgroundColor: Colors.textInverse,
  },
  eventsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noEvents: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  noEventsText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  setupBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  setupBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  setupBannerText: {
    flex: 1,
  },
  setupBannerTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  setupBannerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
});
