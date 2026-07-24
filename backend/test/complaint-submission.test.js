"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("production bootstrap loads both complaint submission protections", () => {
  const bootstrap = read("productionBootstrap.js");
  assert.match(bootstrap, /complaintUploadPatch\.js/);
  assert.match(bootstrap, /complaintJsonPatch\.js/);
});

test("text-only complaints are authenticated, idempotent, and transactional", () => {
  const source = read("complaintJsonPatch.js");
  assert.match(source, /verifyRequestToken/);
  assert.match(source, /currentUser\(req\)/);
  assert.match(source, /client_request_id/);
  assert.match(source, /uniq_complaints_client_request/);
  assert.match(source, /findExistingComplaint/);
  assert.match(source, /ER_DUP_ENTRY/);
  assert.match(source, /beginTransaction/);
  assert.match(source, /rollback/);
  assert.match(source, /user\.id,\s*user\.name,\s*userMobile/);
  assert.doesNotMatch(source, /req\.body\?\.user_id/);
});

test("image complaints authenticate before upload and verify binary signatures", () => {
  const source = read("complaintUploadPatch.js");
  const authPosition = source.indexOf("const user = await currentUser(req)");
  const uploadPosition = source.indexOf("await runUpload(req, res)");
  assert.ok(authPosition >= 0 && uploadPosition > authPosition, "authentication must happen before Multer reads the file");
  assert.match(source, /hasExpectedSignature/);
  assert.match(source, /MAX_UPLOAD_BYTES/);
  assert.match(source, /ER_DUP_ENTRY/);
  assert.match(source, /fs\.promises\.unlink/);
});
