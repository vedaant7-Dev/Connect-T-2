"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("authoritative broadcast media route loads before legacy broadcast guards", () => {
  const bootstrap = read("productionBootstrap.js");
  const media = bootstrap.indexOf('"./broadcastMediaPatch.js"');
  const governance = bootstrap.indexOf('"./broadcastGovernancePatch.js"');
  const delivery = bootstrap.indexOf('"./broadcastDeliveryPatch.js"');
  assert.ok(media >= 0 && media < governance);
  assert.ok(governance >= 0 && governance < delivery);
});

test("broadcast media route provides deployment diagnostics and strict upload limits", () => {
  const source = read("broadcastMediaPatch.js");
  assert.match(source, /\/api\/broadcasts\/capabilities/);
  assert.match(source, /routeVersion: "broadcast-media-v1"/);
  assert.match(source, /MAX_IMAGE_BYTES = 10 \* 1024 \* 1024/);
  assert.match(source, /MAX_VIDEO_BYTES = 50 \* 1024 \* 1024/);
  assert.match(source, /MAX_VIDEO_DURATION_SECONDS = 5 \* 60/);
  assert.match(source, /Video duration cannot exceed 5 minutes/);
  assert.match(source, /hasExpectedSignature/);
  assert.match(source, /mp4DurationSeconds/);
});

test("MP4 duration parser reads the movie header timescale and duration", () => {
  const script = `
    const { mp4DurationSeconds } = require('./broadcastMediaPatch');
    const buffer = Buffer.alloc(80);
    buffer.write('mvhd', 8, 'ascii');
    buffer[12] = 0;
    buffer.writeUInt32BE(1000, 24);
    buffer.writeUInt32BE(300000, 28);
    const seconds = mp4DurationSeconds(buffer);
    if (seconds !== 300) throw new Error('Expected 300 seconds, received ' + seconds);
  `;
  const result = spawnSync(process.execPath, ["-e", script], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("broadcast media persistence is additive, idempotent, owner-bound and failure-safe", () => {
  const source = read("broadcastMediaPatch.js");
  assert.match(source, /media_uri TEXT NULL/);
  assert.match(source, /media_duration_seconds INT NULL/);
  assert.match(source, /SELECT \* FROM broadcasts WHERE idempotency_key/);
  assert.match(source, /BROADCAST_REQUEST_CONFLICT/);
  assert.match(source, /created_by/);
  assert.match(source, /storedMedia\?\.filePath/);
  assert.match(source, /fs\.promises\.unlink/);
  assert.match(source, /LIMIT_FILE_SIZE/);
  assert.match(source, /authorizeBroadcastUpload, uploadMiddleware, createBroadcast/);
});

test("super-admin broadcast ward input cannot silently widen to all wards", () => {
  const source = read("broadcastMediaPatch.js");
  assert.match(source, /INVALID_BROADCAST_WARD/);
  assert.match(source, /Select a valid ward from Ward 1 to Ward 29/);
});
