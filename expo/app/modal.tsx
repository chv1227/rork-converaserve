import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LightTheme } from '@/constants/colors';

export default function ModalScreen() {
  const params = useLocalSearchParams();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Details</Text>
      <Text style={styles.description}>
        This modal can be used to show detailed information about events, 
        announcements, or ministry details.
      </Text>
      
      {Object.keys(params).length > 0 && (
        <View style={styles.paramsContainer}>
          <Text style={styles.paramsTitle}>Parameters:</Text>
          {Object.entries(params).map(([key, value]) => (
            <Text key={key} style={styles.paramItem}>
              {key}: {String(value)}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightTheme.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: LightTheme.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: LightTheme.textSecondary,
    lineHeight: 24,
  },
  paramsContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: LightTheme.surface,
    borderRadius: 12,
  },
  paramsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: LightTheme.text,
    marginBottom: 8,
  },
  paramItem: {
    fontSize: 14,
    color: LightTheme.textSecondary,
    marginTop: 4,
  },
});
