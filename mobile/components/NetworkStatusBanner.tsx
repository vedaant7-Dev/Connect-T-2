import React, { useEffect, useState } from "react";
import { AppState, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import {
  getNetworkState,
  NetworkState,
  probeNetwork,
  subscribeNetworkState,
} from "@/lib/networkStatus";

export default function NetworkStatusBanner() {
  const [network, setNetwork] = useState<NetworkState>(getNetworkState());
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeNetworkState(setNetwork);
    void probeNetwork();
    const timer = setInterval(() => void probeNetwork(), 15_000);
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void probeNetwork();
    });
    return () => {
      unsubscribe();
      clearInterval(timer);
      appState.remove();
    };
  }, []);

  if (network.quality === "online" || network.quality === "checking") return null;

  const offline = network.quality === "offline";
  const retry = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await probeNetwork(10_000);
    } finally {
      setChecking(false);
    }
  };

  return (
    <View
      style={[styles.banner, offline ? styles.offline : styles.slow]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Feather name={offline ? "wifi-off" : "wifi"} size={15} color="white" />
      <View style={styles.copy}>
        <Text style={styles.title}>{offline ? "Internet connection lost" : "Weak internet connection"}</Text>
        <Text style={styles.subtitle}>
          {offline ? "Reconnect to continue using online services." : "Uploads and OTP may take longer. Keep the app open."}
        </Text>
      </View>
      <TouchableOpacity onPress={retry} disabled={checking} style={styles.retry} accessibilityRole="button">
        <Text style={styles.retryText}>{checking ? "Checking…" : "Retry"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: Platform.OS === "web" ? 8 : 4,
    left: 10,
    right: 10,
    zIndex: 10000,
    elevation: 30,
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  offline: { backgroundColor: "#B91C1C" },
  slow: { backgroundColor: "#B45309" },
  copy: { flex: 1 },
  title: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" },
  subtitle: { color: "rgba(255,255,255,0.9)", fontSize: 10.5, fontFamily: "Inter_400Regular", marginTop: 1 },
  retry: { minHeight: 34, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)" },
  retryText: { color: "white", fontSize: 11.5, fontFamily: "Inter_700Bold" },
});
