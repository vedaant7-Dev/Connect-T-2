from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def save(relative: str, text: str) -> None:
    (ROOT / relative).write_text(text, encoding="utf-8")


def require(text: str, needle: str, relative: str) -> None:
    if needle not in text:
        raise RuntimeError(f"Expected marker not found in {relative}: {needle[:100]}")


def replace_once(text: str, old: str, new: str, relative: str) -> str:
    require(text, old, relative)
    return text.replace(old, new, 1)


def remove_between(text: str, start_marker: str, end_marker: str, relative: str) -> str:
    require(text, start_marker, relative)
    require(text, end_marker, relative)
    start = text.index(start_marker)
    end = text.index(end_marker, start)
    return text[:start] + text[end:]


def patch_admin_dashboard() -> None:
    relative = "mobile/app/(tabs)/admin.tsx"
    text = load(relative)

    utility_start_marker = "        <View style={styles.utilityPanel}>"
    manager_marker = "        <UtilityStatusManager ward={assignedWard} wardCode={assignedWardCode} />"
    dashboard_marker = "        <View style={styles.dashboardGrid}>"
    list_marker = "        <View style={styles.listSection}>"

    require(text, utility_start_marker, relative)
    require(text, manager_marker, relative)
    require(text, dashboard_marker, relative)
    require(text, list_marker, relative)

    utility_start = text.index(utility_start_marker)
    manager_start = text.index(manager_marker, utility_start)
    dashboard_start = text.index(dashboard_marker, manager_start)
    list_start = text.index(list_marker, dashboard_start)

    utility_block = text[utility_start:manager_start]
    manager_block = text[manager_start:dashboard_start]
    dashboard_block = text[dashboard_start:list_start]

    reordered = (
        "        {/* Complaint status summary stays at the top of Work Progress */}\n"
        + dashboard_block
        + "\n        {/* Utility status follows the complaint summary */}\n"
        + utility_block
        + manager_block
    )
    text = text[:utility_start] + reordered + text[list_start:]

    text = text.replace(
        '  dashboardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 12 },',
        '  dashboardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 12, paddingTop: 12 },',
        1,
    )
    text = text.replace(
        '              <Text style={styles.panelSubtitle}>Water and electricity timing</Text>\n',
        "",
        1,
    )
    save(relative, text)


def patch_home() -> None:
    relative = "mobile/app/(tabs)/index.tsx"
    text = load(relative)
    text = remove_between(
        text,
        "        {/* REPORT A PROBLEM CTA */}",
        "        {/* UTILITY STATUS */}",
        relative,
    )
    save(relative, text)


def patch_alert_composer() -> None:
    relative = "mobile/screens/AlertComposerScreen.tsx"
    text = load(relative)

    text = replace_once(
        text,
        'import React, { useMemo, useState } from "react";',
        'import React, { useState } from "react";',
        relative,
    )
    text = text.replace('  const [previewVisible, setPreviewVisible] = useState(false);\n', "", 1)
    text = text.replace('  const theme = TYPE_OPTIONS.find((item) => item.key === type) || TYPE_OPTIONS[0];\n', "", 1)

    preview_meta_start = "  const previewMeta = useMemo"
    if preview_meta_start in text:
        start = text.index(preview_meta_start)
        end = text.index("\n\n  if (!canPublish)", start)
        text = text[:start] + text[end + 2 :]

    text = text.replace('        <Text style={styles.headerSub}>{c("subtitle")}</Text>\n', "", 1)
    text = text.replace(
        '          {!isSuperAdmin ? <View style={styles.scope}><Feather name="shield" size={15} color="#166534" /><Text style={styles.scopeText}>{c("scopeOfficer")} {user?.ward ? `(${user.ward})` : ""}</Text></View> : null}\n\n',
        "",
        1,
    )
    text = text.replace('<Text style={styles.help}>{c("dateHint")}</Text>', "")
    text = text.replace('<Text style={styles.imagePickerSub}>JPEG, PNG or WebP · max 8MB</Text>', "")

    preview_card_marker = '          <View style={[styles.previewCard, { borderColor: `${theme.color}40` }]}>'
    if preview_card_marker in text:
        start = text.index(preview_card_marker)
        end = text.index("\n\n          {error ?", start)
        text = text[:start] + text[end + 2 :]

    old_actions = '''          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={submitting}><Text style={styles.cancelText}>{c("cancel")}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.previewButton} onPress={() => setPreviewVisible(true)} disabled={submitting}><Feather name="eye" size={16} color={ORANGE} /><Text style={styles.previewButtonText}>{c("preview")}</Text></TouchableOpacity>
          </View>'''
    new_actions = '''          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={submitting}><Text style={styles.cancelText}>{c("cancel")}</Text></TouchableOpacity>
          </View>'''
    text = replace_once(text, old_actions, new_actions, relative)

    preview_modal_marker = '      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>'
    if preview_modal_marker in text:
        start = text.index(preview_modal_marker)
        ward_modal_marker = '      <Modal visible={wardVisible} transparent animationType="slide" onRequestClose={() => setWardVisible(false)}>'
        end = text.index(ward_modal_marker, start)
        text = text[:start] + text[end:]

    save(relative, text)


