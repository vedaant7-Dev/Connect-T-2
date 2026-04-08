import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface UtilityCardProps {
  title: string;
  value: string;
  unit: string;
  status: string;
  statusOk: boolean;
  icon: string;
  gradColors: readonly [string, string];
  lastUpdated: string;
  onPress?: () => void;
}

export function UtilityCard({
  title,
  value,
  unit,
  status,
  statusOk,
  icon,
  gradColors,
  lastUpdated,
  onPress,
}: UtilityCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.wrapper}>
      <LinearGradient
        colors={gradColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <Feather name={icon as any} size={20} color="white" />
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusOk ? "rgba(255,255,255,0.25)" : "rgba(254,226,226,0.4)" }]}>
            <View style={[styles.statusDot, { backgroundColor: statusOk ? "#4ADE80" : "#FCA5A5" }]} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>
        <Text style={styles.value}>{value}<Text style={styles.unit}> {unit}</Text></Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.updated}>Updated {lastUpdated}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  card: {
    borderRadius: 18,
    padding: 14,
    minHeight: 130,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "white",
    fontFamily: "Inter_600SemiBold",
  },
  value: {
    fontSize: 26,
    fontWeight: "900",
    color: "white",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 13,
    fontWeight: "500",
  },
  title: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  updated: {
    fontSize: 9,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
});
