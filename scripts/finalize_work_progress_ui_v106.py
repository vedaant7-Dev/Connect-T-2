from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def update(path: str, transform):
    file_path = ROOT / path
    text = file_path.read_text(encoding="utf-8")
    next_text = transform(text)
    if next_text == text:
        raise RuntimeError(f"No change made to {path}")
    file_path.write_text(next_text, encoding="utf-8")


def remove_broadcast_preview(text: str) -> str:
    marker = "              <View style={styles.preview}><Text style={styles.previewLabel}>PREVIEW</Text>"
    if marker not in text:
        raise RuntimeError("Broadcast preview marker not found")
    start = text.index(marker)
    line_end = text.index("\n", start)
    return text[:start] + text[line_end + 1 :]


def tidy_official_updates(text: str) -> str:
    text = text.replace(
        '        <Text style={styles.headerTitle}>{c("title")}</Text>\n                <View style={styles.stats}>',
        '        <Text style={styles.headerTitle}>{c("title")}</Text>\n        <View style={styles.stats}>',
    )
    text = text.replace(
        '                {item.externalPushStatus === "not_configured" ? <Text style={styles.pushWarning}>{pushMissingLabel}</Text> : null}',
        '        {item.externalPushStatus === "not_configured" ? <Text style={styles.pushWarning}>{pushMissingLabel}</Text> : null}',
    )
    text = text.replace(
        'message={pendingDelete ? `${c("removeMessage")}\n\n${pendingDelete.title}` : c("removeMessage")}',
        'message={pendingDelete ? `${c("removeMessage")} — ${pendingDelete.title}` : c("removeMessage")}',
    )
    return text


def fix_home_video(text: str) -> str:
    import_line = 'import { AppScrollView } from "@/components/AppScrollView";\n'
    if 'import ComplaintMediaViewer from "@/components/ComplaintMediaViewer";' not in text:
        if import_line not in text:
            raise RuntimeError("Home import marker not found")
        text = text.replace(
            import_line,
            import_line + 'import ComplaintMediaViewer from "@/components/ComplaintMediaViewer";\n',
            1,
        )
    old = '<InlineVideo uri={selectedAlert.media.uri} style={styles.modalVideoPlayer} />'
    if old not in text:
        raise RuntimeError("Home InlineVideo usage not found")
    return text.replace(
        old,
        '<ComplaintMediaViewer uri={selectedAlert.media.uri} title={selectedAlert.title} label="Official video" accentColor="#EA580C" />',
        1,
    )


update("mobile/screens/BroadcastCenterMediaScreen.tsx", remove_broadcast_preview)
update("mobile/app/(tabs)/index.tsx", fix_home_video)
for relative in [
    "mobile/screens/OfficialUpdatesMediaScreen.tsx",
    "mobile/screens/OfficialUpdatesScreen.tsx",
]:
    path = ROOT / relative
    original = path.read_text(encoding="utf-8")
    path.write_text(tidy_official_updates(original), encoding="utf-8")

print("WORK_PROGRESS_UI_V106_FINAL applied")
