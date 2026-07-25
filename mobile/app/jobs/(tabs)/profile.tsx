import React from "react";
import { StyleSheet, View } from "react-native";

import LocalizedJobPortalProfileScreen from "@/screens/LocalizedJobPortalProfileScreen";

export default function JobPortalProfileRoute() {
  return (
    <View style={styles.root}>
      <LocalizedJobPortalProfileScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
