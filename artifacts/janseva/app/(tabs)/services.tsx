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
import { useLocalSearchParams } from "expo-router";

import { ServiceCard } from "@/components/ServiceCard";
import { serviceCategories, ServiceCategory } from "@/data/mumbaiServices";

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const params = useLocalSearchParams<{ category?: string }>();

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
        colors={["#1E3A8A", "#1E40AF", "#2563EB", "#3B82F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <Text style={styles.headerTitle}>Nearby Services</Text>
        <Text style={styles.headerSub}>Mumbai — Sorted by distance</Text>

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
        <Text style={styles.resultsText}>{sortedData.length} places found near you</Text>
      </View>

      <FlatList
        data={sortedData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ServiceCard
            place={item}
            categoryColor={selectedCat.color}
            categoryBg={selectedCat.bgColor}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 90 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Inter_400Regular",
    marginBottom: 14,
  },
  chipRow: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  chipInactive: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
  },
  resultsBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resultsText: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_500Medium",
    fontWeight: "600",
  },
  listContent: {
    padding: 14,
  },
});
