"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

function read(file) {
  return fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
}

for (const file of ["complaintJsonPatch.js", "complaintUploadPatch.js"]) {
  test(`${file} skips approved officers whose role assignment is inactive or revoked`, () => {
    const source = read(file);

    assert.match(source, /SELECT id, mobile FROM users/);
    assert.match(source, /for \(const row of rows\)/);
    assert.match(source, /isPrivilegedRoleActive\(pool, \{/);
    assert.match(source, /role: "nagarsevak"/);
    assert.match(source, /if \(active\) return row\.id/);
    assert.doesNotMatch(source, /ORDER BY created_at ASC LIMIT 1/);
  });
}
