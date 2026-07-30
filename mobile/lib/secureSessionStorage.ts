import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const LEGACY_PREFIX = "connect_t_secret_migration_";

function legacyKey(key: string) {
  return `${LEGACY_PREFIX}${key}`;
}

/**
 * Expo SecureStore only accepts alphanumeric characters plus `.`, `-` and `_`
 * in native keys. OTP session identifiers intentionally contain `:` separators,
 * so encode every unsupported character instead of passing the raw key to
 * SecureStore. The encoding is deterministic and collision-resistant for the
 * session keys used by Connect-T.
 */
export function toNativeSecureStoreKey(key: string) {
  return String(key || "").replace(/[^A-Za-z0-9._-]/g, (character) => {
    const code = character.codePointAt(0)?.toString(16) || "0";
    return `_x${code}_`;
  });
}

export async function setSessionSecret(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(legacyKey(key), value);
    return;
  }

  const secureKey = toNativeSecureStoreKey(key);
  await SecureStore.setItemAsync(secureKey, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
  await AsyncStorage.removeItem(key).catch(() => undefined);
  await AsyncStorage.removeItem(legacyKey(key)).catch(() => undefined);
}

export async function getSessionSecret(key: string): Promise<string | null> {
  if (Platform.OS === "web") return AsyncStorage.getItem(legacyKey(key));

  const secureKey = toNativeSecureStoreKey(key);
  const stored = await SecureStore.getItemAsync(secureKey);
  if (stored) return stored;

  // One-time migration for installations created before encrypted storage was
  // introduced. The legacy value is deleted immediately after migration.
  const legacy = await AsyncStorage.getItem(key);
  if (!legacy) return null;
  await SecureStore.setItemAsync(secureKey, legacy, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
  await AsyncStorage.removeItem(key);
  return legacy;
}

export async function deleteSessionSecret(key: string): Promise<void> {
  if (Platform.OS !== "web") {
    await SecureStore.deleteItemAsync(toNativeSecureStoreKey(key)).catch(() => undefined);
  }
  await Promise.all([
    AsyncStorage.removeItem(key),
    AsyncStorage.removeItem(legacyKey(key)),
  ]);
}
