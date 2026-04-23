import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";

import { serviceCategories, ServiceCategory, ServicePlace } from "@/data/mumbaiServices";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";

function StarRow({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather
          key={s}
          name="star"
          size={10}
          color={s <= Math.round(rating) ? "#F59E0B" : "#E2E8F0"}
        />
      ))}
      <Text style={{ fontSize: 10, color: "#94A3B8", marginLeft: 2 }}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function PlaceCard({
  place,
  categoryColor,
  categoryBg,
  categoryId,
}: {
  place: ServicePlace;
  categoryColor: string;
  categoryBg: string;
  categoryId: string;
}) {
  const handleTap = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push({
      pathname: "/service/[id]",
      params: { id: place.id, category: categoryId },
    } as any);
  };

  const bedsAvailable = place.beds !== undefined && place.bedsOccupied !== undefined
    ? place.beds - place.bedsOccupied
    : null;
  const bedsFillPct = place.beds && place.bedsOccupied !== undefined
    ? (place.bedsOccupied / place.beds) * 100
    : null;

  return (
    <TouchableOpacity style={styles.placeCard} onPress={handleTap} activeOpacity={0.88}>
      <View style={styles.placeCardTop}>
        <View style={[styles.placeIconBadge, { backgroundColor: categoryBg }]}>
          <Feather name="map-pin" size={15} color={categoryColor} />
        </View>
        <View style={styles.placeInfo}>
          <Text style={styles.placeName} numberOfLines={2}>{place.name}</Text>
          <Text style={styles.placeAddress} numberOfLines={1}>{place.address}</Text>
          <View style={styles.placeTagRow}>
            {place.speciality && (
              <View style={[styles.placeTag, { backgroundColor: categoryBg }]}>
                <Text style={[styles.placeTagText, { color: categoryColor }]}>{place.speciality}</Text>
              </View>
            )}
            {place.govtType && (
              <View style={[styles.placeTag, { backgroundColor: "#F1F5F9" }]}>
                <Text style={[styles.placeTagText, { color: "#64748B" }]}>{place.govtType}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.placeRight}>
          <View style={[styles.distanceBadge, { backgroundColor: categoryBg }]}>
            <Feather name="navigation" size={10} color={categoryColor} />
            <Text style={styles.distanceText}>{place.distance}</Text>
          </View>
          {place.timing && (
            <Text style={styles.timingText} numberOfLines={1}>{place.timing}</Text>
          )}
        </View>
      </View>

      {/* Rating + Beds mini strip */}
      <View style={styles.placeBottomRow}>
        {place.rating !== undefined && (
          <StarRow rating={place.rating} />
        )}
        {place.reviewCount !== undefined && (
          <Text style={styles.reviewCountText}>{place.reviewCount} reviews</Text>
        )}
        <View style={{ flex: 1 }} />
        {place.beds !== undefined && bedsAvailable !== null && (
          <View style={styles.bedsMini}>
            <View style={[styles.bedsDot, { backgroundColor: (bedsFillPct ?? 0) > 85 ? "#DC2626" : (bedsFillPct ?? 0) > 65 ? "#D97706" : "#059669" }]} />
            <Text style={styles.bedsText}>{bedsAvailable} beds free</Text>
          </View>
        )}
        <Feather name="chevron-right" size={14} color="#CBD5E1" />
      </View>

      {/* Quick contacts */}
      {place.contacts.slice(0, 2).map((c, i) => (
        <View key={i} style={[styles.quickContact, { borderTopColor: categoryColor + "18" }]}>
          <View style={[styles.quickContactIcon, { backgroundColor: "#E2E8F0" }]}>
            <Feather name="phone" size={11} color="#0F172A" />
          </View>
          <Text style={styles.quickContactRole}>{c.role || c.name}</Text>
          <Text style={styles.quickContactPhone}>{c.phone}</Text>
        </View>
      ))}
      {place.contacts.length > 2 && (
        <TouchableOpacity style={styles.moreContacts} onPress={handleTap} activeOpacity={0.8}>
          <Text style={styles.moreContactsText}>
            +{place.contacts.length - 2} more contacts — Tap to view all details
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const params = useLocalSearchParams<{ category?: string }>();
  const { handleScroll } = useTabBarVisibility();

  const [selectedCat, setSelectedCat] = useState<ServiceCategory>(serviceCategories[0]);

  useEffect(() => {
    if (params.category) {
      const cat = serviceCategories.find((c) => c.id === params.category);
      if (cat) setSelectedCat(cat);
    }
  }, [params.category]);

  const sortedData = [...selectedCat.data].sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color="white" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nearby Services</Text>
        <Text style={styles.headerSub}>Ambernath — Sorted by distance</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {serviceCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                selectedCat.id === cat.id ? styles.chipActive : styles.chipInactive,
              ]}
              onPress={() => setSelectedCat(cat)}
              activeOpacity={0.8}
            >
              <Feather
                name={cat.icon as any}
                size={12}
                color={selectedCat.id === cat.id ? "white" : "rgba(255,255,255,0.7)"}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: selectedCat.id === cat.id ? "white" : "rgba(255,255,255,0.7)" },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <View style={styles.resultsBar}>
        <View style={[styles.catDot, { backgroundColor: selectedCat.color }]} />
        <Text style={styles.resultsText}>
          {sortedData.length} {selectedCat.label.toLowerCase()} near you
        </Text>
      </View>

      <FlatList
        data={sortedData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlaceCard
            place={item}
            categoryColor={selectedCat.color}
            categoryBg={selectedCat.bgColor}
            categoryId={selectedCat.id}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 8) + 80 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ebeffc" },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingRight: 8,
    paddingLeft: 2,
  },
  backBtnText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  headerTitle: {
    fontSize: 22, fontWeight: "800", color: "#FFFFFF",
    fontFamily: "Inter_700Bold", letterSpacing: -0.3, marginBottom: 2,
  },
  headerSub: {
    fontSize: 12, color: "rgba(255,255,255,0.65)",
    fontFamily: "Inter_400Regular", marginBottom: 14,
  },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: {
    flexDirection: "row", alignItems: "center",
    gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  chipActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  chipInactive: { backgroundColor: "rgba(255,255,255,0.1)" },
  chipText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  resultsBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  resultsText: {
    fontSize: 12, color: "#64748B",
    fontFamily: "Inter_500Medium", fontWeight: "600",
  },
  listContent: { padding: 14 },
  placeCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  placeCardTop: {
    flexDirection: "row", padding: 14, alignItems: "flex-start", gap: 10,
  },
  placeIconBadge: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  placeInfo: { flex: 1 },
  placeName: {
    fontSize: 14, fontWeight: "700", color: "#0F172A",
    fontFamily: "Inter_700Bold", marginBottom: 2,
  },
  placeAddress: {
    fontSize: 11, color: "#64748B",
    fontFamily: "Inter_400Regular", marginBottom: 6,
  },
  placeTagRow: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  placeTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  placeTagText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  placeRight: { alignItems: "flex-end", flexShrink: 0 },
  distanceBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  distanceText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_600SemiBold", color: "#374151" },
  timingText: {
    fontSize: 9, color: "#94A3B8", marginTop: 4,
    fontFamily: "Inter_400Regular", maxWidth: 80, textAlign: "right",
  },
  placeBottomRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingBottom: 10, flexWrap: "wrap",
  },
  reviewCountText: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  bedsMini: { flexDirection: "row", alignItems: "center", gap: 4 },
  bedsDot: { width: 7, height: 7, borderRadius: 4 },
  bedsText: { fontSize: 10, color: "#64748B", fontFamily: "Inter_400Regular" },
  quickContact: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1,
  },
  quickContactIcon: {
    width: 24, height: 24, borderRadius: 7,
    alignItems: "center", justifyContent: "center",
  },
  quickContactRole: {
    fontSize: 11, color: "#374151",
    fontFamily: "Inter_400Regular", flex: 1,
  },
  quickContactPhone: {
    fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold", color: "#0F172A",
  },
  moreContacts: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: "#F1F5F9",
  },
  moreContactsText: {
    fontSize: 11, fontFamily: "Inter_500Medium", fontWeight: "600", color: "#374151",
  },
});
