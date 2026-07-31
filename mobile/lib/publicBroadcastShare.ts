import { Platform, Share } from "react-native";

import { API_BASE_URL } from "@/constants/api";
import type { AppBroadcast } from "@/context/BroadcastContext";

function categoryLabel(category: AppBroadcast["category"]) {
  if (category === "news") return "News";
  if (category === "emergency") return "Emergency";
  if (category === "information") return "Information";
  if (category === "notice") return "Notice";
  return "Announcement";
}

export function broadcastShareUrl(id: string) {
  return `${API_BASE_URL}/share/broadcast/${encodeURIComponent(id)}`;
}

export async function shareOfficialBroadcast(item: AppBroadcast) {
  const url = broadcastShareUrl(item.id);
  const message = [
    item.title,
    item.body,
    `Category: ${categoryLabel(item.category)}`,
    `Audience: ${item.ward || "All citizens"}`,
    `Posted by: ${item.createdByName || "Connect-T"}`,
    "",
    `View complete update with ${item.mediaType === "video" ? "video" : item.mediaType === "image" ? "image" : "details"}:`,
    url,
    "",
    "— Connect-T",
  ].filter((line) => line !== undefined && line !== null).join("\n");

  const navigatorObject = (globalThis as any).navigator;
  if (Platform.OS === "web" && navigatorObject?.share) {
    await navigatorObject.share({ title: item.title, text: message, url });
    return;
  }
  await Share.share({ title: item.title, message, url });
}
