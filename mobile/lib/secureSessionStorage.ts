import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const LEGACY_PREFIX = "connect_t_secret_migration_";
const AUTH_TOKEN_KEY = "connect_t_auth_token_v1";
const OTP_VERIFICATION_KEY = "connect_t_otp_verification_v1";
export const JOB_PORTAL_IDENTITY_KEY = "connect_t_job_portal_otp_identity_v1";

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

async function writeSecret(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(legacyKey(key), value);
    return;
  }

  await SecureStore.setItemAsync(toNativeSecureStoreKey(key), value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
  await AsyncStorage.removeItem(key).catch(() => undefined);
  await AsyncStorage.removeItem(legacyKey(key)).catch(() => undefined);
}

export async function setSessionSecret(key: string, value: string): Promise<void> {
  await writeSecret(key, value);

  // The normal Civic login stores a bearer token and then removes the short-lived
  // OTP header. Keep a separate, mobile-bound copy only for the first Job Portal
  // profile handoff so setup never depends on a fragile Civic bearer session.
  if (key === OTP_VERIFICATION_KEY) {
    await writeSecret(JOB_PORTAL_IDENTITY_KEY, value);
  }
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

async function removeSecret(key: string): Promise<void> {
  if (Platform.OS !== "web") {
    await SecureStore.deleteItemAsync(toNativeSecureStoreKey(key)).catch(() => undefined);
  }
  await Promise.all([
    AsyncStorage.removeItem(key),
    AsyncStorage.removeItem(legacyKey(key)),
  ]);
}

export async function deleteSessionSecret(key: string): Promise<void> {
  await removeSecret(key);

  // A real logout clears the Civic token, so also remove the temporary Job Portal
  // identity copy. Deleting the normal OTP header after login must not remove it.
  if (key === AUTH_TOKEN_KEY) {
    await removeSecret(JOB_PORTAL_IDENTITY_KEY);
  }
}
