import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ServicePlace } from "@/data/mumbaiServices";

interface ServiceCardProps {
  place: ServicePlace;
  categoryColor: string;
  categoryBg: string;
}

export function ServiceCard({ place, categoryColor, categoryBg }: ServiceCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleCall = (phone: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleToggle = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setExpanded(!expanded);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={handleToggle} activeOpacity={0.85}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconBadge, { backgroundColor: categoryBg }]}>
              <Feather name="map-pin" size={14} color={categoryColor} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={2}>{place.name}</Text>
              <Text style={styles.cardAddress} numberOfLines={1}>{place.address}</Text>
              {place.speciality ? (
                <View style={[styles.specialityBadge, { backgroundColor: categoryBg }]}>
                  <Text style={[styles.specialityText, { color: categoryColor }]}>{place.speciality}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.distanceBadge, { backgroundColor: categoryBg }]}>
              <Feather name="navigation" size={10} color={categoryColor} />
              <Text style={[styles.distanceText, { color: categoryColor }]}>{place.distance}</Text>
            </View>
            {place.timing ? (
              <Text style={styles.timingText} numberOfLines={1}>{place.timing}</Text>
            ) : null}
            <Feather
              name={expanded ? "chevron-up" : "chevron-down"}
              size={16}
              color="#94A3B8"
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.contactsContainer}>
          <View style={styles.divider} />
          <Text style={styles.contactsLabel}>Contact Numbers</Text>
          <View style={styles.contactGrid}>
            {place.contacts.map((contact, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.contactBtn, { borderColor: categoryColor + "40" }]}
                onPress={() => handleCall(contact.phone)}
                activeOpacity={0.75}
              >
                <View style={[styles.contactIconWrap, { backgroundColor: categoryBg }]}>
                  <Feather name="phone" size={12} color={categoryColor} />
                </View>
                <View style={styles.contactBtnText}>
                  <Text style={styles.contactRole}>{contact.role || contact.name}</Text>
                  <Text style={[styles.contactPhone, { color: categoryColor }]}>{contact.phone}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    padding: 14,
    alignItems: "flex-start",
    gap: 10,
  },
  cardLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  cardAddress: {
    fontSize: 11,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  specialityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  specialityText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
  },
  cardRight: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
  },
  timingText: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    maxWidth: 80,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 14,
  },
  contactsContainer: {
    paddingBottom: 12,
  },
  contactsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contactGrid: {
    paddingHorizontal: 12,
    gap: 6,
  },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "#F8FAFC",
  },
  contactIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  contactBtnText: {
    flex: 1,
  },
  contactRole: {
    fontSize: 10,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
  },
  contactPhone: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
