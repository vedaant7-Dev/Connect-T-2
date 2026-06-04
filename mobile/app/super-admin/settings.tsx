import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Switch,
  Modal,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";

const COMPLAINT_CATEGORIES = [
  {
    key: "roads",
    label: "Roads & Infrastructure",
    icon: "truck",
    color: "#92400E",
  },
  { key: "water", label: "Water Supply", icon: "droplet", color: "#0369A1" },
  { key: "electricity", label: "Electricity", icon: "zap", color: "#D97706" },
  {
    key: "garbage",
    label: "Garbage Collection",
    icon: "trash-2",
    color: "#059669",
  },
  {
    key: "drainage",
    label: "Drainage & Sewage",
    icon: "git-merge",
    color: "#0EA5E9",
  },
  {
    key: "streetlight",
    label: "Street Lighting",
    icon: "sun",
    color: "#7C3AED",
  },
  {
    key: "encroachment",
    label: "Encroachment",
    icon: "alert-triangle",
    color: "#DC2626",
  },
  {
    key: "other",
    label: "Other Issues",
    icon: "more-horizontal",
    color: "#475569",
  },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [autoAssign, setAutoAssign] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");

  const settings = [
    {
      section: "App Controls",
      items: [
        {
          key: "maintenance",
          label: "Maintenance Mode",
          desc: "Temporarily disable public access",
          icon: "tool",
          color: "#DC2626",
          toggle: maintenanceMode,
          onToggle: setMaintenanceMode,
        },
        {
          key: "push",
          label: "Push Notifications",
          desc: "Send notifications to all citizens",
          icon: "bell",
          color: "#3B82F6",
          toggle: pushNotifications,
          onToggle: setPushNotifications,
        },
        {
          key: "autoAssign",
          label: "Auto-Assign Complaints",
          desc: "Automatically route to ward officers",
          icon: "shuffle",
          color: "#7C3AED",
          toggle: autoAssign,
          onToggle: setAutoAssign,
        },
        {
          key: "email",
          label: "Email Alerts",
          desc: "Send email for critical events",
          icon: "mail",
          color: "#D97706",
          toggle: emailAlerts,
          onToggle: setEmailAlerts,
        },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#0F172A" }}>
      <LinearGradient
        colors={["#052E16", "#166534", "#16A34A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: topPad + 12,
          paddingBottom: 20,
          paddingHorizontal: 20,
        }}
      >
        <View style={{ marginBottom: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.12)",
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 4,
              alignSelf: "flex-start",
              marginBottom: 6,
            }}
          >
            <Feather name="settings" size={10} color="#6EE7B7" />
            <Text
              style={{
                fontSize: 9,
                fontFamily: "Inter_700Bold",
                color: "#6EE7B7",
                marginLeft: 4,
                letterSpacing: 1.5,
              }}
            >
              SYSTEM SETTINGS
            </Text>
          </View>
          <Text
            style={{
              fontSize: 20,
              fontFamily: "Inter_700Bold",
              color: "white",
            }}
          >
            Settings & Config
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: "rgba(255,255,255,0.65)",
              marginTop: 2,
            }}
          >
            System configuration · AMC Ambernath
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, backgroundColor: "#F0F4F8" }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => {
            setEditName(user?.name || "");
            setShowEditProfile(true);
          }}
          style={{
            backgroundColor: "white",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: "#DCFCE7",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: "Inter_700Bold",
                  color: "#16A34A",
                }}
              >
                {user?.name?.charAt(0)?.toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_700Bold",
                  color: "#0F172A",
                }}
              >
                {user?.name}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 2,
                }}
              >
                <View
                  style={{
                    backgroundColor: "#DCFCE7",
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: "Inter_600SemiBold",
                      color: "#16A34A",
                    }}
                  >
                    SUPER ADMIN
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_400Regular",
                    color: "#64748B",
                  }}
                >
                  +91 {user?.mobile}
                </Text>
              </View>
            </View>
            <Feather name="edit-2" size={16} color="#94A3B8" />
          </View>
          <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
            {[
              { label: "ID", value: user?.nagarsevakId || "SUPER_ADMIN" },
              { label: "Ward", value: "All Wards" },
              { label: "Role", value: "Head Admin" },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  backgroundColor: "#F8FAFC",
                  borderRadius: 8,
                  padding: 8,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Inter_700Bold",
                    color: "#0F172A",
                  }}
                >
                  {item.value}
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    fontFamily: "Inter_400Regular",
                    color: "#94A3B8",
                  }}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {maintenanceMode && (
          <View
            style={{
              backgroundColor: "#FEE2E2",
              borderRadius: 14,
              padding: 14,
              marginBottom: 16,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Feather name="alert-triangle" size={18} color="#DC2626" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_700Bold",
                  color: "#991B1B",
                }}
              >
                Maintenance Mode Active
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Inter_400Regular",
                  color: "#B91C1C",
                }}
              >
                Public access is restricted. Toggle off to restore.
              </Text>
            </View>
          </View>
        )}

        <Text
          style={{
            fontSize: 12,
            fontFamily: "Inter_700Bold",
            color: "#94A3B8",
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          APP CONTROLS
        </Text>
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 16,
            marginBottom: 20,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
            overflow: "hidden",
          }}
        >
          {settings[0].items.map((item, idx, arr) => (
            <View
              key={item.key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                borderBottomColor: "#F1F5F9",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: item.color + "18",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Feather name={item.icon as any} size={16} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    color: "#0F172A",
                  }}
                >
                  {item.label}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Inter_400Regular",
                    color: "#94A3B8",
                  }}
                >
                  {item.desc}
                </Text>
              </View>
              <Switch
                value={item.toggle}
                onValueChange={item.onToggle}
                trackColor={{ false: "#E2E8F0", true: "#16A34A" }}
                thumbColor="white"
              />
            </View>
          ))}
        </View>

        <Text
          style={{
            fontSize: 12,
            fontFamily: "Inter_700Bold",
            color: "#94A3B8",
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          ADMIN ACCESS
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/super-admin/access" as any)}
          style={{
            backgroundColor: "white",
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
            flexDirection: "row",
            alignItems: "center",
          }}
          activeOpacity={0.85}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: "#DCFCE7",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Feather name="key" size={18} color="#16A34A" />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_700Bold",
                color: "#0F172A",
              }}
            >
              Manage Super Admin Access
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Inter_400Regular",
                color: "#94A3B8",
                marginTop: 3,
              }}
            >
              Generate and revoke unique IDs for trusted admins
            </Text>
          </View>

          <Feather name="chevron-right" size={18} color="#CBD5E1" />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 12,
            fontFamily: "Inter_700Bold",
            color: "#94A3B8",
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          BACKEND & API
        </Text>
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 16,
            marginBottom: 20,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
            overflow: "hidden",
          }}
        >
          {[
            {
              label: "Database",
              value: "Hostinger MySQL",
              icon: "database",
              color: "#3B82F6",
            },
            {
              label: "App Version",
              value: "v1.0 · Build 2025",
              icon: "code",
              color: "#7C3AED",
            },
            {
              label: "Server",
              value: "Hostinger Node.js API",
              icon: "server",
              color: "#059669",
            },
            {
              label: "Auth Mode",
              value: "Mobile OTP Login",
              icon: "key",
              color: "#D97706",
            },
            {
              label: "Municipality",
              value: "AMC Ambernath",
              icon: "home",
              color: "#16A34A",
            },
          ].map((item, idx, arr) => (
            <View
              key={item.label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
                borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                borderBottomColor: "#F1F5F9",
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: item.color + "18",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Feather name={item.icon as any} size={14} color={item.color} />
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontFamily: "Inter_500Medium",
                  color: "#334155",
                }}
              >
                {item.label}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: "#94A3B8",
                }}
              >
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={{
            backgroundColor: "white",
            borderRadius: 18,
            padding: 20,
            alignItems: "center",
            marginBottom: 16,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 1,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "900",
              color: "#C2410C",
              fontFamily: "Inter_700Bold",
              letterSpacing: -0.5,
            }}
          >
            Connect T
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#64748B",
              fontFamily: "Inter_400Regular",
              marginTop: 4,
              textAlign: "center",
            }}
          >
            Civic Services · सबका साथ, सबका विकास
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: "#94A3B8",
              fontFamily: "Inter_400Regular",
              marginTop: 6,
            }}
          >
            v1.0
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowLogout(true)}
          style={{
            backgroundColor: "#FEE2E2",
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.85}
        >
          <Feather name="log-out" size={18} color="#DC2626" />
          <Text
            style={{
              fontSize: 15,
              fontFamily: "Inter_700Bold",
              color: "#DC2626",
              marginLeft: 10,
            }}
          >
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showLogout}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogout(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 24,
              padding: 28,
              margin: 32,
              alignItems: "center",
              width: "85%",
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "#FEE2E2",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Feather name="log-out" size={26} color="#DC2626" />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Inter_700Bold",
                color: "#0F172A",
                marginBottom: 8,
              }}
            >
              Sign Out
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: "#64748B",
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              Are you sure you want to sign out of the Super Admin panel?
            </Text>
            <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
              <TouchableOpacity
                onPress={() => setShowLogout(false)}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 14,
                  backgroundColor: "#F1F5F9",
                  alignItems: "center",
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    color: "#64748B",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  setShowLogout(false);
                  await logout("/super-admin-login");
                  router.replace("/super-admin-login" as any);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 14,
                  backgroundColor: "#DC2626",
                  alignItems: "center",
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    color: "white",
                  }}
                >
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: "#E2E8F0",
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 20,
              }}
            />
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Inter_700Bold",
                color: "#0F172A",
                marginBottom: 20,
              }}
            >
              Edit Profile
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontFamily: "Inter_600SemiBold",
                color: "#94A3B8",
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              FULL NAME
            </Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor="#CBD5E1"
              style={
                {
                  backgroundColor: "#F8FAFC",
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: "#E2E8F0",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  fontFamily: "Inter_400Regular",
                  color: "#0F172A",
                  marginBottom: 24,
                  outlineWidth: 0,
                } as any
              }
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowEditProfile(false)}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 14,
                  backgroundColor: "#F1F5F9",
                  alignItems: "center",
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_700Bold",
                    color: "#64748B",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!editName.trim()) return;
                  await updateUser({ name: editName.trim() });
                  setShowEditProfile(false);
                }}
                style={{
                  flex: 2,
                  borderRadius: 14,
                  overflow: "hidden",
                  opacity: editName.trim() ? 1 : 0.5,
                }}
                disabled={!editName.trim()}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#166534", "#16A34A"]}
                  style={{ paddingVertical: 13, alignItems: "center" }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_700Bold",
                      color: "white",
                    }}
                  >
                    Save Changes
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