def patch_official_updates(relative: str) -> None:
    text = load(relative)

    text = text.replace("  Alert,\n", "", 1)
    if 'import ConfirmActionModal from "@/components/ConfirmActionModal";' not in text:
        insertion = 'import { useSafeAreaInsets } from "react-native-safe-area-context";\n\n'
        text = replace_once(
            text,
            insertion,
            insertion + 'import ConfirmActionModal from "@/components/ConfirmActionModal";\n',
            relative,
        )

    state_marker = '  const [selectedBroadcast, setSelectedBroadcast] = useState<AppBroadcast | null>(null);\n'
    require(text, state_marker, relative)
    if "const [pendingDelete" not in text:
        text = text.replace(
            state_marker,
            state_marker
            + '  const [pendingDelete, setPendingDelete] = useState<AppAlert | null>(null);\n'
            + '  const [deleteBusy, setDeleteBusy] = useState(false);\n'
            + '  const [deleteError, setDeleteError] = useState("");\n',
            1,
        )

    delete_start = '  const confirmDelete = (item: AppAlert) => Alert.alert'
    require(text, delete_start, relative)
    start = text.index(delete_start)
    end = text.index("\n\n  const loading", start)
    run_delete = '''  const runDelete = async () => {
    if (!pendingDelete || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await removeAlert(pendingDelete.id);
      setPendingDelete(null);
    } catch (requestError) {
      setDeleteError(getUserErrorMessage(requestError, c("removeFailed")));
    } finally {
      setDeleteBusy(false);
    }
  };'''
    text = text[:start] + run_delete + text[end:]

    text = text.replace(
        '<Text style={styles.headerSub}>{canPublish ? c("managerSub") : c("citizenSub")}</Text>\n',
        "",
        1,
    )
    text = text.replace('onDelete={() => confirmDelete(item.alert)}', 'onDelete={() => { setPendingDelete(item.alert); setDeleteError(""); }}')
    text = text.replace('<Text style={styles.emptyText}>{canPublish ? c("emptyManager") : c("emptyCitizen")}</Text>', "")
    text = text.replace('{item.mediaType === "video" ? <Text style={styles.mediaHint}>Tap to view the attached video</Text> : null}\n', "")

    selected_modal_marker = '      <Modal visible={!!selectedBroadcast} transparent animationType="fade" onRequestClose={() => setSelectedBroadcast(null)}>'
    require(text, selected_modal_marker, relative)
    if "visible={!!pendingDelete}" not in text:
        confirm_modal = '''      <ConfirmActionModal
        visible={!!pendingDelete}
        title={c("removeTitle")}
        message={pendingDelete ? `${c("removeMessage")}\n\n${pendingDelete.title}` : c("removeMessage")}
        confirmLabel={c("remove")}
        cancelLabel={c("cancel")}
        icon="trash-2"
        confirmIcon="trash-2"
        tone="danger"
        busy={deleteBusy}
        errorMessage={deleteError}
        onCancel={() => { if (!deleteBusy) { setPendingDelete(null); setDeleteError(""); } }}
        onConfirm={runDelete}
      />

'''
        text = text.replace(selected_modal_marker, confirm_modal + selected_modal_marker, 1)

    save(relative, text)


def patch_alert_context() -> None:
    relative = "mobile/context/AlertContext.tsx"
    text = load(relative)
    old = '''  const removeAlert = async (id: string) => {
    const previous = alerts;
    setAlerts((items) => items.filter((item) => item.id !== id));
    try {
      await apiDelete(`/api/alerts/${encodeURIComponent(id)}`);
      await refreshAlerts();
    } catch (requestError) {
      setAlerts(previous);
      throw requestError;
    }
  };'''
    new = '''  const removeAlert = async (id: string) => {
    const previous = alerts;
    setAlerts((items) => items.filter((item) => item.id !== id));
    try {
      await apiDelete(`/api/alerts/${encodeURIComponent(id)}`);
    } catch (requestError) {
      setAlerts(previous);
      throw requestError;
    }

    // The delete already succeeded. A temporary refresh failure must not
    // restore the removed card and make the delete look unsuccessful.
    try {
      await refreshAlerts();
    } catch {
      // Pull-to-refresh or the next app resume will retry the authoritative list.
    }
  };'''
    text = replace_once(text, old, new, relative)
    save(relative, text)


