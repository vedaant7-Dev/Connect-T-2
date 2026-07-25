import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useBroadcasts } from "@/context/BroadcastContext";
import BroadcastCenterMediaScreen from "@/screens/BroadcastCenterMediaScreen";

export default function BroadcastCenterWithProgress() {
  const { uploadProgress } = useBroadcasts();
  return (
    <View style={styles.root}>
      <BroadcastCenterMediaScreen />
      {uploadProgress !== null ? (
        <View style={styles.progressPanel} pointerEvents="none" accessibilityLiveRegion="polite">
          <View style={styles.progressTop}><Text style={styles.progressLabel}>Uploading broadcast media</Text><Text style={styles.progressValue}>{uploadProgress}%</Text></View>
          <View style={styles.track}><View style={[styles.fill, { width: `${uploadProgress}%` }]} /></View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressPanel: { position: "absolute", left: 14, right: 14, bottom: Platform.OS === "web" ? 18 : 26, borderRadius: 15, padding: 12, backgroundColor: "white", borderWidth: 1, borderColor: "#FED7AA", shadowColor: "#0F172A", shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  progressTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  progressLabel: { color: "#9A3412", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  progressValue: { color: "#EA580C", fontSize: 12, fontFamily: "Inter_700Bold" },
  track: { height: 7, borderRadius: 999, backgroundColor: "#FFEDD5", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999, backgroundColor: "#EA580C" },
});
