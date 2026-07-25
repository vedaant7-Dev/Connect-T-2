import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { BroadcastMediaUpload } from "@/context/BroadcastContext";

const ORANGE = "#EA580C";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_DURATION_MS = 5 * 60 * 1000;

function fileNameFrom(asset: ImagePicker.ImagePickerAsset) {
  if (asset.fileName) return asset.fileName;
  const extension = asset.type === "video" ? "mp4" : "jpg";
  return `broadcast_${Date.now()}.${extension}`;
}

function mimeFrom(asset: ImagePicker.ImagePickerAsset) {
  if (asset.mimeType) return asset.mimeType.toLowerCase();
  const name = String(asset.fileName || asset.uri).toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".mp4")) return "video/mp4";
  return asset.type === "video" ? "video/mp4" : "image/jpeg";
}

export default function BroadcastMediaPicker({
  value,
  onChange,
  onError,
  disabled,
}: {
  value: BroadcastMediaUpload | null;
  onChange: (media: BroadcastMediaUpload | null) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const pick = async () => {
    onError("");
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        onError("Allow photo and video access to attach broadcast media.");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.85,
      videoMaxDuration: 300,
      selectionLimit: 1,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;

    const type = asset.type === "video" ? "video" : "image";
    const mimeType = mimeFrom(asset);
    const fileName = fileNameFrom(asset);
    const sizeBytes = asset.fileSize || asset.file?.size || undefined;
    const durationMs = asset.duration ?? null;

    if (type === "image" && !["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      onError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    if (type === "video" && !["video/mp4", "video/quicktime"].includes(mimeType)) {
      onError("Choose an MP4 or MOV video.");
      return;
    }
    if (type === "image" && sizeBytes && sizeBytes > MAX_IMAGE_BYTES) {
      onError("Image must be smaller than 10MB.");
      return;
    }
    if (type === "video" && sizeBytes && sizeBytes > MAX_VIDEO_BYTES) {
      onError("Video must be smaller than 50MB.");
      return;
    }
    if (type === "video" && durationMs && durationMs > MAX_VIDEO_DURATION_MS) {
      onError("Video duration cannot exceed 5 minutes.");
      return;
    }

    onChange({
      uri: asset.uri,
      type,
      mimeType,
      fileName,
      sizeBytes,
      durationMs,
      webFile: asset.file || null,
    });
  };

  return (
    <View>
      {!value ? (
        <TouchableOpacity style={styles.addButton} onPress={pick} disabled={disabled} accessibilityRole="button">
          <View style={styles.addIcon}><Feather name="paperclip" size={18} color={ORANGE} /></View>
          <View style={styles.addCopy}>
            <Text style={styles.addTitle}>Add image or video</Text>
            <Text style={styles.addSub}>Images up to 10MB · MP4/MOV video up to 5 minutes and 50MB</Text>
          </View>
          <Feather name="plus" size={18} color={ORANGE} />
        </TouchableOpacity>
      ) : (
        <View style={styles.preview}>
          {value.type === "image" ? (
            <Image source={{ uri: value.uri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.videoPreview}><Feather name="play-circle" size={34} color={ORANGE} /></View>
          )}
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle} numberOfLines={1}>{value.fileName}</Text>
            <Text style={styles.previewSub}>
              {value.type === "video"
                ? `Video${value.durationMs ? ` · ${Math.ceil(value.durationMs / 1000)} sec` : " · duration verified on server"}`
                : "Image"}
              {value.sizeBytes ? ` · ${(value.sizeBytes / (1024 * 1024)).toFixed(1)}MB` : ""}
            </Text>
          </View>
          <TouchableOpacity style={styles.remove} onPress={() => onChange(null)} disabled={disabled} accessibilityLabel="Remove broadcast media">
            <Feather name="trash-2" size={17} color="#DC2626" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: { minHeight: 68, borderRadius: 15, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#FDBA74", backgroundColor: "#FFF7ED", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 10 },
  addIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  addCopy: { flex: 1, minWidth: 0 },
  addTitle: { color: "#9A3412", fontSize: 12.5, fontFamily: "Inter_700Bold" },
  addSub: { marginTop: 3, color: "#C2410C", fontSize: 9.5, lineHeight: 14, fontFamily: "Inter_400Regular" },
  preview: { minHeight: 76, borderRadius: 15, borderWidth: 1, borderColor: "#FED7AA", backgroundColor: "#FFF7ED", flexDirection: "row", alignItems: "center", padding: 9, gap: 10 },
  previewImage: { width: 58, height: 58, borderRadius: 12, backgroundColor: "#F1F5F9" },
  videoPreview: { width: 58, height: 58, borderRadius: 12, backgroundColor: "#FFEDD5", alignItems: "center", justifyContent: "center" },
  previewCopy: { flex: 1, minWidth: 0 },
  previewTitle: { color: "#0F172A", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  previewSub: { marginTop: 4, color: "#64748B", fontSize: 9.5, lineHeight: 14, fontFamily: "Inter_400Regular" },
  remove: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" },
});
