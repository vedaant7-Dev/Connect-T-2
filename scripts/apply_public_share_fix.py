from pathlib import Path
import re


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected text not found in {path}: {old[:120]}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


broadcast = Path("mobile/screens/BroadcastCenterMediaScreen.tsx")
text = broadcast.read_text(encoding="utf-8")
text = text.replace(
    'ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Share, StyleSheet, Text, TextInput, TouchableOpacity, View',
    'ActivityIndicator, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View',
)
if 'import { shareOfficialBroadcast } from "@/lib/publicBroadcastShare";' not in text:
    text = text.replace(
        'import { getUserErrorMessage } from "@/lib/api";\n',
        'import { getUserErrorMessage } from "@/lib/api";\nimport { shareOfficialBroadcast } from "@/lib/publicBroadcastShare";\n',
        1,
    )
pattern = re.compile(r'async function shareBroadcast\(item: AppBroadcast\) \{.*?\n\}\nfunction statusMeta', re.S)
replacement = '''async function shareBroadcast(item: AppBroadcast) {
  try {
    await shareOfficialBroadcast(item);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error || "");
    if (!/cancel/i.test(detail)) console.warn("Broadcast share failed", detail);
  }
}
function statusMeta'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1 and 'await shareOfficialBroadcast(item);' not in text:
    raise SystemExit("Broadcast share function could not be replaced")
broadcast.write_text(text, encoding="utf-8")

community = Path("mobile/screens/NagarsevakCommunityScreen.tsx")
text = community.read_text(encoding="utf-8")
text = text.replace(
    'placeholder="Title (optional)" maxLength={255}',
    'placeholder="Title (optional)" placeholderTextColor="#0F172A" maxLength={255}',
    1,
)
text = text.replace(
    'placeholder="Write the complete message here" multiline',
    'placeholder="Write the complete message here" placeholderTextColor="#0F172A" multiline',
    1,
)
community.write_text(text, encoding="utf-8")
