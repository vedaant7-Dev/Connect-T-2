"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");

const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "connect-t-message-media-"));
process.env.UPLOAD_DIR = uploadDir;

const { managedMediaPath, removeManagedMedia, saveDataUri } = require("../mediaStorage");
const { validImageDataUri } = require("../jobPortalMessagePatch");

after(() => fs.rmSync(uploadDir, { recursive: true, force: true }));

test("managed message images are identified and removed without accepting arbitrary paths", async () => {
  const pngHeader = Buffer.from("89504e470d0a1a0a", "hex").toString("base64");
  const dataUri = `data:image/png;base64,${pngHeader}`;
  const req = { protocol: "https", get: () => "connect-t.test" };

  assert.equal(validImageDataUri(dataUri), true);
  assert.equal(validImageDataUri("https://tracker.example/image.png"), false);

  const url = await saveDataUri(dataUri, "job_message", req, { allowedMimeTypes: ["image/png"] });
  const filePath = managedMediaPath(url, "job_message");
  assert.ok(filePath);
  assert.equal(fs.existsSync(filePath), true);

  assert.equal(await removeManagedMedia(url, "job_message"), true);
  assert.equal(fs.existsSync(filePath), false);
  assert.equal(managedMediaPath("../../etc/passwd", "job_message"), null);
  assert.equal(await removeManagedMedia("https://example.test/uploads/not-managed.png", "job_message"), false);
});

test("message media is persisted only after identity, relationship and seeker-limit checks", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "..", "jobPortalMessagePatch.js"), "utf8");
  const peopleCheck = source.indexOf("SELECT id, role FROM job_portal_users");
  const limitCheck = source.indexOf("SEEKER_MESSAGE_LIMIT");
  const saveCall = source.indexOf("await saveDataUri(rawMedia");
  const insertCall = source.indexOf("INSERT INTO job_portal_messages");

  assert.ok(peopleCheck >= 0 && limitCheck > peopleCheck);
  assert.ok(saveCall > limitCheck);
  assert.ok(insertCall > saveCall);
  assert.match(source, /if \(savedMediaUrl && !inserted\)/);
  assert.match(source, /await removeManagedMedia\(savedMediaUrl, "job_message"\)/);
});
