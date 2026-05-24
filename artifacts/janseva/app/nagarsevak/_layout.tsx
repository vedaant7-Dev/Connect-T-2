import { Stack } from "expo-router";

export default function NagarsevakLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ animation: "fade" }} />
      <Stack.Screen name="register" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="pending" options={{ animation: "fade" }} />
    </Stack>
  );
}
