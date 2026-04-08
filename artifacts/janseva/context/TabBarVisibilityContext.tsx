import React, { createContext, useContext, useRef, useCallback, useEffect } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from "react-native";
import {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

type TabBarVisibilityContextType = {
  tabBarTranslateY: SharedValue<number>;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  tabBarAnimatedStyle: { transform: { translateY: number }[] };
  TAB_BAR_HEIGHT: number;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityContextType | null>(null);

const TAB_BAR_HEIGHT = 90;
const SCROLL_THRESHOLD = 10;

export function TabBarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const tabBarTranslateY = useSharedValue(0);
  const lastOffsetRef = useRef(0);
  const isHiddenRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentOffset = event.nativeEvent.contentOffset.y;
      const diff = currentOffset - lastOffsetRef.current;

      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }

      scrollTimerRef.current = setTimeout(() => {
        if (isHiddenRef.current) {
          tabBarTranslateY.value = withTiming(0, {
            duration: 250,
            easing: Easing.out(Easing.cubic),
          });
          isHiddenRef.current = false;
        }
      }, 800);

      if (currentOffset <= 0) {
        if (isHiddenRef.current) {
          tabBarTranslateY.value = withTiming(0, {
            duration: 250,
            easing: Easing.out(Easing.cubic),
          });
          isHiddenRef.current = false;
        }
        lastOffsetRef.current = currentOffset;
        return;
      }

      if (diff > SCROLL_THRESHOLD && !isHiddenRef.current) {
        tabBarTranslateY.value = withTiming(TAB_BAR_HEIGHT + 40, {
          duration: 300,
          easing: Easing.in(Easing.cubic),
        });
        isHiddenRef.current = true;
      } else if (diff < -SCROLL_THRESHOLD && isHiddenRef.current) {
        tabBarTranslateY.value = withTiming(0, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });
        isHiddenRef.current = false;
      }

      lastOffsetRef.current = currentOffset;
    },
    [tabBarTranslateY],
  );

  const tabBarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabBarTranslateY.value }],
  }));

  return (
    <TabBarVisibilityContext.Provider
      value={{ tabBarTranslateY, handleScroll, tabBarAnimatedStyle: tabBarAnimatedStyle as any, TAB_BAR_HEIGHT }}
    >
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) {
    return {
      tabBarTranslateY: { value: 0 } as SharedValue<number>,
      handleScroll: (_e: NativeSyntheticEvent<NativeScrollEvent>) => {},
      tabBarAnimatedStyle: {} as any,
      TAB_BAR_HEIGHT,
    };
  }
  return ctx;
}
