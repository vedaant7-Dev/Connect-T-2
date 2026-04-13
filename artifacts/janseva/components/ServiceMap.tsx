import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";

interface ServiceMapProps {
  address: string;
  name: string;
  color: string;
  bgColor: string;
}

export function ServiceMap({ address, name, color, bgColor }: ServiceMapProps) {
  const query = encodeURIComponent(address + ", Ambernath, Maharashtra");
  const embedUrl = `https://maps.google.com/maps?q=${query}&output=embed`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  const handleOpenMaps = () => Linking.openURL(mapsUrl);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={[styles.mapIcon, { backgroundColor: bgColor }]}>
          <Feather name="map" size={15} color={color} />
        </View>
        <Text style={styles.title}>Location</Text>
        <TouchableOpacity style={[styles.openBtn, { backgroundColor: bgColor }]} onPress={handleOpenMaps} activeOpacity={0.8}>
          <Feather name="external-link" size={12} color={color} />
          <Text style={[styles.openBtnText, { color }]}>Open in Maps</Text>
        </TouchableOpacity>
      </View>

      {Platform.OS === "web" ? (
        <View style={styles.mapFrame}>
          {React.createElement("iframe", {
            src: embedUrl,
            width: "100%",
            height: "220",
            style: { border: "none", borderRadius: 12, display: "block" },
            loading: "lazy",
            referrerpolicy: "no-referrer-when-downgrade",
            title: name,
          })}
        </View>
      ) : (
        <TouchableOpacity style={[styles.nativeCard, { borderColor: bgColor }]} onPress={handleOpenMaps} activeOpacity={0.85}>
          <View style={[styles.nativeIconWrap, { backgroundColor: bgColor }]}>
            <Feather name="map-pin" size={28} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nativeName} numberOfLines={1}>{name}</Text>
            <Text style={styles.nativeAddress} numberOfLines={2}>{address}</Text>
          </View>
          <View style={[styles.nativeArrow, { backgroundColor: bgColor }]}>
            <Feather name="chevron-right" size={18} color={color} />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.addressFooter}>
        <Feather name="map-pin" size={11} color="#94A3B8" />
        <Text style={styles.addressFooterText} numberOfLines={2}>{address}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  mapIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  openBtnText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
  },
  mapFrame: {
    borderRadius: 12,
    overflow: "hidden",
    height: 220,
    backgroundColor: "#F1F5F9",
  },
  nativeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 4,
  },
  nativeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  nativeName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    marginBottom: 3,
  },
  nativeAddress: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  nativeArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addressFooter: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  addressFooterText: {
    flex: 1,
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
});
