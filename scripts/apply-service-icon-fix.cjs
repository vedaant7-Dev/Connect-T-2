"use strict";

const fs = require("fs");

const read = (path) => fs.readFileSync(path, "utf8");
const write = (path, value) => fs.writeFileSync(path, value);

fs.writeFileSync(
  "mobile/lib/serviceCategoryIcons.ts",
  `export type ServiceCategoryIconName = string;

function serviceKey(id?: string, label?: string) {
  return [id, label]
    .map((value) => String(value || ""))
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function resolveServiceIcon(id?: string, label?: string, fallback = "map-marker-outline"): ServiceCategoryIconName {
  const key = serviceKey(id, label);

  if (/ambulance/.test(key)) return "ambulance";
  if (/blood bank|bloodbank/.test(key)) return "blood-bag";
  if (/diagnostic|laborator|pathology|\\blab(s)?\\b/.test(key)) return "microscope";
  if (/fire station|fire brigade|\\bfire\\b/.test(key)) return "fire-truck";
  if (/municipal office|municipality|civic office|municipal corporation/.test(key)) return "city-variant-outline";
  if (/government office|govt office|government department/.test(key)) return "office-building-outline";
  if (/medical store|pharmacy|chemist|medicine store/.test(key)) return "pill";
  if (/child care|child hospital|pediatric|paediatric|children hospital/.test(key)) return "baby-face-outline";
  if (/hospital/.test(key)) return "hospital-building";
  if (/clinic/.test(key)) return "stethoscope";
  if (/police/.test(key)) return "shield-star-outline";
  if (/post office|postal/.test(key)) return "email-outline";
  if (/school|education/.test(key)) return "school-outline";
  if (/crematorium|shamshan|smashan/.test(key)) return "fire";
  if (/\\bbank(s)?\\b/.test(key)) return "bank-outline";

  return fallback || "map-marker-outline";
}
`,
);

let api = read("mobile/lib/servicesApi.ts");
if (!api.includes('serviceCategoryIcons')) {
  api = api.replace(
    'import { apiGet } from "@/lib/api";\n',
    'import { apiGet } from "@/lib/api";\nimport { resolveServiceIcon } from "@/lib/serviceCategoryIcons";\n',
  );
}
api = api.replace(
  /icon:\s*String\(cat\.icon\s*\|\|\s*"map-pin"\),/,
  'icon: resolveServiceIcon(cat.id, cat.label, String(cat.icon || "map-marker-outline")),',
);
write("mobile/lib/servicesApi.ts", api);
console.log("Updated services API icon normalization");

let home = read("mobile/app/(tabs)/index.tsx");
home = home.replace(
  'import { Feather } from "@expo/vector-icons";',
  'import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";',
);
for (const [from, to] of [
  ['icon: "activity"', 'icon: "hospital-building"'],
  ['icon: "heart"', 'icon: "baby-face-outline"'],
  ['icon: "plus-circle"', 'icon: "stethoscope"'],
  ['icon: "shield"', 'icon: "shield-star-outline"'],
  ['icon: "credit-card"', 'icon: "bank-outline"'],
  ['icon: "mail"', 'icon: "email-outline"'],
  ['icon: "book-open"', 'icon: "school-outline"'],
  ['icon: "wind"', 'icon: "fire"'],
]) home = home.replace(from, to);
home = home.replace(
  /<Feather\s+name=\{svc\.icon as any\}\s+size=\{24\}\s+color=\{svc\.color\}\s*\/>/,
  '<MaterialCommunityIcons name={svc.icon as any} size={21} color={svc.color} />',
);
write("mobile/app/(tabs)/index.tsx", home);
console.log("Updated Home service symbols");

let services = read("mobile/app/(tabs)/services.tsx");
services = services.replace(
  'import { Feather } from "@expo/vector-icons";',
  'import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";',
);
services = services.replace(
  /<Feather\s+name=\{cat\.icon as any\}\s+size=\{12\}\s+color=\{selectedCat\.id === cat\.id \? "white" : "rgba\(255,255,255,0\.7\)"\}\s*\/>/,
  '<MaterialCommunityIcons\n                name={cat.icon as any}\n                size={11}\n                color={selectedCat.id === cat.id ? "white" : "rgba(255,255,255,0.7)"}\n              />',
);
write("mobile/app/(tabs)/services.tsx", services);
console.log("Updated Services category symbols");

let detail = read("mobile/app/service/[id].tsx");
detail = detail.replace(
  'import { Feather } from "@expo/vector-icons";',
  'import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";',
);
detail = detail.replace(
  /<Feather\s+name=\{category\.icon as any\}\s+size=\{28\}\s+color="white"\s*\/>/,
  '<MaterialCommunityIcons name={category.icon as any} size={24} color="white" />',
);
write("mobile/app/service/[id].tsx", detail);
console.log("Updated Service Detail category symbol");

let localCatalog = read("mobile/data/mumbaiServices.ts");
for (const [from, to] of [
  ['label: "Hospitals", icon: "activity"', 'label: "Hospitals", icon: "hospital-building"'],
  ['label: "Child Care", icon: "heart"', 'label: "Child Care", icon: "baby-face-outline"'],
  ['label: "Clinics", icon: "plus-circle"', 'label: "Clinics", icon: "stethoscope"'],
  ['label: "Police", icon: "shield"', 'label: "Police", icon: "shield-star-outline"'],
  ['label: "Banks", icon: "credit-card"', 'label: "Banks", icon: "bank-outline"'],
  ['label: "Post Office", icon: "mail"', 'label: "Post Office", icon: "email-outline"'],
  ['label: "Schools", icon: "book-open"', 'label: "Schools", icon: "school-outline"'],
  ['label: "Crematorium", icon: "wind"', 'label: "Crematorium", icon: "fire"'],
]) localCatalog = localCatalog.replace(from, to);
write("mobile/data/mumbaiServices.ts", localCatalog);
console.log("Updated local service catalog symbols");

for (const required of [
  ["mobile/app/(tabs)/index.tsx", "MaterialCommunityIcons name={svc.icon as any} size={21}"],
  ["mobile/app/(tabs)/services.tsx", "MaterialCommunityIcons"],
  ["mobile/app/service/[id].tsx", "MaterialCommunityIcons name={category.icon as any} size={24}"],
  ["mobile/lib/servicesApi.ts", "resolveServiceIcon"],
]) {
  if (!read(required[0]).includes(required[1])) throw new Error(`Icon update did not apply to ${required[0]}`);
}
