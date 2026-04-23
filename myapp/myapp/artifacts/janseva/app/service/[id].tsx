import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";

import { serviceCategories } from "@/data/mumbaiServices";
import { ServiceMap } from "@/components/ServiceMap";

function StarRating({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather
          key={s}
          name={s <= Math.round(rating) ? "star" : "star"}
          size={size}
          color={s <= Math.round(rating) ? "#F59E0B" : "#E2E8F0"}
        />
      ))}
    </View>
  );
}

export default function ServiceDetailScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 44 : insets.top;
  const params = useLocalSearchParams<{ id: string; category: string }>();

  const category = serviceCategories.find((c) => c.id === params.category);
  const place = category?.data.find((p) => p.id === params.id);

  const handleCall = (phone: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${phone}`);
  };

  if (!place || !category) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <Feather name="alert-circle" size={40} color="#DC2626" />
        <Text style={{ marginTop: 12, fontSize: 16, color: "#64748B" }}>Place not found</Text>
        
      </View>
    );
  }

  const bedsAvailable = place.beds && place.bedsOccupied !== undefined
    ? place.beds - place.bedsOccupied
    : null;
  const bedsFillPct = place.beds && place.bedsOccupied !== undefined
    ? (place.bedsOccupied / place.beds) * 100
    : null;

  const govtColors: Record<string, { bg: string; text: string }> = {
    Government: { bg: "#D1FAE5", text: "#059669" },
    Municipal: { bg: "#FFEDD5", text: "#B45309" },
    Private: { bg: "#F5F3FF", text: "#7C3AED" },
    Trust: { bg: "#FEF3C7", text: "#D97706" },
  };
  const govtStyle = place.govtType ? (govtColors[place.govtType] ?? { bg: "#F1F5F9", text: "#64748B" }) : { bg: "#F1F5F9", text: "#64748B" };

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient
        colors={[category.color, category.color + "CC"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 10 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color="white" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={[styles.headerIconCircle, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Feather name={category.icon as any} size={28} color="white" />
          </View>
          <Text style={styles.headerName} numberOfLines={2}>{place.name}</Text>
          <View style={styles.headerMeta}>
            {place.govtType && (
              <View style={[styles.govtBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Text style={styles.govtBadgeText}>{place.govtType}</Text>
              </View>
            )}
            {place.speciality && (
              <View style={[styles.govtBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                <Text style={styles.govtBadgeText}>{place.speciality}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerInfoRow}>
            <Feather name="navigation" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerInfoText}>{place.distance}</Text>
            {place.timing && (
              <>
                <View style={styles.headerInfoDot} />
                <Feather name="clock" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.headerInfoText}>{place.timing}</Text>
              </>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 8) + 24 }]} showsVerticalScrollIndicator={false}>

        {/* Address */}
        <View style={styles.section}>
          <View style={styles.addressRow}>
            <View style={[styles.addressIcon, { backgroundColor: category.bgColor }]}>
              <Feather name="map-pin" size={16} color={category.color} />
            </View>
            <Text style={styles.addressText}>{place.address}</Text>
          </View>
          {place.established && (
            <View style={styles.establishedRow}>
              <Feather name="calendar" size={12} color="#94A3B8" />
              <Text style={styles.establishedText}>Established {place.established}</Text>
            </View>
          )}
        </View>

        {/* Map */}
        <ServiceMap
          address={place.address}
          name={place.name}
          color={category.color}
          bgColor={category.bgColor}
        />

        {/* Rating */}
        {place.rating !== undefined && (
          <View style={styles.ratingSection}>
            <View style={styles.ratingLeft}>
              <Text style={[styles.ratingBig, { color: category.color }]}>{place.rating.toFixed(1)}</Text>
              <StarRating rating={place.rating} size={14} />
              {place.reviewCount !== undefined && (
                <Text style={styles.reviewCount}>{place.reviewCount} reviews</Text>
              )}
            </View>
            {place.reviews && place.reviews.length > 0 && (
              <>
                <View style={styles.ratingDivider} />
                <View style={styles.ratingRight}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = place.reviews!.filter((r) => Math.round(r.rating) === star).length;
                    const pct = place.reviewCount ? (count / place.reviewCount) * 100 : 0;
                    return (
                      <View key={star} style={styles.ratingBar}>
                        <Text style={styles.ratingBarLabel}>{star}</Text>
                        <View style={styles.ratingBarTrack}>
                          <View style={[styles.ratingBarFill, { width: `${pct}%` as any, backgroundColor: category.color }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {/* Bed Availability */}
        {place.beds !== undefined && place.bedsOccupied !== undefined && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: category.bgColor }]}>
                <Feather name="activity" size={16} color={category.color} />
              </View>
              <Text style={styles.cardTitle}>Bed Availability</Text>
            </View>
            <View style={styles.bedStats}>
              <View style={styles.bedStat}>
                <Text style={styles.bedNum}>{place.beds}</Text>
                <Text style={styles.bedLabel}>Total Beds</Text>
              </View>
              <View style={styles.bedStat}>
                <Text style={[styles.bedNum, { color: "#DC2626" }]}>{place.bedsOccupied}</Text>
                <Text style={styles.bedLabel}>Occupied</Text>
              </View>
              <View style={styles.bedStat}>
                <Text style={[styles.bedNum, { color: "#059669" }]}>{bedsAvailable}</Text>
                <Text style={styles.bedLabel}>Available</Text>
              </View>
            </View>
            <View style={styles.bedBarTrack}>
              <View
                style={[
                  styles.bedBarFill,
                  {
                    width: `${bedsFillPct?.toFixed(0)}%` as any,
                    backgroundColor: (bedsFillPct ?? 0) > 85 ? "#DC2626" : (bedsFillPct ?? 0) > 65 ? "#D97706" : "#059669",
                  },
                ]}
              />
            </View>
            <Text style={styles.bedBarLabel}>
              {bedsFillPct?.toFixed(0)}% occupancy
              {(bedsFillPct ?? 0) > 85 ? " — Nearly Full" : (bedsFillPct ?? 0) > 65 ? " — Moderately Full" : " — Beds Available"}
            </Text>
          </View>
        )}

        {/* Services Provided */}
        {place.services && place.services.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: category.bgColor }]}>
                <Feather name="list" size={16} color={category.color} />
              </View>
              <Text style={styles.cardTitle}>Services Provided</Text>
            </View>
            {place.services.map((svc, i) => (
              <View key={i} style={styles.serviceRow}>
                <View style={[styles.serviceDot, { backgroundColor: category.color }]} />
                <Text style={styles.serviceRowText}>{svc}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Contact Numbers */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: category.bgColor }]}>
              <Feather name="phone" size={16} color={category.color} />
            </View>
            <Text style={styles.cardTitle}>Contact Numbers</Text>
          </View>
          {place.contacts.map((contact, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.contactRow, { borderColor: category.color + "25" }]}
              onPress={() => handleCall(contact.phone)}
              activeOpacity={0.75}
            >
              <View style={[styles.contactIconBox, { backgroundColor: category.bgColor }]}>
                <Feather name="phone-call" size={14} color={category.color} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactRole}>{contact.role || contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>
              <View style={[styles.callBtn, { backgroundColor: category.color }]}>
                <Feather name="phone" size={13} color="white" />
                <Text style={styles.callBtnText}>Call</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reviews */}
        {place.reviews && place.reviews.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: category.bgColor }]}>
                <Feather name="message-square" size={16} color={category.color} />
              </View>
              <Text style={styles.cardTitle}>Recent Reviews</Text>
            </View>
            {place.reviews.map((review, i) => (
              <View key={i} style={[styles.reviewRow, i < place.reviews!.length - 1 && styles.reviewRowBorder]}>
                <View style={styles.reviewTop}>
                  <View style={[styles.reviewAvatar, { backgroundColor: category.bgColor }]}>
                    <Text style={[styles.reviewAvatarText, { color: category.color }]}>
                      {review.reviewer.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewName}>{review.reviewer}</Text>
                    <View style={styles.reviewStarRow}>
                      <StarRating rating={review.rating} size={11} />
                      <Text style={styles.reviewDate}>{review.date}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ebeffc" },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerBack: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  headerContent: { alignItems: "center" },
  headerIconCircle: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  headerName: {
    fontSize: 20, fontWeight: "900", color: "white",
    fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 10,
    letterSpacing: -0.3,
  },
  headerMeta: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 10 },
  govtBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  govtBadgeText: { fontSize: 11, fontWeight: "700", color: "white", fontFamily: "Inter_600SemiBold" },
  headerInfoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerInfoText: { fontSize: 12, color: "rgba(255,255,255,0.85)", fontFamily: "Inter_400Regular" },
  headerInfoDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.5)" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: "white", borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  addressIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addressText: { flex: 1, fontSize: 13, color: "#374151", fontFamily: "Inter_400Regular", lineHeight: 19 },
  establishedRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  establishedText: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  ratingSection: {
    backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12,
    flexDirection: "row", alignItems: "center", gap: 16,
    shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  ratingLeft: { alignItems: "center", gap: 4 },
  ratingBig: { fontSize: 36, fontWeight: "900", fontFamily: "Inter_700Bold", letterSpacing: -1 },
  reviewCount: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 2 },
  ratingDivider: { width: 1, height: 80, backgroundColor: "#F1F5F9" },
  ratingRight: { flex: 1, gap: 4 },
  ratingBar: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingBarLabel: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", width: 10 },
  ratingBarTrack: { flex: 1, height: 6, backgroundColor: "#F1F5F9", borderRadius: 3, overflow: "hidden" },
  ratingBarFill: { height: "100%", borderRadius: 3 },
  card: {
    backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: "#B45309", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  cardHeaderIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  bedStats: { flexDirection: "row", justifyContent: "space-around", marginBottom: 14 },
  bedStat: { alignItems: "center", gap: 2 },
  bedNum: { fontSize: 26, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold" },
  bedLabel: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", fontWeight: "600" },
  bedBarTrack: { height: 10, backgroundColor: "#F1F5F9", borderRadius: 5, overflow: "hidden", marginBottom: 6 },
  bedBarFill: { height: "100%", borderRadius: 5 },
  bedBarLabel: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center" },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  serviceDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  serviceRowText: { fontSize: 13, color: "#374151", fontFamily: "Inter_400Regular", flex: 1 },
  contactRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8,
    backgroundColor: "#F8FAFC",
  },
  contactIconBox: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  contactInfo: { flex: 1 },
  contactRole: { fontSize: 11, color: "#0F172A", fontFamily: "Inter_400Regular", marginBottom: 2 },
  contactPhone: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold", color: "#0F172A" },
  callBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  callBtnText: { fontSize: 11, fontWeight: "700", color: "white", fontFamily: "Inter_600SemiBold" },
  reviewRow: { paddingVertical: 12 },
  reviewRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  reviewAvatarText: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  reviewMeta: { flex: 1 },
  reviewName: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 3 },
  reviewStarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewDate: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  reviewComment: { fontSize: 12, color: "#475569", fontFamily: "Inter_400Regular", lineHeight: 18 },
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
});
