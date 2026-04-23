import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

interface QuickService {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

interface QuickServiceGridProps {
  services: QuickService[];
  onPress: (id: string) => void;
}

export function QuickServiceGrid({ services, onPress }: QuickServiceGridProps) {
  const handlePress = (id: string) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    onPress(id);
  };

  return (
    <View style={styles.grid}>
      {services.map((svc) => (
        <TouchableOpacity
          key={svc.id}
          style={styles.item}
          onPress={() => handlePress(svc.id)}
          activeOpacity={0.8}
        >
          <View style={[styles.iconBox, { backgroundColor: svc.bg }]}>
            <Feather name={svc.icon as any} size={22} color={svc.color} />
          </View>
          <Text style={styles.label}>{svc.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  item: {
    width: "48%",
    alignItems: "center",
    gap: 6,
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
  },
});
