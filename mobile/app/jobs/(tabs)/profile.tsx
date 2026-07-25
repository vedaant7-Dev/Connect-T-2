import React from "react";
import { StyleSheet, View } from "react-native";

import ProfileLanguageButton from "@/components/ProfileLanguageButton";
import LocalizedJobPortalProfileScreen from "@/screens/LocalizedJobPortalProfileScreen";

export default function JobPortalProfileRoute() {
  return (
    <View style={styles.root}>
      <LocalizedJobPortalProfileScreen />
      <ProfileLanguageButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
