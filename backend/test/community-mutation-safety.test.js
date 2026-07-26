"use strict";

const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");

const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "connect-t-community-media-"));
process.env.UPLOAD_DIR = uploadDir;

const { feedPostPreflight, chatMessagePreflight } = require("../communityPreflightPatch");
const { managedMediaPath, saveDataUri } = require("../mediaStorage");

after(() => fs.rmSync(uploadDir, { recursive: true, force: true }));

function recorder() {
  return {
    statusCode: 200,
    body: null,
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

test("Feed rejects arbitrary external image URLs and strips client-generated IDs", () => {
  const rejectedReq = { body: { id: "client-post", content: "Hello", type: "general", image_uri: "https://tracker.example/pixel.png" } };
  const rejectedRes = recorder();
  feedPostPreflight(rejectedReq, rejectedRes, () => assert.fail("external image must not continue"));
  assert.equal(rejectedRes.statusCode, 415);
  assert.equal(rejectedRes.body.code, "UNSUPPORTED_FEED_IMAGE");

  const acceptedReq = { body: { id: "client-post", content: "  Civic update  ", type: "update", image_uri: "" } };
  let continued = false;
  feedPostPreflight(acceptedReq, recorder(), () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(acceptedReq.body.id, undefined);
  assert.equal(acceptedReq.body.content, "Civic update");
});

test("Civic Chat strips client IDs and rejects empty or oversized messages", () => {
  const req = { body: { id: "client-message", text: "  hello  " } };
  let continued = false;
  chatMessagePreflight(req, recorder(), () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(req.body.id, undefined);
  assert.equal(req.body.text, "hello");

  const emptyRes = recorder();
  chatMessagePreflight({ body: { text: "   " } }, emptyRes, () => assert.fail("empty message must not continue"));
  assert.equal(emptyRes.statusCode, 400);
});

test("managed uploads are automatically removed after failed or interrupted responses", async () => {
  const response = new EventEmitter();
  response.statusCode = 500;
  const req = { protocol: "https", get: () => "connect-t.test", res: response };
  const pngHeader = Buffer.from("89504e470d0a1a0a", "hex").toString("base64");
  const url = await saveDataUri(`data:image/png;base64,${pngHeader}`, "feed", req, { allowedMimeTypes: ["image/png"] });
  const filePath = managedMediaPath(url, "feed");
  assert.ok(filePath && fs.existsSync(filePath));

  response.emit("finish");
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(fs.existsSync(filePath), false);
});
