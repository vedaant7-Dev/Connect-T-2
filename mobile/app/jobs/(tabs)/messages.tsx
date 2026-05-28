import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useJobsAuth } from "@/context/JobsAuthContext";
import { useJobs } from "@/context/JobsContext";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor(diff / 60000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0] || "").join("").slice(0, 2).toUpperCase() || "??";
}

const AVATAR_COLORS = ["#EA580C", "#059669", "#7C3AED", "#0369A1", "#DC2626", "#B45309"];
function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { jobsUser } = useJobsAuth();
  const { jobs } = useJobs();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const appliedJobs = jobs.filter((j) => jobsUser && j.applicants.includes(jobsUser.id));

  const contacts = appliedJobs.map((job) => ({
    employerId: job.employerId,
    company: job.company,
    jobTitle: job.title,
    jobId: job.id,
    lastActivity: job.createdAt,
    isShortlisted: job.shortlisted?.includes(jobsUser?.id || ""),
    isRejected: job.rejected?.includes(jobsUser?.id || ""),
  }));

  const uniqueContacts = contacts.filter(
    (c, i, arr) => arr.findIndex((x) => x.employerId === c.employerId) === i
  );

  const filtered = search.trim()
    ? uniqueContacts.filter(
        (c) =>
          c.company.toLowerCase().includes(search.toLowerCase()) ||
          c.jobTitle.toLowerCase().includes(search.toLowerCase())
      )
    : uniqueContacts;

  return (
    <View style={s.root}>
      <LinearGradient
        colors={["#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: topPad + 12 }]}
      >
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Messages</Text>
            <Text style={s.headerSub}>
              {uniqueContacts.length > 0
                ? `${uniqueContacts.length} employer conversation${uniqueContacts.length > 1 ? "s" : ""}`
                : "Apply to jobs to start chatting"}
            </Text>
          </View>
          <View style={s.headerBadgeWrap}>
            <Feather name="message-circle" size={18} color="white" />
            {uniqueContacts.length > 0 && (
              <View style={s.notifBubble}>
                <Text style={s.notifBubbleText}>{uniqueContacts.length}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={s.searchBar}>
          <Feather name="search" size={15} color="#94A3B8" />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search conversations…"
            placeholderTextColor="#94A3B8"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
              <Feather name="x" size={15} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconWrap}>
            <Feather name="message-circle" size={40} color="#EA580C" />
          </View>
          <Text style={s.emptyTitle}>{search ? "No results found" : "No conversations yet"}</Text>
          <Text style={s.emptySub}>
            {search
              ? "Try a different search term"
              : "Apply to jobs to start messaging employers directly"}
          </Text>
          {!search && (
            <TouchableOpacity
              style={s.browseBtn}
              onPress={() => router.replace("/jobs/(tabs)" as any)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#C2410C", "#EA580C"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.browseBtnGrad}
              >
                <Feather name="briefcase" size={15} color="white" />
                <Text style={s.browseBtnText}>Browse Jobs</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.employerId}
          contentContainerStyle={[s.list, { paddingBottom: Math.max(insets.bottom, 8) + 90 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const color = avatarColor(item.company);
            const initials = getInitials(item.company);
            return (
              <TouchableOpacity
                style={s.contactCard}
                activeOpacity={0.82}
                onPress={() => router.push(`/jobs/chat/${item.employerId}` as any)}
              >
                <View style={[s.avatar, { backgroundColor: color }]}>
                  <Text style={s.avatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.contactTop}>
                    <Text style={s.contactName} numberOfLines={1}>{item.company}</Text>
                    <Text style={s.contactTime}>{timeAgo(item.lastActivity)}</Text>
                  </View>
                  <Text style={s.contactJob} numberOfLines={1}>{item.jobTitle}</Text>
                  <View style={s.statusRow}>
                    {item.isShortlisted ? (
                      <View style={[s.statusPill, { backgroundColor: "#D1FAE5" }]}>
                        <Feather name="check-circle" size={10} color="#059669" />
                        <Text style={[s.statusPillText, { color: "#059669" }]}>Shortlisted</Text>
                      </View>
                    ) : item.isRejected ? (
                      <View style={[s.statusPill, { backgroundColor: "#FEE2E2" }]}>
                        <Feather name="x-circle" size={10} color="#DC2626" />
                        <Text style={[s.statusPillText, { color: "#DC2626" }]}>Not selected</Text>
                      </View>
                    ) : (
                      <View style={[s.statusPill, { backgroundColor: "#FFEDD5" }]}>
                        <Feather name="clock" size={10} color="#EA580C" />
                        <Text style={[s.statusPillText, { color: "#EA580C" }]}>Pending review</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            );
          }}
          ListHeaderComponent={
            <Text style={s.listHeader}>
              {filtered.length} conversation{filtered.length > 1 ? "s" : ""}
            </Text>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", marginTop: 2 },
  headerBadgeWrap: { position: "relative", width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  notifBubble: { position: "absolute", top: 5, right: 5, width: 16, height: 16, borderRadius: 8, backgroundColor: "#FCD34D", alignItems: "center", justifyContent: "center" },
  notifBubbleText: { fontSize: 8, fontWeight: "800", color: "#92400E", fontFamily: "Inter_700Bold" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  searchInput: { flex: 1, fontSize: 13, color: "#0F172A", fontFamily: "Inter_400Regular", padding: 0 },

  list: { paddingHorizontal: 14, paddingTop: 4 },
  listHeader: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular", paddingVertical: 10 },

  contactCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "white", borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  contactTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  contactName: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold", flex: 1 },
  contactTime: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  contactJob: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", marginBottom: 6 },
  statusRow: { flexDirection: "row" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: "600", fontFamily: "Inter_600SemiBold" },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFEDD5", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySub: { fontSize: 13, color: "#94A3B8", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  browseBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  browseBtnGrad: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 13 },
  browseBtnText: { fontSize: 14, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
});
