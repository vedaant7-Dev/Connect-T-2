import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAlerts } from "@/context/AlertContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";

const ALERT_TYPES = [
  {
    key: "emergency",
    label: "Emergency Alert",
    icon: "alert-triangle",
    color: "#DC2626",
    bg: "#FEE2E2",
  },
  {
    key: "announcement",
    label: "Public Announcement",
    icon: "megaphone",
    color: "#D97706",
    bg: "#FEF3C7",
  },
  {
    key: "info",
    label: "Information",
    icon: "info",
    color: "#3B82F6",
    bg: "#DBEAFE",
  },
  {
    key: "notice",
    label: "Notice",
    icon: "file-text",
    color: "#7C3AED",
    bg: "#EDE9FE",
  },
];

const WARD_TARGETS = [
  "All Wards",
  "Ward 1A",
  "Ward 1B",
  "Ward 2A",
  "Ward 2B",
  "Ward 3A",
  "Ward 3B",
  "Ward 4A",
  "Ward 4B",
  "Ward 4C",
  "Ward 5A",
  "Ward 5B",
  "Ward 6A",
  "Ward 6B",
  "Ward 7A",
  "Ward 7B",
  "Ward 8A",
  "Ward 8B",
  "Ward 9A",
  "Ward 9B",
  "Ward 10A",
  "Ward 10B",
];

