import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useJobs } from "@/context/JobsContext";
import { useJobsAuth } from "@/context/JobsAuthContext";

function timeLabel(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function JobChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ employerId?: string }>();
  const { jobs, addJobMessage } = useJobs() as any;
  const { jobsUser } = useJobsAuth();
  const [text, setText] = useState("");

  const employerJobs = useMemo(
    () => jobs.filter((job: any) => job.employerId === params.employerId),
    [jobs, params.employerId],
  );

  const job = employerJobs[0];
  const messages = job?.messages ?? [];
  const employerContact = job?.employerWhatsApp || job?.employerPhone || "";
  const topPad = (Platform.OS === "web" ? 54 : insets.top) + 14;

  const sendMessage = async () => {
    const message = text.trim();

    if (!message) return;

    if (!job) {
      Alert.alert("No chat found");
      return;
    }

    addJobMessage(job.id, {
      from: jobsUser?.id || "visitor",
      text: message,
      createdAt: new Date().toISOString(),
    });

    setText("");
  };

  const openWhatsApp = async () => {
    const phone = String(employerContact).replace(/[^\d+]/g, "");

    if (!phone) {
      Alert.alert("Contact unavailable", "Employer WhatsApp number is not available.");
      return;
    }

    const url = `https://wa.me/${phone.replace("+", "")}?text=${encodeURIComponent(
      `Hi, I’m interested in ${job?.title ?? "your job post"}.`,
    )}`;

    const can = await Linking.canOpenURL(url);

    if (!can) {
      Alert.alert("WhatsApp not available");
      return;
    }

    await Linking.openURL(url);
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={["#9A3412", "#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: topPad }]}
      >
        <View style={s.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.backBtn}
            activeOpacity={0.84}
          >
            <Feather name="chevron-left" size={22} color="white" />
          </TouchableOpacity>

          <View style={s.headerBadge}>
            <Feather name="message-circle" size={11} color="rgba(255,255,255,0.86)" />
            <Text style={s.headerBadgeText}>Job Chat</Text>
          </View>
        </View>

        <View style={s.heroRow}>
          <View style={s.heroIcon}>
            <Feather name="message-circle" size={27} color="#EA580C" />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.headerTitle} numberOfLines={1}>
              Chat Employer
            </Text>
            <Text style={s.headerSub} numberOfLines={2}>
              {job ? `${job.company} · ${job.title}` : `Employer ID: ${params.employerId || "—"}`}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={s.messagesScroll}
        contentContainerStyle={[
          s.messagesContent,
          {
            paddingBottom: 18,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIcon}>
              <Feather name="message-circle" size={34} color="#EA580C" />
            </View>
            <Text style={s.emptyTitle}>Start the conversation</Text>
            <Text style={s.emptyText}>
              Send a message to the employer or open WhatsApp for direct contact.
            </Text>
          </View>
        ) : (
          messages.map((message: any, index: number) => {
            const mine = message.from === jobsUser?.id;

            return (
              <View
                key={`${message.createdAt || "message"}-${index}`}
                style={[s.messageWrap, mine ? s.myWrap : s.otherWrap]}
              >
                <View style={[s.messageBubble, mine ? s.myBubble : s.otherBubble]}>
                  <Text style={[s.messageText, mine ? s.myMessageText : s.otherMessageText]}>
                    {message.text}
                  </Text>

                  {!!message.createdAt && (
                    <Text style={[s.messageTime, mine ? s.myTime : s.otherTime]}>
                      {timeLabel(message.createdAt)}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View
        style={[
          s.footer,
          {
            paddingBottom: Math.max(insets.bottom, 8) + 8,
          },
        ]}
      >
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Type message..."
            placeholderTextColor="#94A3B8"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]}
            activeOpacity={0.85}
            onPress={sendMessage}
            disabled={!text.trim()}
          >
            <Feather name="send" size={17} color="white" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[s.whatsappBtn, !employerContact && s.whatsappBtnDisabled]}
          activeOpacity={0.85}
          onPress={openWhatsApp}
          disabled={!employerContact}
        >
          <Feather name="message-circle" size={16} color="white" />
          <Text style={s.whatsappText}>
            {employerContact ? "Open WhatsApp" : "WhatsApp unavailable"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFF7ED",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    shadowColor: "#9A3412",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  headerTop: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerBadgeText: {
    fontSize: 11,
    color: "white",
    fontFamily: "Inter_700Bold",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 22,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 25,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  headerTitle: {
    fontSize: 27,
    fontWeight: "900",
    color: "white",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.45,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.78)",
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    padding: 16,
  },
  emptyCard: {
    marginTop: 28,
    backgroundColor: "white",
    borderRadius: 26,
    paddingVertical: 42,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 11,
    shadowColor: "#9A3412",
    shadowOpacity: 0.07,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(254,215,170,0.5)",
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FED7AA",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    textAlign: "center",
  },
  messageWrap: {
    marginBottom: 10,
  },
  myWrap: {
    alignItems: "flex-end",
  },
  otherWrap: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: "#EA580C",
    borderTopRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: "white",
    borderTopLeftRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  messageText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  myMessageText: {
    color: "white",
  },
  otherMessageText: {
    color: "#0F172A",
  },
  messageTime: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    marginTop: 5,
    alignSelf: "flex-end",
  },
  myTime: {
    color: "rgba(255,255,255,0.7)",
  },
  otherTime: {
    color: "#94A3B8",
  },

  footer: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#FED7AA",
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  input: {
    flex: 1,
    maxHeight: 106,
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: "#0F172A",
    fontFamily: "Inter_400Regular",
    backgroundColor: "#F8FAFC",
  },
  sendBtn: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EA580C",
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  whatsappBtn: {
    marginTop: 10,
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    flexDirection: "row",
    gap: 8,
  },
  whatsappBtnDisabled: {
    opacity: 0.45,
  },
  whatsappText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
  },
});
