"use strict";
const assert = require("node:assert/strict"); const fs = require("node:fs"); const path = require("node:path"); const test = require("node:test");
const root = path.resolve(__dirname, ".."); const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
test("utility status edit delete is owner-bound and loaded first", () => { const bootstrap = read("productionBootstrap.js"); assert.ok(bootstrap.indexOf('"./utilityStatusActionsPatch.js"') < bootstrap.indexOf('"./utilityStatusPatch.js"')); const source = read("utilityStatusActionsPatch.js"); assert.match(source, /posted_by_id/); assert.match(source, /You can update only utility statuses posted from your account/); assert.match(source, /\/api\/utility-status\/:id/); assert.match(source, /is_active = 0/); });
