import React from "react";
import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function SelectServiceScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#052E16", "#166534", "#16A34A"]}
      style={{
        flex: 1,
      }}
    >
      <SafeAreaView
        style={{
          flex: 1,
          paddingHorizontal: 24,
          justifyContent: "center",
        }}
      >
        <View
          style={{
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <Text
            style={{
              fontSize: 34,
              color: "white",
              fontFamily: "Inter_800ExtraBold",
            }}
          >
            Connect T
          </Text>

          <Text
            style={{
              color: "rgba(255,255,255,0.75)",
              marginTop: 10,
              fontSize: 15,
              textAlign: "center",
            }}
          >
            Choose your service
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.replace("/(tabs)" as any)}
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            padding: 22,
            marginBottom: 18,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                backgroundColor: "#DCFCE7",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
              }}
            >
              <Feather name="shield" size={28} color="#166534" />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  color: "#0F172A",
                  fontFamily: "Inter_700Bold",
                }}
              >
                Civic Services
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  color: "#64748B",
                  lineHeight: 20,
                }}
              >
                Complaints, alerts, wards and public services
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.replace("/jobs" as any)}
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            padding: 22,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                backgroundColor: "#DBEAFE",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
              }}
            >
              <Feather name="briefcase" size={28} color="#2563EB" />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  color: "#0F172A",
                  fontFamily: "Inter_700Bold",
                }}
              >
                Local Jobs
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  color: "#64748B",
                  lineHeight: 20,
                }}
              >
                Find nearby jobs and employment opportunities
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}
