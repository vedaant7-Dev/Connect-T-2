import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("vertical app content is centered and width-limited on web", () => {
  const scrollView = read("components/AppScrollView.tsx");

  assert.match(scrollView, /webContentMaxWidth = 960/);
  assert.match(scrollView, /Platform\.OS === "web" && !props\.horizontal/);
  assert.match(scrollView, /maxWidth: webContentMaxWidth/);
  assert.match(scrollView, /alignSelf: "center"/);
});

test("service catalog adds one useful All Services category for a complete four-column grid", () => {
  const services = read("lib/servicesApi.ts");

  assert.match(services, /id: "all"/);
  assert.match(services, /label: "All Services"/);
  assert.match(services, /icon: "grid"/);
  assert.match(services, /normalized\.push\(allServicesCategory\(normalized\)\)/);
  assert.match(services, /categories\.flatMap\(\(category(?:: ServiceCategory)?\) => category\.data\)/);
});
