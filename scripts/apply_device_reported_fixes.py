from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing source block: {label}")
    return text.replace(old, new, 1)


# Shared media viewer: callers can hide card Save/Share and fullscreen Share.
path = ROOT / "mobile/components/ComplaintMediaViewer.tsx"
text = path.read_text()
text = replace_once(
    text,
    "  showInlineViewAction?: boolean;\n  rightActions?: React.ReactNode;",
    "  showInlineViewAction?: boolean;\n  showInlineSaveAction?: boolean;\n  showInlineShareAction?: boolean;\n  showFullScreenSaveAction?: boolean;\n  showFullScreenShareAction?: boolean;\n  rightActions?: React.ReactNode;",
    "media viewer props",
)
text = replace_once(
    text,
    "  showInlineViewAction = true,\n  rightActions,",
    "  showInlineViewAction = true,\n  showInlineSaveAction = true,\n  showInlineShareAction = true,\n  showFullScreenSaveAction = true,\n  showFullScreenShareAction = true,\n  rightActions,",
    "media viewer defaults",
)
text = replace_once(
    text,
    "  const compactActionRow = !!rightActions;\n",
    "  const compactActionRow = !!rightActions;\n  const hasInlineActions = showInlineViewAction || showInlineSaveAction || showInlineShareAction;\n",
    "inline action state",
)
old_actions = '''        <View style={[styles.actionBar, compactActionRow && styles.actionBarCompact]}>
          <View style={[styles.inlineActions, compactActionRow && styles.actionGroupCompact]}>
            {showInlineViewAction ? (
              <ActionButton icon="eye" label="View" onPress={() => setViewerOpen(true)} accentColor={accentColor} compact={compactActionRow} />
            ) : null}
            <ActionButton icon="download" label="Save" onPress={saveMedia} busy={busyAction === "save"} accentColor={accentColor} compact={compactActionRow} />
            <ActionButton icon="share-2" label="Share" onPress={shareMedia} busy={busyAction === "share"} accentColor={accentColor} compact={compactActionRow} />
          </View>
          {rightActions ? <View style={[styles.rightActions, compactActionRow && styles.rightActionsCompact]}>{rightActions}</View> : null}
        </View>'''
new_actions = '''        {hasInlineActions || rightActions ? (
          <View style={[styles.actionBar, compactActionRow && styles.actionBarCompact]}>
            {hasInlineActions ? <View style={[styles.inlineActions, compactActionRow && styles.actionGroupCompact]}>
              {showInlineViewAction ? (
                <ActionButton icon="eye" label="View" onPress={() => setViewerOpen(true)} accentColor={accentColor} compact={compactActionRow} />
              ) : null}
              {showInlineSaveAction ? <ActionButton icon="download" label="Save" onPress={saveMedia} busy={busyAction === "save"} accentColor={accentColor} compact={compactActionRow} /> : null}
              {showInlineShareAction ? <ActionButton icon="share-2" label="Share" onPress={shareMedia} busy={busyAction === "share"} accentColor={accentColor} compact={compactActionRow} /> : null}
            </View> : null}
            {rightActions ? <View style={[styles.rightActions, compactActionRow && styles.rightActionsCompact, !hasInlineActions && styles.rightActionsOnly]}>{rightActions}</View> : null}
          </View>
        ) : null}'''
text = replace_once(text, old_actions, new_actions, "inline media actions")
old_modal = '''          <View style={styles.modalActions}>
            <ActionButton icon="download" label="Save" onPress={saveMedia} busy={busyAction === "save"} accentColor="white" />
            <ActionButton icon="share-2" label="Share" onPress={shareMedia} busy={busyAction === "share"} accentColor="white" />
          </View>'''
new_modal = '''          {showFullScreenSaveAction || showFullScreenShareAction ? <View style={styles.modalActions}>
            {showFullScreenSaveAction ? <ActionButton icon="download" label="Save" onPress={saveMedia} busy={busyAction === "save"} accentColor="white" /> : null}
            {showFullScreenShareAction ? <ActionButton icon="share-2" label="Share" onPress={shareMedia} busy={busyAction === "share"} accentColor="white" /> : null}
          </View> : null}'''
text = replace_once(text, old_modal, new_modal, "fullscreen media actions")
text = replace_once(
    text,
    '  rightActionsCompact: { flexShrink: 1, minWidth: 0, gap: 5 },',
    '  rightActionsCompact: { flexShrink: 1, minWidth: 0, gap: 5 },\n  rightActionsOnly: { flex: 1, width: "100%", justifyContent: "flex-end" },',
    "right actions only style",
)
path.write_text(text)


