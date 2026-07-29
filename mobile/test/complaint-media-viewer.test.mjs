import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("complaint evidence opens images and videos inside the app", () => {
  const viewer = read("components/ComplaintMediaViewer.tsx");
  assert.match(viewer, /VideoView/);
  assert.match(viewer, /View full \{kind\}/);
  assert.match(viewer, /Tap to play inside the app/);
  assert.doesNotMatch(viewer, /Linking\.openURL/);
});

test("complaint evidence supports device save and native share", () => {
  const viewer = read("components/ComplaintMediaViewer.tsx");
  assert.match(viewer, /MediaLibrary\.saveToLibraryAsync/);
  assert.match(viewer, /Sharing\.shareAsync/);
  assert.match(viewer, /FileSystem\.downloadAsync/);
});

test("citizen, officer and super admin complaint views use the shared media viewer", () => {
  const detail = read("app/complaint/[id].tsx");
  const admin = read("app/super-admin/index.tsx");
  assert.match(detail, /ComplaintMediaViewer/);
  assert.match(admin, /ComplaintMediaViewer/);
});
