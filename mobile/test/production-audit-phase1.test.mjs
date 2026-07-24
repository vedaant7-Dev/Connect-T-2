import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("OTP UI has persistent resend timing, restart recovery, and duplicate-submit guards", () => {
  const login = read("app/login.tsx");
  const otpApi = read("lib/otpApi.ts");
  assert.match(login, /Resend OTP in/);
  assert.match(login, /getOtpSessionState/);
  assert.match(login, /getActiveOtpSessionState/);
  assert.match(login, /registration details and OTP timer were restored/);
  assert.match(login, /if \(loading \|\| resending\) return/);
  assert.match(otpApi, /ACTIVE_OTP_SESSION_KEY/);
  assert.match(otpApi, /resendAt/);
  assert.match(otpApi, /draft\?: OtpSessionDraft/);
  assert.match(otpApi, /secureSessionStorage/);
  assert.match(otpApi, /OTP_SESSION_EXPIRED/);
});

test("complaints use retry-safe request ids for image and text-only submissions", () => {
  const context = read("context/ComplaintContext.tsx");
  const screen = read("app/complaint/new.tsx");
  assert.match(context, /apiPostForm/);
  assert.ok(context.includes('form.append("photo"'));
  assert.match(context, /submitMultipartWithNetworkRecovery/);
  assert.match(context, /clientRequestId\?: string/);
  assert.match(context, /client_request_id: clientRequestId/);
  assert.match(context, /COMPLAINT_UPLOAD_INCOMPLETE/);
  assert.doesNotMatch(context, /result\.photo_url \|\| data\.photoAsset\.uri/);
  assert.match(screen, /requestIdRef/);
  assert.match(screen, /clientRequestId: requestIdRef\.current/);
  assert.match(screen, /VERIFIED CONTACT NUMBER/);
  assert.match(screen, /This verified number cannot be changed/);
  assert.match(screen, /Remove complaint image/);
  assert.match(screen, /Uploading image/);
  assert.match(screen, /keyboardVisible \? <SubmitButton inline/);
});

test("native image permissions are declared without unnecessary microphone access", () => {
  const appConfig = read("app.json");
  assert.match(appConfig, /expo-image-picker/);
  assert.match(appConfig, /NSCameraUsageDescription/);
  assert.match(appConfig, /NSPhotoLibraryUsageDescription/);
  assert.match(appConfig, /"microphonePermission": false/);
});
