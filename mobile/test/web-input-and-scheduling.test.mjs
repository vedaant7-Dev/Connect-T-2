import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("web inputs do not use the browser black focus outline", () => {
  const css = read("global.css");
  assert.match(css, /input:focus/);
  assert.match(css, /outline:\s*none\s*!important/);
  assert.match(css, /box-shadow:\s*none\s*!important/);
});

test("official update and broadcast schedules use the shared date time picker", () => {
  const alertComposer = read("screens/AlertComposerScreen.tsx");
  const broadcasts = read("screens/BroadcastCenterScreen.tsx");
  const picker = read("components/AppDateTimePicker.tsx");
  assert.match(alertComposer, /AppDateTimePicker/);
  assert.doesNotMatch(alertComposer, /placeholder="2026-08-15 10:30"/);
  assert.match(broadcasts, /AppDateTimePicker/);
  assert.doesNotMatch(broadcasts, /placeholder="YYYY-MM-DD HH:mm"/);
  assert.match(picker, /type:\s*"datetime-local"/);
  assert.match(picker, /Array\.from\(\{ length: 366 \}/);
  assert.match(picker, /webWrap:\s*\{[^}]*flexDirection:\s*"row"/);
  assert.match(picker, /Select date and time/);
});

test("Render web export uses the sibling Render backend instead of stale Hostinger URL", () => {
  const render = read("../render.yaml");
  assert.match(render, /EXPO_PUBLIC_API_URL[\s\S]*fromService:[\s\S]*name: connect-t-2[\s\S]*envVarKey: RENDER_EXTERNAL_URL/);
  assert.doesNotMatch(render, /EXPO_PUBLIC_API_URL\n\s+value: https:\/\/newapp\.e-bjp\.in/);
});
