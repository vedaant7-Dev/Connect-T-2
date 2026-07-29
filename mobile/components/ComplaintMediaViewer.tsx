import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";

type MediaKind = "image" | "video";

type Props = {
  uri?: string | null;
  title?: string;
  label?: string;
  accentColor?: string;
};

const VIDEO_EXTENSIONS = new Set(["mp4", "m4v", "mov", "webm", "3gp", "3gpp", "mkv", "avi"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]);

export function inferComplaintMediaKind(uri?: string | null): MediaKind {
  const value = String(uri || "").trim().toLowerCase();
  if (value.startsWith("data:video/")) return "video";
  if (value.startsWith("data:image/")) return "image";
  const cleanPath = value.split("?")[0].split("#")[0];
  const extension = cleanPath.split(".").pop() || "";
  if (VIDEO_EXTENSIONS.has(extension) || value.includes("/video/")) return "video";
  return "image";
}

function mediaExtension(uri: string, kind: MediaKind) {
  const dataMime = uri.match(/^data:([^;,]+)/i)?.[1]?.toLowerCase();
  if (dataMime) {
    const subtype = dataMime.split("/")[1]?.replace("jpeg", "jpg");
    if (subtype) return subtype;
  }
  const cleanPath = decodeURIComponent(uri.split("?")[0].split("#")[0]);
  const extension = cleanPath.split(".").pop()?.toLowerCase() || "";
  if (kind === "video" && VIDEO_EXTENSIONS.has(extension)) return extension;
  if (kind === "image" && IMAGE_EXTENSIONS.has(extension)) return extension === "jpeg" ? "jpg" : extension;
  return kind === "video" ? "mp4" : "jpg";
}

function mediaMimeType(uri: string, kind: MediaKind) {
  const dataMime = uri.match(/^data:([^;,]+)/i)?.[1];
  if (dataMime) return dataMime;
  const extension = mediaExtension(uri, kind);
  if (kind === "video") {
    if (extension === "mov") return "video/quicktime";
    if (extension === "webm") return "video/webm";
    if (["3gp", "3gpp"].includes(extension)) return "video/3gpp";
    return "video/mp4";
  }
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (["heic", "heif"].includes(extension)) return "image/heic";
  return "image/jpeg";
}

function mediaFileName(uri: string, kind: MediaKind) {
  const raw = decodeURIComponent(uri.split("?")[0].split("#")[0]).split("/").pop() || "";
  const extension = mediaExtension(uri, kind);
  const stem = raw.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 50) || "complaint-evidence";
  return `${stem}.${extension}`;
}

async function localMediaUri(uri: string, kind: MediaKind) {
  if (uri.startsWith("file://")) return uri;
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) throw new Error("Temporary storage is unavailable on this device.");
  const target = `${cacheDirectory}connect-t-${Date.now()}-${mediaFileName(uri, kind)}`;
  const dataMatch = uri.match(/^data:[^;,]+;base64,(.+)$/i);
  if (dataMatch) {
    await FileSystem.writeAsStringAsync(target, dataMatch[1], { encoding: FileSystem.EncodingType.Base64 });
    return target;
  }
  if (uri.startsWith("content://")) {
    await FileSystem.copyAsync({ from: uri, to: target });
    return target;
  }
  const result = await FileSystem.downloadAsync(uri, target);
  return result.uri;
}

function downloadOnWeb(uri: string, kind: MediaKind) {
  const documentObject = (globalThis as any).document;
  if (!documentObject?.createElement) throw new Error("Downloads are not supported in this browser.");
  const link = documentObject.createElement("a");
  link.href = uri;
  link.download = mediaFileName(uri, kind);
  link.rel = "noopener";
  documentObject.body.appendChild(link);
  link.click();
  link.remove();
}

function FullScreenVideo({ uri }: { uri: string }) {
  const source = useMemo(() => ({ uri, useCaching: true }), [uri]);
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = false;
    instance.play();
  });
  return <VideoView player={player} style={styles.fullMedia} nativeControls contentFit="contain" />;
}

