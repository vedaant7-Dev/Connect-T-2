import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const LEGACY_PREFIX = "connect_t_secret_migration_";

function legacyKey(key: string) {
  return `${LEGACY_PREFIX}${key}`;
}

export async function setSessionSecret(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(legacyKey(key), value);
    return;
  }

  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
  await AsyncStorage.removeItem(key).catch(() => undefined);
  await AsyncStorage.removeItem(legacyKey(key)).catch(() => undefined);
}

export async function getSessionSecret(key: string): Promise<string | null> {
  if (Platform.OS === "web") return AsyncStorage.getItem(legacyKey(key));

  const stored = await SecureStore.getItemAsync(key);
  if (stored) return stored;

  // One-time migration for installations created before encrypted storage was
  // introduced. The legacy value is deleted immediately after migration.
  const legacy = await AsyncStorage.getItem(key);
  if (!legacy) return null;
  await SecureStore.setItemAsync(key, legacy, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
  await AsyncStorage.removeItem(key);
  return legacy;
}

export async function deleteSessionSecret(key: string): Promise<void> {
  if (Platform.OS !== "web") await SecureStore.deleteItemAsync(key).catch(() => undefined);
  await Promise.all([
    AsyncStorage.removeItem(key),
    AsyncStorage.removeItem(legacyKey(key)),
  ]);
}
