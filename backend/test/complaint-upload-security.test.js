"use strict";

process.env.JWT_SECRET = "connect-t-test-secret-with-more-than-thirty-two-characters";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  isAllowedComplaintCategory,
  normalizeWardCode,
  uploadFileFilter,
} = require("../complaintUploadPatch");
const { hasExpectedSignature } = require("../mediaStorage");

test("complaint upload authenticates before parsing the multipart body", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "complaintUploadPatch.js"), "utf8");
  const authIndex = source.indexOf("const user = await currentUser(req)");
  const uploadIndex = source.indexOf("await runUpload(req, res)");
  assert.ok(authIndex >= 0, "authentication call is present");
  assert.ok(uploadIndex >= 0, "multipart parser call is present");
  assert.ok(authIndex < uploadIndex, "authentication happens before multipart parsing");
  assert.match(source, /error\?\.code === "ER_DUP_ENTRY"/);
  assert.match(source, /findExistingComplaint\(requestId/);
});

test("complaint categories and wards use strict allowlists", () => {
  for (const category of ["roads", "water", "electricity", "garbage", "drainage", "streetlight", "encroachment", "other"]) {
    assert.equal(isAllowedComplaintCategory(category), true, category);
  }
  assert.equal(isAllowedComplaintCategory("../../admin"), false);
  assert.equal(isAllowedComplaintCategory("unknown"), false);
  assert.equal(normalizeWardCode("Ward 29"), "29");
  assert.equal(normalizeWardCode("Ward 30"), null);
});

test("upload filter rejects unapproved MIME types before buffering", () => {
  let accepted = null;
  let error = null;
  uploadFileFilter({}, { mimetype: "image/jpeg" }, (nextError, nextAccepted) => {
    error = nextError;
    accepted = nextAccepted;
  });
  assert.equal(error, null);
  assert.equal(accepted, true);

  uploadFileFilter({}, { mimetype: "image/svg+xml" }, (nextError) => {
    error = nextError;
  });
  assert.equal(error?.status, 415);
  assert.equal(error?.code, "UNSUPPORTED_IMAGE");
});

test("file signatures must match the claimed image type", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  const png = Buffer.from("89504e470d0a1a0a", "hex");
  assert.equal(hasExpectedSignature(jpeg, "image/jpeg"), true);
  assert.equal(hasExpectedSignature(jpeg, "image/png"), false);
  assert.equal(hasExpectedSignature(png, "image/png"), true);
  assert.equal(hasExpectedSignature(Buffer.from("not an image"), "image/jpeg"), false);
});
