import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
  },
  action: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
    fontFamily: "Inter_700Bold",
  },
});
