"use strict";

const fs = require("fs");

const read = (path) => fs.readFileSync(path, "utf8");
const write = (path, value) => fs.writeFileSync(path, value);
const replaceRequired = (value, from, to, label) => {
  if (!value.includes(from)) throw new Error(`Missing expected source for ${label}`);
  return value.replace(from, to);
};

fs.writeFileSync(
  "mobile/lib/serviceCategoryIcons.ts",
  `export type ServiceCategoryIconName = string;

function serviceKey(id?: string, label?: string) {
  return \`${"${String(id || \"\")} ${String(label || \"\")}"}\`
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
api = replaceRequired(
  api,
  'import { apiGet } from "@/lib/api";\n',
  'import { apiGet } from "@/lib/api";\nimport { resolveServiceIcon } from "@/lib/serviceCategoryIcons";\n',
  "services API icon resolver import",
);
api = replaceRequired(
  api,
  '    icon: String(cat.icon || "map-pin"),',
  '    icon: resolveServiceIcon(cat.id, cat.label, String(cat.icon || "map-marker-outline")),',
  "services API category icon normalization",
);
write("mobile/lib/servicesApi.ts", api);

let home = read("mobile/app/(tabs)/index.tsx");
home = replaceRequired(
  home,
  'import { Feather } from "@expo/vector-icons";',
  'import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";',
  "home icon import",
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
home = replaceRequired(
  home,
  '<Feather name={svc.icon as any} size={24} color={svc.color} />',
  '<MaterialCommunityIcons name={svc.icon as any} size={21} color={svc.color} />',
  "home service icon component and size",
);
write("mobile/app/(tabs)/index.tsx", home);

let services = read("mobile/app/(tabs)/services.tsx");
services = replaceRequired(
  services,
  'import { Feather } from "@expo/vector-icons";',
  'import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";',
  "services icon import",
);
services = replaceRequired(
  services,
  `<Feather
                 name={cat.icon as any}
                 size={12}
                 color={selectedCat.id === cat.id ? "white" : "rgba(255,255,255,0.7)"}
               />`,
  `<MaterialCommunityIcons
                 name={cat.icon as any}
                 size={11}
                 color={selectedCat.id === cat.id ? "white" : "rgba(255,255,255,0.7)"}
               />`,
  "services category chip icon",
);
write("mobile/app/(tabs)/services.tsx", services);

let detail = read("mobile/app/service/[id].tsx");
detail = replaceRequired(
  detail,
  'import { Feather } from "@expo/vector-icons";',
  'import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";',
  "service detail icon import",
);
detail = replaceRequired(
  detail,
  '<Feather name={category.icon as any} size={28} color="white" />',
  '<MaterialCommunityIcons name={category.icon as any} size={24} color="white" />',
  "service detail category icon",
);
write("mobile/app/service/[id].tsx", detail);

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
