export type ServiceCategoryIconName = string;

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
  if (/diagnostic|laborator|pathology|\blab(s)?\b/.test(key)) return "microscope";
  if (/fire station|fire brigade|\bfire\b/.test(key)) return "fire-truck";
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
  if (/\bbank(s)?\b/.test(key)) return "bank-outline";

  return fallback || "map-marker-outline";
}
