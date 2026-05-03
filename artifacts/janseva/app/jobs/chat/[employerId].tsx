import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function JobChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ employerId?: string }>();

  return (
    <View style={s.root}>
      <LinearGradient colors={["#C2410C", "#EA580C", "#F97316"]} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={18} color="white" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Chat Employer</Text>
        <Text style={s.headerSub}>Employer ID: {params.employerId}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.empty}>
          <Feather name="message-circle" size={42} color="#CBD5E1" />
          <Text style={s.emptyText}>Chat will open here.</Text>
        </View>
      </ScrollView>

      <View style={s.inputBar}>
        <TextInput style={s.input} placeholder="Type message..." placeholderTextColor="#94A3B8" />
        <TouchableOpacity style={s.sendBtn} activeOpacity={0.85}>
          <Feather name="send" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4, fontFamily: "Inter_400Regular" },
  content: { flexGrow: 1, justifyContent: "center", padding: 16 },
  empty: { alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  inputBar: { flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: "#E2E8F0", backgroundColor: "white" },
  input: { flex: 1, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A" },
  sendBtn: { width: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#EA580C" },
});