export default function BroadcastScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { alerts, addAlert, removeAlert } = useAlerts();
  const { user } = useAuth();
  const router = useRouter();

  const [showCompose, setShowCompose] = useState(false);
  const [alertType, setAlertType] = useState("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetWard, setTargetWard] = useState("All Wards");
  const [showWardPicker, setShowWardPicker] = useState(false);
  const [sending, setSending] = useState(false);

  const myAlerts = alerts.filter((a) =>
    a.postedById ? a.postedById === user?.id : a.postedBy === user?.name,
  );

  const emergencyAlerts = alerts.filter(
    (a) => (a.type as string) === "emergency" || (a.priority as string) === "high",
  );
  const recentAlerts = [...alerts]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 10);

  function handleSend() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    addAlert({
      title: title.trim(),
      body: body.trim(),
      type: alertType as any,
      priority: alertType === "emergency" ? "high" : "normal",
      ward: targetWard === "All Wards" ? undefined : targetWard,
      postedBy: user?.name || "Super Admin",
      postedById: user?.id,
      createdAt: new Date().toISOString(),
    } as any);
    setTitle("");
    setBody("");
    setAlertType("announcement");
    setTargetWard("All Wards");
    setSending(false);
    setShowCompose(false);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "just now";
  }

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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <View style={{ flex: 1 }}>
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
              <Feather name="radio" size={10} color="#6EE7B7" />
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: "Inter_700Bold",
                  color: "#6EE7B7",
                  marginLeft: 4,
                  letterSpacing: 1.5,
                }}
              >
                BROADCAST & ALERTS
              </Text>
            </View>
            <Text
              style={{
                fontSize: 20,
                fontFamily: "Inter_700Bold",
                color: "white",
              }}
            >
              Broadcast Center
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: "rgba(255,255,255,0.65)",
                marginTop: 2,
              }}
            >
              {alerts.length} total · {emergencyAlerts.length} emergency
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { label: "Total Sent", value: alerts.length, color: "#93C5FD" },
            {
              label: "Emergency",
              value: emergencyAlerts.length,
              color: "#FCA5A5",
            },
            { label: "My Posts", value: myAlerts.length, color: "#6EE7B7" },
          ].map((s) => (
            <View
              key={s.label}
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: "Inter_700Bold",
                  color: s.color,
                }}
              >
                {s.value}
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.55)",
                  marginTop: 2,
                }}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, backgroundColor: "#F0F4F8" }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => setShowCompose(true)}
          activeOpacity={0.86}
          style={{ backgroundColor: "white", borderRadius: 16, padding: 15, marginBottom: 16, flexDirection: "row", alignItems: "center", shadowColor: "#166534", shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
        >
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <Feather name="plus-circle" size={20} color="#16A34A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A" }}>Post Alert / News</Text>
            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B", marginTop: 2 }}>Create a broadcast for all citizens or selected ward</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#CBD5E1" />
        </TouchableOpacity>

        <View style={{ marginBottom: 8 }}>
          <Text
            style={{
              fontSize: 15,
              fontFamily: "Inter_700Bold",
              color: "#0F172A",
              marginBottom: 6,
            }}
          >
            Quick Broadcast
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ALERT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.key}
                onPress={() => {
                  setAlertType(type.key);
                  setShowCompose(true);
                }}
                style={{
                  backgroundColor: type.bg,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                activeOpacity={0.8}
              >
                <Feather name={type.icon as any} size={14} color={type.color} />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_600SemiBold",
                    color: type.color,
                    marginLeft: 6,
                  }}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {emergencyAlerts.length > 0 && (
          <View style={{ marginTop: 8, marginBottom: 4 }}>
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Inter_700Bold",
                color: "#DC2626",
                marginBottom: 10,
              }}
            >
              🚨 Active Emergency Alerts
            </Text>
            {emergencyAlerts.slice(0, 3).map((alert, idx) => (
              <View
                key={alert.id || idx}
                style={{
                  backgroundColor: "#FEE2E2",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 8,
                  borderLeftWidth: 4,
                  borderLeftColor: "#DC2626",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <Feather name="alert-triangle" size={16} color="#DC2626" />
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_700Bold",
                      color: "#991B1B",
                      marginLeft: 8,
                      flex: 1,
                    }}
                  >
                    {alert.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeAlert(alert.id)}
                    style={{ padding: 4 }}
                  >
                    <Feather name="x" size={14} color="#DC2626" />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_400Regular",
                    color: "#7F1D1D",
                  }}
                  numberOfLines={2}
                >
                  {alert.body}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "Inter_400Regular",
                    color: "#B91C1C",
                    marginTop: 4,
                  }}
                >
                  {alert.ward || "All Wards"} · {timeAgo(alert.createdAt)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ marginTop: 12 }}>
          <Text
            style={{
              fontSize: 15,
              fontFamily: "Inter_700Bold",
              color: "#0F172A",
              marginBottom: 10,
            }}
          >
            Recent Broadcasts
          </Text>
          {recentAlerts.length === 0 ? (
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 16,
                padding: 24,
                alignItems: "center",
                shadowColor: "#000",
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 1,
              }}
            >
              <Feather name="radio" size={32} color="#CBD5E1" />
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_500Medium",
                  color: "#94A3B8",
                  marginTop: 12,
                }}
              >
                No broadcasts yet
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: "#CBD5E1",
                  marginTop: 4,
                }}
              >
                Tap Compose to send your first alert
              </Text>
            </View>
          ) : (
            recentAlerts.map((alert, idx) => {
              const typeConfig =
                ALERT_TYPES.find((t) => t.key === alert.type) || ALERT_TYPES[1];
              return (
                <View
                  key={alert.id || idx}
                  style={{
                    backgroundColor: "white",
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 8,
                    shadowColor: "#000",
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                >
                  <View
                    style={{ flexDirection: "row", alignItems: "flex-start" }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: typeConfig.bg,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Feather
                        name={typeConfig.icon as any}
                        size={16}
                        color={typeConfig.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Text
                          style={{
                            flex: 1,
                            fontSize: 14,
                            fontFamily: "Inter_600SemiBold",
                            color: "#0F172A",
                          }}
                          numberOfLines={1}
                        >
                          {alert.title}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeAlert(alert.id)}
                          style={{ padding: 4, marginLeft: 8 }}
                        >
                          <Feather name="trash-2" size={13} color="#CBD5E1" />
                        </TouchableOpacity>
                      </View>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Inter_400Regular",
                          color: "#64748B",
                          marginTop: 2,
                        }}
                        numberOfLines={2}
                      >
                        {alert.body}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 6,
                          gap: 8,
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: typeConfig.bg,
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              fontFamily: "Inter_600SemiBold",
                              color: typeConfig.color,
                            }}
                          >
                            {typeConfig.label}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: 10,
                            fontFamily: "Inter_400Regular",
                            color: "#94A3B8",
                          }}
                        >
                          {alert.ward || "All Wards"} ·{" "}
                          {timeAgo(alert.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showCompose}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompose(false)}
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
                marginBottom: 16,
              }}
            >
              Compose Broadcast
            </Text>

            <Text
              style={{
                fontSize: 10,
                fontFamily: "Inter_600SemiBold",
                color: "#94A3B8",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              ALERT TYPE
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                {ALERT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    onPress={() => setAlertType(type.key)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor:
                        alertType === type.key ? type.color : type.bg,
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={type.icon as any}
                      size={13}
                      color={alertType === type.key ? "white" : type.color}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter_600SemiBold",
                        color: alertType === type.key ? "white" : type.color,
                        marginLeft: 6,
                      }}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text
              style={{
                fontSize: 10,
                fontFamily: "Inter_600SemiBold",
                color: "#94A3B8",
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              TARGET WARD
            </Text>
            <TouchableOpacity
              onPress={() => setShowWardPicker(true)}
              style={{
                backgroundColor: "#F8FAFC",
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: "#E2E8F0",
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 14,
              }}
              activeOpacity={0.8}
            >
              <Feather name="map-pin" size={14} color="#16A34A" />
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: "#0F172A",
                  marginLeft: 8,
                }}
              >
                {targetWard}
              </Text>
              <Feather name="chevron-down" size={14} color="#94A3B8" />
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 10,
                fontFamily: "Inter_600SemiBold",
                color: "#94A3B8",
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              TITLE
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Alert title..."
              placeholderTextColor="#CBD5E1"
              style={
                {
                  backgroundColor: "#F8FAFC",
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: "#E2E8F0",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: "#0F172A",
                  marginBottom: 14,
                  outlineWidth: 0,
                } as any
              }
            />

            <Text
              style={{
                fontSize: 10,
                fontFamily: "Inter_600SemiBold",
                color: "#94A3B8",
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              MESSAGE
            </Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Write your message..."
              placeholderTextColor="#CBD5E1"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={
                {
                  backgroundColor: "#F8FAFC",
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: "#E2E8F0",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: "#0F172A",
                  marginBottom: 20,
                  height: 100,
                  outlineWidth: 0,
                } as any
              }
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowCompose(false)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: "#F1F5F9",
                  alignItems: "center",
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: "Inter_600SemiBold",
                    color: "#64748B",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSend}
                style={{
                  flex: 2,
                  borderRadius: 14,
                  overflow: "hidden",
                  opacity: !title.trim() || !body.trim() ? 0.5 : 1,
                }}
                activeOpacity={0.85}
                disabled={!title.trim() || !body.trim() || sending}
              >
                <LinearGradient
                  colors={["#166534", "#16A34A"]}
                  style={{
                    paddingVertical: 14,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="send" size={15} color="white" />
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: "Inter_700Bold",
                      color: "white",
                      marginLeft: 8,
                    }}
                  >
                    Send Broadcast
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showWardPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWardPicker(false)}
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
              maxHeight: "70%",
              paddingTop: 20,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: "#E2E8F0",
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 16,
              }}
            />
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_700Bold",
                color: "#0F172A",
                paddingHorizontal: 20,
                marginBottom: 12,
              }}
            >
              Select Target Ward
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {WARD_TARGETS.map((ward) => (
                <TouchableOpacity
                  key={ward}
                  onPress={() => {
                    setTargetWard(ward);
                    setShowWardPicker(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F1F5F9",
                  }}
                  activeOpacity={0.8}
                >
                  <Feather
                    name={ward === "All Wards" ? "globe" : "map-pin"}
                    size={14}
                    color={targetWard === ward ? "#16A34A" : "#94A3B8"}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontFamily: "Inter_500Medium",
                      color: targetWard === ward ? "#16A34A" : "#334155",
                      marginLeft: 12,
                    }}
                  >
                    {ward}
                  </Text>
                  {targetWard === ward && (
                    <Feather name="check" size={16} color="#16A34A" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
