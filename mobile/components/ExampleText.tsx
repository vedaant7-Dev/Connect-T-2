import React from "react";
import { Text } from "react-native";
import { INTER_SEMIBOLD } from "../constants/Fonts";

export default function ExampleText() {
  return (
    <Text style={{ fontFamily: INTER_SEMIBOLD, fontSize: 18 }}>
      This is Inter SemiBold!
    </Text>
  );
}
