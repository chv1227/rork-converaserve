import React from "react";
import { TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";

interface BackButtonProps {
  onPress?: () => void;
  color?: string;
  size?: number;
  style?: ViewStyle;
  testID?: string;
}

export default function BackButton({
  onPress,
  color,
  size = 24,
  style,
  testID = "back-button",
}: BackButtonProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const resolvedColor = color ?? colors.text;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      activeOpacity={0.7}
      testID={testID}
    >
      <ArrowLeft size={size} color={resolvedColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