# Broadcast Center: one Share action shares the complete post; full-screen keeps Save only.
path = ROOT / "mobile/screens/BroadcastCenterMediaScreen.tsx"
text = path.read_text()
text = replace_once(
    text,
    'import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";',
    'import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";',
    "broadcast share import",
)
text = replace_once(
    text,
    'import ComplaintMediaViewer from "@/components/ComplaintMediaViewer";',
    'import ComplaintMediaViewer, { resolveComplaintMediaUri } from "@/components/ComplaintMediaViewer";',
    "broadcast media resolver import",
)
marker = 'function makeIdempotencyKey() { return `broadcast_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`; }\n'
helper = '''function makeIdempotencyKey() { return `broadcast_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`; }
async function shareBroadcast(item: AppBroadcast) {
  const category = CATEGORIES.find((entry) => entry.key === item.category)?.label || "Announcement";
  const mediaUrl = resolveComplaintMediaUri(item.mediaUri);
  const message = [
    item.title,
    item.body,
    `Category: ${category}`,
    `Audience: ${item.ward || "All wards"}`,
    `Posted by: ${item.createdByName || "Connect-T"}`,
    mediaUrl ? `Media: ${mediaUrl}` : "",
    "— Connect-T",
  ].filter(Boolean).join("\\n\\n");
  try {
    const navigatorObject = (globalThis as any).navigator;
    if (Platform.OS === "web" && navigatorObject?.share) await navigatorObject.share({ title: item.title, text: message, url: mediaUrl || undefined });
    else await Share.share({ title: item.title, message });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error || "");
    if (!/cancel/i.test(detail)) console.warn("Broadcast share failed", detail);
  }
}
'''
text = replace_once(text, marker, helper, "broadcast share helper")
text = replace_once(
    text,
    "  const adminActions = (\n    <>\n",
    "  const adminActions = (\n    <>\n      <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={() => void shareBroadcast(item)}><Feather name=\"share-2\" size={14} color=\"#C2410C\" /><Text style={styles.shareText}>Share</Text></TouchableOpacity>\n",
    "broadcast share action",
)
text = replace_once(
    text,
    "          showInlineViewAction={false}\n          rightActions={adminActions}",
    "          showInlineViewAction={false}\n          showInlineSaveAction={false}\n          showInlineShareAction={false}\n          showFullScreenShareAction={false}\n          rightActions={adminActions}",
    "broadcast media action flags",
)
text = replace_once(
    text,
    'pauseButton: { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" }, resumeButton:',
    'shareButton: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }, shareText: { color: "#C2410C", fontSize: 10.5, fontFamily: "Inter_700Bold" }, pauseButton: { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" }, resumeButton:',
    "broadcast share styles",
)
path.write_text(text)


# Citizen News feed: Share includes title, caption/description and media URL; media fullscreen only has Save.
path = ROOT / "mobile/app/(tabs)/feed.tsx"
text = path.read_text()
text = replace_once(
    text,
    'import ComplaintMediaViewer from "@/components/ComplaintMediaViewer";',
    'import ComplaintMediaViewer, { resolveComplaintMediaUri } from "@/components/ComplaintMediaViewer";',
    "feed media resolver import",
)
text = replace_once(
    text,
    'async function shareText(title: string, body: string) { const message = `${title}\\n\\n${body}\\n\\n— Connect-T Ambernath`; if (Platform.OS === "web" && typeof navigator !== "undefined" && (navigator as any).share) await (navigator as any).share({ title, text: message }); else await Share.share({ title, message }); }',
    'async function shareText(title: string, body: string, mediaUri?: string | null) { const mediaUrl = resolveComplaintMediaUri(mediaUri); const message = `${title}\\n\\n${body}${mediaUrl ? `\\n\\nMedia: ${mediaUrl}` : ""}\\n\\n— Connect-T Ambernath`; if (Platform.OS === "web" && typeof navigator !== "undefined" && (navigator as any).share) await (navigator as any).share({ title, text: message, url: mediaUrl || undefined }); else await Share.share({ title, message }); }',
    "feed share helper",
)
text = replace_once(
    text,
    '<ComplaintMediaViewer uri={item.media.uri} title={item.title} label={item.media.type === "video" ? "Official video" : "Official image"} autoPlay active={active} />',
    '<ComplaintMediaViewer uri={item.media.uri} title={item.title} label={item.media.type === "video" ? "Official video" : "Official image"} autoPlay active={active} showInlineSaveAction={false} showInlineShareAction={false} showFullScreenShareAction={false} />',
    "alert media flags",
)
text = text.replace(
    'onPress={() => void shareText(item.title, item.body)}',
    'onPress={() => void shareText(item.title, item.body, item.media?.uri)}',
    1,
)
text = replace_once(
    text,
    '<ComplaintMediaViewer uri={item.mediaUri} title={item.title} label={item.mediaType === "video" ? "Broadcast video" : "Broadcast image"} autoPlay active={active} />',
    '<ComplaintMediaViewer uri={item.mediaUri} title={item.title} label={item.mediaType === "video" ? "Broadcast video" : "Broadcast image"} autoPlay active={active} showInlineSaveAction={false} showInlineShareAction={false} showFullScreenShareAction={false} />',
    "broadcast feed media flags",
)
text = replace_once(
    text,
    ': null}<View style={styles.broadcastFooter}><View style={styles.newsInfoChip}',
    ': null}<TouchableOpacity style={styles.officialShare} onPress={() => void shareText(item.title, item.body, item.mediaUri)}><Feather name="share-2" size={14} color="#059669" /><Text style={styles.officialShareText}>Share official update</Text></TouchableOpacity><View style={styles.broadcastFooter}><View style={styles.newsInfoChip}',
    "broadcast feed share action",
)
path.write_text(text)