def patch_broadcast_center() -> None:
    relative = "mobile/screens/BroadcastCenterMediaScreen.tsx"
    text = load(relative)
    text = text.replace('<Text style={styles.headerSub}>Send immediate or scheduled in-app updates with an optional image or five-minute video.</Text>', "", 1)
    text = text.replace('        <View style={styles.infoBanner}><Feather name="shield" size={17} color="#1D4ED8" /><Text style={styles.infoText}>Pause temporarily hides a broadcast. Delete permanently removes it after confirmation.</Text></View>\n', "", 1)
    text = text.replace('<Text style={styles.emptyText}>Create the first update for citizens or a selected audience.</Text>', "", 1)
    text = text.replace('<Text style={styles.sheetSub}>Preview audience, schedule and attachment before sending</Text>', "", 1)
    text = text.replace(': <View style={styles.scopeBanner}><Feather name="shield" size={14} color="#166534" /><Text style={styles.scopeText}>Nagarsevak broadcasts are limited to citizens in {user?.ward || "the assigned ward"}.</Text></View>}', ': null}')
    text = text.replace('<Text style={styles.help}>Leave blank to send immediately. Scheduled broadcasts require a future time.</Text>', "", 1)
    text = text.replace('               <View style={styles.preview}><Text style={styles.previewLabel}>PREVIEW</Text><Text style={styles.previewTitle}>{title.trim() || "Broadcast title"}</Text><Text style={styles.previewBody}>{body.trim() || "Your message preview will appear here."}</Text><Text style={styles.previewMeta}>{ward} · {audienceRole} · {language.toUpperCase()}{media ? ` · ${media.type}` : ""}</Text></View>\n', "", 1)
    save(relative, text)


def patch_broadcast_media_picker() -> None:
    relative = "mobile/components/BroadcastMediaPicker.tsx"
    text = load(relative)
    text = text.replace('            <Text style={styles.addSub}>Images up to 10MB · MP4/MOV video up to 5 minutes and 50MB · original quality retained</Text>\n', "", 1)
    save(relative, text)


def patch_utility_manager() -> None:
    relative = "mobile/components/UtilityStatusManager.tsx"
    text = load(relative)
    text = text.replace("ActivityIndicator, Alert, KeyboardAvoidingView", "ActivityIndicator, KeyboardAvoidingView", 1)
    if 'import ConfirmActionModal from "@/components/ConfirmActionModal";' not in text:
        text = text.replace(
            'import { AppScrollView } from "@/components/AppScrollView";\n',
            'import { AppScrollView } from "@/components/AppScrollView";\nimport ConfirmActionModal from "@/components/ConfirmActionModal";\n',
            1,
        )

    state_tail = 'const [description, setDescription] = useState("");'
    require(text, state_tail, relative)
    if "const [pendingDelete" not in text:
        text = text.replace(
            state_tail,
            state_tail + ' const [pendingDelete, setPendingDelete] = useState<UtilityStatus | null>(null); const [deleteBusy, setDeleteBusy] = useState(false); const [deleteError, setDeleteError] = useState("");',
            1,
        )

    confirm_start = '  const confirmDelete = (item: UtilityStatus) => Alert.alert'
    require(text, confirm_start, relative)
    start = text.index(confirm_start)
    end = text.index('\n  return <View', start)
    replacement = '''  const confirmDelete = (item: UtilityStatus) => { setPendingDelete(item); setDeleteError(""); };
  const runDelete = async () => { if (!pendingDelete || deleteBusy) return; setDeleteBusy(true); setActionId(pendingDelete.id); setDeleteError(""); try { await deleteUtilityStatus(pendingDelete.id); setPendingDelete(null); } catch (requestError) { setDeleteError(getUserErrorMessage(requestError, "The utility update could not be deleted.")); } finally { setActionId(""); setDeleteBusy(false); } };'''
    text = text[:start] + replacement + text[end:]
    text = text.replace('<Text style={styles.subtitle}>Check, edit or delete what citizens can see</Text>', "", 1)

    edit_modal_marker = '    <Modal visible={!!editing} transparent animationType="slide"'
    require(text, edit_modal_marker, relative)
    if "visible={!!pendingDelete}" not in text:
        modal = '''    <ConfirmActionModal visible={!!pendingDelete} title="Delete utility status?" message={pendingDelete ? `Delete the current ${pendingDelete.utilityType} update?` : "Delete this utility update?"} confirmLabel="Delete" icon="trash-2" confirmIcon="trash-2" tone="danger" busy={deleteBusy} errorMessage={deleteError} onCancel={() => { if (!deleteBusy) { setPendingDelete(null); setDeleteError(""); } }} onConfirm={runDelete} />
'''
        text = text.replace(edit_modal_marker, modal + edit_modal_marker, 1)

    save(relative, text)


def main() -> None:
    patch_admin_dashboard()
    patch_home()
    patch_alert_composer()
    patch_official_updates("mobile/screens/OfficialUpdatesMediaScreen.tsx")
    patch_official_updates("mobile/screens/OfficialUpdatesScreen.tsx")
    patch_alert_context()
    patch_broadcast_center()
    patch_broadcast_media_picker()
    patch_utility_manager()
    print("WORK_PROGRESS_UI_V106 applied")


if __name__ == "__main__":
    main()
