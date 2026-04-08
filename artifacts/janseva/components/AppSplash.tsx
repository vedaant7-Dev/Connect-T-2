import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Animated, Dimensions, Image, Platform,
} from "react-native";

const { width, height } = Dimensions.get("window");
const NDR = Platform.OS !== "web"; // useNativeDriver — not supported on web

interface AppSplashProps {
  onFinish: () => void;
}

export function AppSplash({ onFinish }: AppSplashProps) {
  const logoScale = useRef(new Animated.Value(0.25)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(14)).current;
  const circleScale = useRef(new Animated.Value(0)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const dotScale1 = useRef(new Animated.Value(0)).current;
  const dotScale2 = useRef(new Animated.Value(0)).current;
  const dotScale3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      // Phase 1: Logo springs in (0–700ms)
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 45,
          friction: 7,
          useNativeDriver: NDR,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: NDR,
        }),
      ]),
      // Phase 2: Brand name + tagline slide up (700–1050ms)
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: NDR,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: NDR,
        }),
        Animated.timing(taglineY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: NDR,
        }),
      ]),
      // Phase 3: Loading dots pop in staggered (1050–1350ms)
      Animated.stagger(110, [
        Animated.spring(dotScale1, { toValue: 1, tension: 80, friction: 6, useNativeDriver: NDR }),
        Animated.spring(dotScale2, { toValue: 1, tension: 80, friction: 6, useNativeDriver: NDR }),
        Animated.spring(dotScale3, { toValue: 1, tension: 80, friction: 6, useNativeDriver: NDR }),
      ]),
      // Phase 4: Hold (1350–1900ms)
      Animated.delay(480),
      // Phase 5: White ripple expands from center
      Animated.parallel([
        Animated.timing(circleScale, {
          toValue: 42,
          duration: 520,
          useNativeDriver: NDR,
        }),
        Animated.timing(circleOpacity, {
          toValue: 1,
          duration: 140,
          useNativeDriver: NDR,
        }),
      ]),
      // Phase 6: Fade out entire overlay
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: NDR,
      }),
    ]);

    sequence.start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* Layered navy gradient background */}
      <View style={styles.bgBase} />
      <View style={styles.bgMid} />
      <View style={styles.bgAccent} />

      {/* Decorative circular arcs */}
      <View style={[styles.arc, styles.arcOuter]} />
      <View style={[styles.arc, styles.arcInner]} />

      {/* Ripple burst that fills the screen on exit */}
      <Animated.View style={[styles.ripple, { opacity: circleOpacity, transform: [{ scale: circleScale }] }]} />

      {/* ─── Main centered content ─── */}
      <View style={styles.center}>
        {/* Logo mark */}
        <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoGlow} />
          <Image
            source={require("../assets/images/logo_transparent.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Brand name */}
        <Animated.View style={{ opacity: textOpacity, alignItems: "center" }}>
          <Text style={styles.brandName}>JanSeva</Text>
        </Animated.View>

        {/* Taglines */}
        <Animated.View style={[styles.taglineWrap, { opacity: taglineOpacity, transform: [{ translateY: taglineY }] }]}>
          <Text style={styles.taglineEn}>Citizen Services Platform</Text>
          <Text style={styles.taglineHi}>नागरिकों की सेवा में</Text>
        </Animated.View>

        {/* Loading indicator dots */}
        <View style={styles.dotsRow}>
          {([dotScale1, dotScale2, dotScale3] as Animated.Value[]).map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                i === 1 && styles.dotCenter,
                { transform: [{ scale: dot }] },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Bottom: Indian flag stripes + city label */}
      <Animated.View style={[styles.footer, { opacity: taglineOpacity }]}>
        <View style={styles.flagRow}>
          <View style={[styles.stripe, { backgroundColor: "#F97316" }]} />
          <View style={[styles.stripe, { backgroundColor: "white", opacity: 0.7 }]} />
          <View style={[styles.stripe, { backgroundColor: "#22C55E" }]} />
        </View>
        <Text style={styles.footerText}>Mumbai BMC · 2025</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    overflow: "hidden",
  },
  bgBase: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0C1A3A" },
  bgMid: { ...StyleSheet.absoluteFillObject, backgroundColor: "#1E3A8A", opacity: 0.65 },
  bgAccent: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: height * 0.38,
    backgroundColor: "#1E40AF", opacity: 0.45,
  },
  arc: {
    position: "absolute",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(99,146,234,0.14)",
  },
  arcOuter: { width: width * 1.5, height: width * 1.5, top: -width * 0.9 },
  arcInner: { width: width * 1.1, height: width * 1.1, bottom: -width * 0.75 },
  ripple: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EFF6FF",
    zIndex: 8,
  },
  center: { alignItems: "center", zIndex: 10 },
  logoWrap: { marginBottom: 22, alignItems: "center", justifyContent: "center" },
  logoGlow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#3B82F6",
    opacity: 0.15,
  },
  logoImg: { width: 140, height: 140 },
  brandName: {
    fontSize: 46,
    fontWeight: "900",
    color: "white",
    letterSpacing: -1.5,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  taglineWrap: { alignItems: "center", gap: 5 },
  taglineEn: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.8,
  },
  taglineHi: {
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 1.5,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 52,
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotCenter: {
    width: 10,
    height: 10,
    backgroundColor: "#60A5FA",
  },
  footer: {
    position: "absolute",
    bottom: 52,
    alignItems: "center",
    gap: 8,
    zIndex: 10,
  },
  flagRow: { flexDirection: "row", gap: 3 },
  stripe: { width: 28, height: 3.5, borderRadius: 2 },
  footerText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.28)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 1.5,
    marginTop: 2,
  },
});
