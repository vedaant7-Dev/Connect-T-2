import React, { useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import TopShade from "@/components/TopShade";
import { INTER_BOLD, INTER_REGULAR } from "@/constants/Fonts";

const { width } = Dimensions.get("window");

export type SplashPortal = "portal_select" | "secret_access";

interface AppSplashProps {
  onFinish: (portal: SplashPortal) => void;
}

export function AppSplash({ onFinish }: AppSplashProps) {
  const logoTapCount = useRef(0);
  const logoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressScale = useRef(new Animated.Value(1)).current;

  const animateLogoTap = () => {
    Animated.sequence([
      Animated.timing(pressScale, {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(pressScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleLogoPress = () => {
    animateLogoTap();

    logoTapCount.current += 1;

    if (logoTapTimer.current) {
      clearTimeout(logoTapTimer.current);
    }

    if (logoTapCount.current >= 7) {
      logoTapCount.current = 0;
      onFinish("secret_access");
      return;
    }

    logoTapTimer.current = setTimeout(() => {
      logoTapCount.current = 0;
    }, 2500);
  };

  const handleContinue = () => {
    onFinish("portal_select");
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#9A3412", "#C2410C", "#EA580C", "#F97316", "#FB923C"]}
        locations={[0, 0.25, 0.55, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />

      <TopShade height={220} />

      <View style={[decor.blob, decor.b1]} />
      <View style={[decor.blob, decor.b2]} />
      <View style={[decor.ring, decor.r1]} />
      <View style={[decor.ring, decor.r2]} />
      <View style={[decor.ring, decor.r3]} />

      <View style={styles.centre}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={handleLogoPress}
          style={styles.logoTouch}
        >
          <Animated.View
            style={[styles.logoWrap, { transform: [{ scale: pressScale }] }]}
          >
            <Image
              source={require("../assets/images/connectt-logo-v3.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </Animated.View>
        </TouchableOpacity>

        <Text style={styles.appName}>Connect T</Text>

        <View style={styles.taglineWrap}>
          <Text style={styles.taglineEn}>Civic Services Platform</Text>
          <Text style={styles.taglineHi}>सबका साथ, सबका विकास</Text>
        </View>

        <Text style={styles.poweredBy}>Powered by Connect T</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
          activeOpacity={0.84}
        >
          <View style={styles.continueBtnInner}>
            <Text style={styles.continueBtnText}>Continue</Text>
            <View style={styles.continueBtnIcon}>
              <Feather name="arrow-right" size={18} color="#059669" />
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.continueHint}>Tap to continue</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    overflow: "hidden",
  },
  centre: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoTouch: {
    marginBottom: 18,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg: {
    width: 200,
    height: 200,
  },
  appName: {
    fontSize: 32,
    fontWeight: "900",
    color: "white",
    fontFamily: INTER_BOLD,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  taglineWrap: {
    alignItems: "center",
    gap: 6,
  },
  taglineEn: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    fontFamily: INTER_REGULAR,
    letterSpacing: 0.8,
  },
  taglineHi: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    fontFamily: INTER_REGULAR,
    letterSpacing: 1.5,
  },
  poweredBy: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    fontFamily: INTER_REGULAR,
    letterSpacing: 0.5,
    marginTop: 16,
  },
  footer: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    paddingBottom: 52,
    paddingHorizontal: 32,
  },
  continueBtn: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "white",
  },
  continueBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#059669",
    fontFamily: INTER_BOLD,
    letterSpacing: 0.3,
  },
  continueBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  continueHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    fontFamily: INTER_REGULAR,
    letterSpacing: 0.5,
  },
});

const decor = StyleSheet.create({
  blob: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  ring: {
    position: "absolute",
    borderRadius: 9999,
    borderColor: "rgba(255,255,255,0.20)",
    borderWidth: 1.5,
  },
  b1: {
    width: width * 0.5,
    height: width * 0.5,
    top: -width * 0.16,
    right: -width * 0.14,
  },
  b2: {
    width: width * 0.28,
    height: width * 0.28,
    bottom: -width * 0.1,
    left: -width * 0.08,
  },
  r1: {
    width: width * 0.88,
    height: width * 0.88,
    top: -width * 0.32,
    right: -width * 0.32,
  },
  r2: {
    width: width * 0.62,
    height: width * 0.62,
    top: -width * 0.1,
    right: -width * 0.1,
  },
  r3: {
    width: width * 0.72,
    height: width * 0.72,
    bottom: -width * 0.28,
    left: -width * 0.26,
  },
});
