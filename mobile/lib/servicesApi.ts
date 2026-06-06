import { apiGet } from "@/lib/api";

export interface Contact {
  name: string;
  phone: string;
  role?: string;
}

export interface Review {
  reviewer: string;
  rating: number;
  comment: string;
  date: string;
}

export interface ServicePlace {
  id: string;
  name: string;
  address: string;
  distance: string;
  distanceKm: number;
  contacts: Contact[];
  type: string;
  speciality?: string;
  timing?: string;
  govtType?: "Government" | "Private" | "Municipal" | "Trust" | string;
  established?: number;
  beds?: number;
  bedsOccupied?: number;
  services?: string[];
  rating?: number;
  reviewCount?: number;
  reviews?: Review[];
}

export type ServiceCategory = {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  data: ServicePlace[];
};

export interface EmergencyContact {
  name: string;
  number: string;
  icon: string;
  color: string;
  bg: string;
}

function normalizeServicePlace(raw: any): ServicePlace {
  return {
    id: String(raw.id || ""),
    name: String(raw.name || ""),
    address: String(raw.address || ""),
    distance: String(raw.distance || ""),
    distanceKm: Number(raw.distanceKm ?? raw.distance_km ?? 0),
    contacts: Array.isArray(raw.contacts) ? raw.contacts : [],
    type: String(raw.type || raw.category_id || ""),
    speciality: raw.speciality || undefined,
    timing: raw.timing || undefined,
    govtType: raw.govtType || raw.govt_type || undefined,
    established: raw.established === undefined || raw.established === null ? undefined : Number(raw.established),
    beds: raw.beds === undefined || raw.beds === null ? undefined : Number(raw.beds),
    bedsOccupied: raw.bedsOccupied === undefined && raw.beds_occupied === undefined ? undefined : Number(raw.bedsOccupied ?? raw.beds_occupied),
    services: Array.isArray(raw.services) ? raw.services : [],
    rating: raw.rating === undefined || raw.rating === null ? undefined : Number(raw.rating),
    reviewCount: raw.reviewCount === undefined && raw.review_count === undefined ? undefined : Number(raw.reviewCount ?? raw.review_count),
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
  };
}

export async function fetchServiceCatalog(): Promise<ServiceCategory[]> {
  const res = await apiGet<any>("/api/services/catalog");
  const categories = Array.isArray(res.categories) ? res.categories : [];

  return categories.map((cat: any) => ({
    id: String(cat.id || ""),
    label: String(cat.label || cat.id || "Services"),
    icon: String(cat.icon || "map-pin"),
    color: String(cat.color || "#EA580C"),
    bgColor: String(cat.bgColor || cat.bg_color || "#FFEDD5"),
    data: Array.isArray(cat.data) ? cat.data.map(normalizeServicePlace) : [],
  }));
}

function emergencyIconDefaults(typeOrIcon?: string) {
  const key = String(typeOrIcon || "").toLowerCase();

  if (key.includes("shield") || key.includes("police")) return { icon: "shield", color: "#1E40AF", bg: "#DBEAFE" };
  if (key.includes("activity") || key.includes("ambulance")) return { icon: "activity", color: "#DC2626", bg: "#FEE2E2" };
  if (key.includes("fire") || key.includes("alert-octagon")) return { icon: "alert-octagon", color: "#EA580C", bg: "#FFEDD5" };
  if (key.includes("child") || key.includes("heart")) return { icon: "heart", color: "#059669", bg: "#D1FAE5" };
  if (key.includes("women") || key.includes("user")) return { icon: "user", color: "#7C3AED", bg: "#EDE9FE" };

  return { icon: "phone", color: "#0EA5E9", bg: "#BAE6FD" };
}

export async function fetchEmergencyContacts(): Promise<EmergencyContact[]> {
  const res = await apiGet<any>("/api/emergency");
  const rows = Array.isArray(res.emergencyContacts) ? res.emergencyContacts : [];

  return rows.map((item: any) => {
    const defaults = emergencyIconDefaults(item.icon || item.type || item.name);
    return {
      name: String(item.name || ""),
      number: String(item.number || item.phone || ""),
      icon: String(item.icon || defaults.icon),
      color: String(item.color || defaults.color),
      bg: String(item.bg || defaults.bg),
    };
  }).filter((item: EmergencyContact) => item.name && item.number);
}
