import React, { useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView as NativeScrollView,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from "react-native";

type AppScrollViewProps = ScrollViewProps & {
  onAppRefresh?: () => void | Promise<void>;
  refreshColor?: string;
  webContentMaxWidth?: number | false;
};

export function AppScrollView({
  onAppRefresh,
  refreshColor = "#EA580C",
  refreshControl,
  contentContainerStyle,
  webContentMaxWidth = 960,
  ...props
}: AppScrollViewProps) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (onAppRefresh) await onAppRefresh();
      else await new Promise((resolve) => setTimeout(resolve, 250));
    } finally {
      setRefreshing(false);
    }
  };

  const responsiveWebContent: StyleProp<ViewStyle> =
    Platform.OS === "web" && !props.horizontal && webContentMaxWidth !== false
      ? {
          width: "100%",
          maxWidth: webContentMaxWidth,
          alignSelf: "center",
        }
      : undefined;

  return (
    <NativeScrollView
      {...props}
      alwaysBounceVertical={props.alwaysBounceVertical ?? !props.horizontal}
      automaticallyAdjustKeyboardInsets={props.automaticallyAdjustKeyboardInsets ?? !props.horizontal}
      contentInsetAdjustmentBehavior={props.contentInsetAdjustmentBehavior ?? (props.horizontal ? "never" : "automatic")}
      contentContainerStyle={[responsiveWebContent, contentContainerStyle]}
      keyboardDismissMode={props.keyboardDismissMode ?? (props.horizontal ? "none" : Platform.OS === "ios" ? "interactive" : "on-drag")}
      keyboardShouldPersistTaps={props.keyboardShouldPersistTaps ?? "handled"}
      refreshControl={props.horizontal ? refreshControl : refreshControl || <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[refreshColor]} tintColor={refreshColor} />}
    />
  );
}
