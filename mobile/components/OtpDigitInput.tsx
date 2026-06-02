import React, { useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";

const ORANGE = "#EA580C";
const DARK = "#C2410C";

type OtpDigitInputProps = {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
};

export default function OtpDigitInput({ value, onChange, autoFocus = false }: OtpDigitInputProps) {
  const refs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4).split("");

  const setDigit = (index: number, text: string) => {
    const cleaned = text.replace(/\D/g, "");
    const next = [digits[0] || "", digits[1] || "", digits[2] || "", digits[3] || ""];

    if (cleaned.length > 1) {
      cleaned.slice(0, 4).split("").forEach((char, offset) => {
        if (index + offset < 4) next[index + offset] = char;
      });
      onChange(next.join("").slice(0, 4));
      const focusIndex = Math.min(index + cleaned.length, 3);
      refs[focusIndex]?.current?.focus();
      return;
    }

    next[index] = cleaned.slice(0, 1);
    onChange(next.join("").slice(0, 4));

    if (cleaned && index < 3) refs[index + 1]?.current?.focus();
    if (!cleaned && index > 0) refs[index - 1]?.current?.focus();
  };

  return (
    <View style={styles.row}>
      {[0, 1, 2, 3].map((index) => (
        <TextInput
          key={index}
          ref={refs[index]}
          value={digits[index] || ""}
          onChangeText={(text) => setDigit(index, text)}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={4}
          textAlign="center"
          autoFocus={autoFocus && index === 0}
          style={[styles.box, digits[index] ? styles.boxFilled : null]}
          placeholder=""
          placeholderTextColor="#CBD5E1"
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 14 },
  box: {
    width: 48,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    color: DARK,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    paddingVertical: 0,
    outlineWidth: 0,
  } as any,
  boxFilled: {
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    color: ORANGE,
  },
});