function ActionButton({ icon, label, onPress, busy, accentColor }: { icon: any; label: string; onPress: () => void; busy?: boolean; accentColor: string }) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} disabled={busy} activeOpacity={0.82} accessibilityRole="button" accessibilityLabel={label}>
      {busy ? <ActivityIndicator size="small" color={accentColor} /> : <Feather name={icon} size={17} color={accentColor} />}
      <Text style={[styles.actionText, { color: accentColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ComplaintMediaViewer({ uri, title = "Complaint evidence", label = "Complaint evidence", accentColor = "#EA580C" }: Props) {
  const safeUri = String(uri || "").trim();
  const kind = inferComplaintMediaKind(safeUri);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<"save" | "share" | null>(null);

  if (!safeUri) return null;

  const saveMedia = async () => {
    if (busyAction) return;
    setBusyAction("save");
    try {
      if (Platform.OS === "web") {
        downloadOnWeb(safeUri, kind);
      } else {
        const permission = await MediaLibrary.requestPermissionsAsync();
        if (!permission.granted) throw new Error("Allow photo and video access to save complaint evidence.");
        const localUri = await localMediaUri(safeUri, kind);
        await MediaLibrary.saveToLibraryAsync(localUri);
      }
      Alert.alert("Saved", `${kind === "video" ? "Video" : "Image"} saved to your device.`);
    } catch (error) {
      Alert.alert("Save failed", error instanceof Error ? error.message : "The media could not be saved. Please try again.");
    } finally {
      setBusyAction(null);
    }
  };

  const shareMedia = async () => {
    if (busyAction) return;
    setBusyAction("share");
    try {
      if (Platform.OS === "web") {
        const navigatorObject = (globalThis as any).navigator;
        if (navigatorObject?.share) await navigatorObject.share({ title, url: safeUri });
        else await Share.share({ message: safeUri });
      } else {
        const localUri = await localMediaUri(safeUri, kind);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(localUri, { dialogTitle: `Share ${title}`, mimeType: mediaMimeType(safeUri, kind) });
        } else {
          await Share.share({ title, message: safeUri, url: safeUri });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "The media could not be shared. Please try again.";
      if (!/cancel/i.test(message)) Alert.alert("Share failed", message);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.previewButton} onPress={() => setViewerOpen(true)} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={`View full complaint ${kind}`}>
        {kind === "video" ? (
          <View style={styles.videoPreview}>
            <View style={styles.playCircle}><Feather name="play" size={30} color="white" /></View>
            <Text style={styles.videoPreviewTitle}>Complaint video</Text>
            <Text style={styles.videoPreviewHint}>Tap to play inside the app</Text>
          </View>
        ) : (
          <Image source={{ uri: safeUri }} style={styles.previewImage} resizeMode="cover" />
        )}
        <View style={styles.viewOverlay}>
          <Feather name="maximize-2" size={15} color="white" />
          <Text style={styles.viewOverlayText}>View full {kind}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.captionRow}>
        <View style={styles.captionTextWrap}>
          <Feather name={kind === "video" ? "video" : "image"} size={15} color="#64748B" />
          <Text style={styles.captionText} numberOfLines={1}>{label}</Text>
        </View>
        <View style={styles.inlineActions}>
          <ActionButton icon="eye" label="View" onPress={() => setViewerOpen(true)} accentColor={accentColor} />
          <ActionButton icon="download" label="Save" onPress={saveMedia} busy={busyAction === "save"} accentColor={accentColor} />
          <ActionButton icon="share-2" label="Share" onPress={shareMedia} busy={busyAction === "share"} accentColor={accentColor} />
        </View>
      </View>

      <Modal visible={viewerOpen} animationType="fade" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => setViewerOpen(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>{title}</Text>
              <Text style={styles.modalSubtitle}>{kind === "video" ? "Complaint video" : "Complaint image"}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={() => setViewerOpen(false)} accessibilityRole="button" accessibilityLabel="Close full media viewer">
              <Feather name="x" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.mediaStage}>
            {kind === "video" ? <FullScreenVideo uri={safeUri} /> : <Image source={{ uri: safeUri }} style={styles.fullMedia} resizeMode="contain" />}
          </View>
          <View style={styles.modalActions}>
            <ActionButton icon="download" label="Save" onPress={saveMedia} busy={busyAction === "save"} accentColor="white" />
            <ActionButton icon="share-2" label="Share" onPress={shareMedia} busy={busyAction === "share"} accentColor="white" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "white", borderRadius: 18, overflow: "hidden", marginBottom: 14, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  previewButton: { minHeight: 220, backgroundColor: "#0F172A", position: "relative" },
  previewImage: { width: "100%", height: 240, backgroundColor: "#E2E8F0" },
  videoPreview: { minHeight: 240, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#0F172A" },
  playCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.32)", alignItems: "center", justifyContent: "center", paddingLeft: 4 },
  videoPreviewTitle: { marginTop: 14, fontSize: 17, color: "white", fontFamily: "Inter_700Bold" },
  videoPreviewHint: { marginTop: 5, fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular" },
  viewOverlay: { position: "absolute", right: 12, bottom: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(15,23,42,0.78)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  viewOverlayText: { fontSize: 11, color: "white", fontFamily: "Inter_600SemiBold" },
  captionRow: { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9", gap: 8 },
  captionTextWrap: { flexDirection: "row", alignItems: "center", gap: 7 },
  captionText: { flex: 1, fontSize: 12, color: "#475569", fontFamily: "Inter_600SemiBold" },
  inlineActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 },
  actionButton: { minHeight: 42, minWidth: 70, paddingHorizontal: 10, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(148,163,184,0.1)" },
  actionText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  modalRoot: { flex: 1, backgroundColor: "#020617" },
  modalHeader: { paddingTop: Platform.OS === "android" ? 42 : 54, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(2,6,23,0.96)" },
  modalTitle: { color: "white", fontSize: 16, fontFamily: "Inter_700Bold" },
  modalSubtitle: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  closeButton: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
  mediaStage: { flex: 1, alignItems: "center", justifyContent: "center", padding: 8 },
  fullMedia: { width: "100%", height: "100%" },
  modalActions: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 30 : 18, flexDirection: "row", justifyContent: "center", gap: 12, backgroundColor: "rgba(2,6,23,0.96)" },
});
