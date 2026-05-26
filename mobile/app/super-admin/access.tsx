import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TopShade from "@/components/TopShade";
import { useAuth } from "@/context/AuthContext";
import { useSuperAdminAccess } from "@/hooks/useSuperAdminAccess";

function cleanMobile(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export default function SuperAdminAccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const {
    accessCodes,
    loading,
    error,
    createAccessCode,
    updateAccessStatus,
    refetch,
  } = useSuperAdminAccess();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeCount = useMemo(
    () => accessCodes.filter((item) => item.status === "active").length,
    [accessCodes],
  );

  const revokedCount = useMemo(
    () => accessCodes.filter((item) => item.status === "revoked").length,
    [accessCodes],
  );

  const handleCreate = async () => {
    const finalName = name.trim();
    const finalMobile = cleanMobile(mobile);

    if (!finalName) {
      Alert.alert("Name required", "Enter the person name.");
      return;
    }

    if (finalMobile.length !== 10) {
      Alert.alert("Mobile required", "Enter a valid 10 digit mobile number.");
      return;
    }

    try {
      setSubmitting(true);

      const created = await createAccessCode({
        name: finalName,
        mobile: finalMobile,
        createdBy: user?.mobile || user?.id || "main_super_admin",
      });

      setName("");
      setMobile("");

      Alert.alert(
        "Access ID Generated",
        `Name: ${created.name}\nMobile: ${created.mobile}\nUnique ID: ${created.accessCode}`,
      );
    } catch (e: any) {
      Alert.alert(
        "Could not create access",
        e?.message ||
          "Database setup may be pending. Please create the super_admin_access_codes table.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (
    id: string,
    nextStatus: "active" | "revoked",
  ) => {
    try {
      await updateAccessStatus(id, nextStatus);
    } catch (e: any) {
      Alert.alert(
        "Update failed",
        e?.message || "Could not update access status.",
      );
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#052E16", "#166534", "#16A34A"]}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />

      <TopShade height={210} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + 14,
              paddingBottom: insets.bottom + 28,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Feather name="arrow-left" size={18} color="#16A34A" />
            </TouchableOpacity>

            <View style={styles.headerBadge}>
              <Feather name="shield" size={10} color="#6EE7B7" />
              <Text style={styles.headerBadgeText}>Super Admin</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.title}>Unique Access</Text>
            <Text style={styles.subtitle}>
              Generate secure access IDs for additional super admin users.
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{activeCount}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{revokedCount}</Text>
                <Text style={styles.statLabel}>Revoked</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardIcon}>
                <Feather name="user-plus" size={18} color="#16A34A" />
              </View>
              <View style={styles.cardTitleText}>
                <Text style={styles.cardTitle}>Create Access ID</Text>
                <Text style={styles.cardSub}>
                  Person can login with mobile number and unique ID.
                </Text>
              </View>
            </View>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter name"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />

            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              value={mobile}
              onChangeText={(value) => setMobile(cleanMobile(value))}
              placeholder="10 digit mobile number"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={10}
              style={styles.input}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && styles.disabledBtn]}
              onPress={handleCreate}
              disabled={submitting}
              activeOpacity={0.86}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Feather name="key" size={16} color="white" />
                  <Text style={styles.primaryBtnText}>Generate Unique ID</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardIcon}>
                <Feather name="list" size={18} color="#16A34A" />
              </View>
              <View style={styles.cardTitleText}>
                <Text style={styles.cardTitle}>Access List</Text>
                <Text style={styles.cardSub}>
                  Revoke access immediately when required.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={refetch}
                activeOpacity={0.8}
              >
                <Feather name="refresh-cw" size={14} color="#16A34A" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.emptyBox}>
                <ActivityIndicator color="#16A34A" />
                <Text style={styles.emptyText}>Loading access records...</Text>
              </View>
            ) : error ? (
              <View style={styles.warningBox}>
                <Feather name="alert-triangle" size={18} color="#D97706" />
                <Text style={styles.warningTitle}>Database setup pending</Text>
                <Text style={styles.warningText}>
                  {error.includes("doesn't exist")
                    ? "Create the super_admin_access_codes table in MySQL to enable this feature."
                    : error}
                </Text>
              </View>
            ) : accessCodes.length === 0 ? (
              <View style={styles.emptyBox}>
                <Feather name="key" size={34} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No access IDs yet</Text>
                <Text style={styles.emptyText}>
                  Generated IDs will appear here.
                </Text>
              </View>
            ) : (
              accessCodes.map((item) => {
                const active = item.status === "active";

                return (
                  <View key={item.id} style={styles.accessRow}>
                    <View style={styles.accessIcon}>
                      <Feather
                        name={active ? "check-circle" : "x-circle"}
                        size={18}
                        color={active ? "#16A34A" : "#DC2626"}
                      />
                    </View>

                    <View style={styles.accessBody}>
                      <Text style={styles.accessName}>{item.name}</Text>
                      <Text style={styles.accessMeta}>{item.mobile}</Text>
                      <View style={styles.codePill}>
                        <Text style={styles.codeText}>{item.accessCode}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.statusBtn,
                        active ? styles.revokeBtn : styles.activateBtn,
                      ]}
                      onPress={() =>
                        handleToggle(item.id, active ? "revoked" : "active")
                      }
                      activeOpacity={0.84}
                    >
                      <Text
                        style={[
                          styles.statusBtnText,
                          active ? styles.revokeText : styles.activateText,
                        ]}
                      >
                        {active ? "Revoke" : "Activate"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    backgroundColor: "#16A34A",
  },
  content: {
    paddingHorizontal: 18,
  },
  header: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  headerBadgeText: {
    fontSize: 11,
    color: "white",
    fontFamily: "Inter_700Bold",
  },
  hero: {
    paddingTop: 18,
    paddingBottom: 18,
  },
  title: {
    fontSize: 31,
    color: "white",
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Inter_400Regular",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  statPill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 22,
    color: "white",
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
  },
  cardSub: {
    fontSize: 11,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    marginTop: 3,
    lineHeight: 16,
  },
  label: {
    fontSize: 12,
    color: "#475569",
    fontFamily: "Inter_600SemiBold",
    marginBottom: 7,
    marginTop: 8,
  },
  input: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#0F172A",
    fontFamily: "Inter_500Medium",
  },
  primaryBtn: {
    height: 50,
    borderRadius: 17,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 16,
  },
  disabledBtn: {
    opacity: 0.65,
  },
  primaryBtnText: {
    color: "white",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    minHeight: 110,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  emptyTitle: {
    fontSize: 14,
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    marginTop: 10,
  },
  emptyText: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    marginTop: 5,
    textAlign: "center",
  },
  warningBox: {
    borderRadius: 18,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 14,
  },
  warningTitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#92400E",
    fontFamily: "Inter_700Bold",
  },
  warningText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    color: "#B45309",
    fontFamily: "Inter_400Regular",
  },
  accessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  accessIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  accessBody: {
    flex: 1,
  },
  accessName: {
    fontSize: 14,
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
  },
  accessMeta: {
    fontSize: 11,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  codePill: {
    alignSelf: "flex-start",
    marginTop: 7,
    backgroundColor: "#F0FDF4",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  codeText: {
    fontSize: 11,
    color: "#16A34A",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  statusBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  revokeBtn: {
    backgroundColor: "#FEF2F2",
  },
  activateBtn: {
    backgroundColor: "#DCFCE7",
  },
  statusBtnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  revokeText: {
    color: "#DC2626",
  },
  activateText: {
    color: "#16A34A",
  },
});
