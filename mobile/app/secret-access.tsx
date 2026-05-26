import React from "react";
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TopShade from "@/components/TopShade";

const { width } = Dimensions.get("window");

export default function SecretAccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const showSuperAdminAccessInfo = () => {
    Alert.alert(
      "Super Admin Access",
      "Main super admin login is restricted to Tejashree Ma'am mobile number: 8554994735. Unique ID access for additional super admins will be added in the next step.",
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#064E3B", "#047857", "#16A34A"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <TopShade height={220} />

      <View style={decor.b1} />
      <View style={decor.b2} />
      <View style={decor.r1} />
      <View style={decor.r2} />

      <View
        style={[
          styles.wrap,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 28,
          },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace("/portal-select" as any)}
            activeOpacity={0.85}
          >
            <Feather name="chevron-left" size={22} color="white" />
          </TouchableOpacity>

          <View style={styles.headerBadge}>
            <Feather name="shield" size={13} color="white" />
            <Text style={styles.headerBadgeText}>Secure Access</Text>
          </View>
        </View>

        <View style={styles.center}>
          <View style={styles.iconCircle}>
            <Feather name="lock" size={34} color="#16A34A" />
          </View>

          <Text style={styles.title}>Admin Access</Text>
          <Text style={styles.subtitle}>
            Restricted login for Super Admin and Nagarsevak officers.
          </Text>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.option}
              onPress={() => router.push("/super-admin-login" as any)}
              activeOpacity={0.86}
            >
              <LinearGradient
                colors={["#16A34A", "#059669"]}
                style={styles.optionIcon}
              >
                <Feather name="user-check" size={22} color="white" />
              </LinearGradient>

              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Super Admin Login</Text>
                <Text style={styles.optionSub}>
                  Only 8554994735 can access main dashboard
                </Text>
              </View>

              <Feather name="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.option}
              onPress={() => router.push("/nagarsevak/login" as any)}
              activeOpacity={0.86}
            >
              <LinearGradient
                colors={["#EA580C", "#C2410C"]}
                style={styles.optionIcon}
              >
                <Feather name="shield" size={22} color="white" />
              </LinearGradient>

              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Nagarsevak Login</Text>
                <Text style={styles.optionSub}>
                  Approved ward officers can login here
                </Text>
              </View>

              <Feather name="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.option}
              onPress={() => router.push("/nagarsevak/register" as any)}
              activeOpacity={0.86}
            >
              <LinearGradient
                colors={["#2563EB", "#1D4ED8"]}
                style={styles.optionIcon}
              >
                <Feather name="user-plus" size={22} color="white" />
              </LinearGradient>

              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Nagarsevak Register</Text>
                <Text style={styles.optionSub}>
                  Register profile and wait for approval
                </Text>
              </View>

              <Feather name="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.infoBtn}
            onPress={showSuperAdminAccessInfo}
            activeOpacity={0.84}
          >
            <Feather name="info" size={14} color="white" />
            <Text style={styles.infoText}>Super admin unique ID access setup</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>CONNECT T SECURE ADMIN PORTAL</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
  wrap: {
    flex: 1,
    paddingHorizontal: 22,
  },
  header: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "white",
    fontFamily: "Inter_700Bold",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "white",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.76)",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 24,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  option: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 14,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  optionSub: {
    fontSize: 11,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
  divider: {
    height: 1,
    marginLeft: 82,
    backgroundColor: "#F1F5F9",
  },
  infoBtn: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  infoText: {
    fontSize: 11,
    color: "white",
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    textAlign: "center",
    fontSize: 10,
    color: "rgba(255,255,255,0.38)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 2,
  },
});

const decor = StyleSheet.create({
  b1: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.16)",
    width: width * 0.52,
    height: width * 0.52,
    top: -width * 0.18,
    right: -width * 0.15,
  },
  b2: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.12)",
    width: width * 0.32,
    height: width * 0.32,
    bottom: -width * 0.12,
    left: -width * 0.08,
  },
  r1: {
    position: "absolute",
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    width: width * 0.9,
    height: width * 0.9,
    top: -width * 0.32,
    right: -width * 0.32,
  },
  r2: {
    position: "absolute",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    width: width * 0.72,
    height: width * 0.72,
    bottom: -width * 0.28,
    left: -width * 0.24,
  },
});
