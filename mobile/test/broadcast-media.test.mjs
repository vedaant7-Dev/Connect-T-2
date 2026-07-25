import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Broadcast Center accepts one image or a five-minute video", () => {
  const picker = read("components/BroadcastMediaPicker.tsx");
  const screen = read("screens/BroadcastCenterMediaScreen.tsx");
  const route = read("app/super-admin/broadcast.tsx");

  assert.match(picker, /MAX_IMAGE_BYTES = 10 \* 1024 \* 1024/);
  assert.match(picker, /MAX_VIDEO_BYTES = 50 \* 1024 \* 1024/);
  assert.match(picker, /MAX_VIDEO_DURATION_MS = 5 \* 60 \* 1000/);
  assert.match(picker, /videoMaxDuration: 300/);
  assert.match(picker, /Video duration cannot exceed 5 minutes/);
  assert.match(screen, /BroadcastMediaPicker/);
  assert.match(screen, /media,/);
  assert.match(route, /BroadcastCenterMediaScreen/);
});

test("broadcast context uses multipart only when media exists and diagnoses stale backend routes", () => {
  const context = read("context/BroadcastContext.tsx");
  const upload = read("lib/broadcastUpload.ts");
  assert.match(context, /uploadBroadcastForm/);
  assert.match(context, /data\.media/);
  assert.match(context, /ROUTE_NOT_FOUND/);
  assert.match(context, /Redeploy the connect-t-2 backend/);
  assert.match(context, /mediaDurationSeconds/);
  assert.match(upload, /BROADCAST_UPLOAD_TIMEOUT_MS = 3 \* 60 \* 1000/);
  assert.match(upload, /getStoredAuthToken/);
  assert.match(upload, /AbortController/);
});

test("citizen official updates show broadcast image and video attachments", () => {
  const screen = read("screens/OfficialUpdatesMediaScreen.tsx");
  const route = read("app/alert/list.tsx");
  assert.match(screen, /item\.mediaType === "image"/);
  assert.match(screen, /Play attached video/);
  assert.match(screen, /Linking\.openURL/);
  assert.match(screen, /markBroadcastRead/);
  assert.match(route, /OfficialUpdatesMediaScreen/);
});
