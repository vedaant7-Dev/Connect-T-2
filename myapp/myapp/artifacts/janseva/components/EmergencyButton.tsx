import React, { useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export function EmergencyButton() {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleSOS = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    Linking.openURL("tel:112");
  };

  return (
    <View style={styles.container}>
      <View style={styles.pulseOuter}>
        <View style={styles.pulseInner}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity onPress={handleSOS} style={styles.sosBtn} activeOpacity={0.9}>
              <Feather name="phone-call" size={32} color="white" />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
      <Text style={styles.hint}>Hold to call emergency services (112)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 8,
  },
  pulseOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(220, 38, 38, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  pulseInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  sosBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  sosText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginTop: 2,
  },
  hint: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 10,
    fontFamily: "Inter_400Regular",
  },
});
