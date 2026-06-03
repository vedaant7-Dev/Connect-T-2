const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const INPUT_SCREENS = [
  'app/login.tsx',
  'app/super-admin-login.tsx',
  'app/super-admin/access.tsx',
  'app/nagarsevak/login.tsx',
  'app/nagarsevak/register.tsx',
  'app/jobs/login.tsx',
  'app/jobs/(tabs)/post.tsx',
  'app/jobs/(tabs)/profile.tsx',
  'app/jobs/chat/[employerId].tsx',
  'app/complaint/new.tsx',
  'app/alert/new.tsx',
];

function edit(relPath, patcher) {
  const file = path.join(root, relPath);
  if (!fs.existsSync(file)) return;

  const before = fs.readFileSync(file, 'utf8');
  const after = patcher(before, relPath);

  if (after !== before) {
    fs.writeFileSync(file, after);
    console.log('[Connect-T] Keyboard UX fixed ' + relPath);
  }
}

function enableAndroidKeyboardAvoiding(source) {
  return source
    .replaceAll(
      'behavior={Platform.OS === "ios" ? "padding" : undefined}',
      'behavior={Platform.OS === "ios" ? "padding" : "height"}'
    )
    .replaceAll(
      "behavior={Platform.OS === 'ios' ? 'padding' : undefined}",
      "behavior={Platform.OS === 'ios' ? 'padding' : 'height'}"
    );
}

function improveScrollViews(source) {
  let next = source;

  next = next.replaceAll(
    'keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}',
    'keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}'
  );

  next = next.replaceAll(
    'keyboardShouldPersistTaps="handled"\n          showsVerticalScrollIndicator={false}',
    'keyboardShouldPersistTaps="handled"\n          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}\n          automaticallyAdjustKeyboardInsets\n          showsVerticalScrollIndicator={false}'
  );

  next = next.replaceAll(
    'keyboardShouldPersistTaps="handled"\n          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}\n          automaticallyAdjustKeyboardInsets\n          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}\n          automaticallyAdjustKeyboardInsets',
    'keyboardShouldPersistTaps="handled"\n          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}\n          automaticallyAdjustKeyboardInsets'
  );

  next = next.replaceAll(
    'keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} automaticallyAdjustKeyboardInsets keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} automaticallyAdjustKeyboardInsets',
    'keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} automaticallyAdjustKeyboardInsets'
  );

  return next;
}

function patchAlertNew(source) {
  let next = source;

  next = next.replace(
    'import { Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";',
    'import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";'
  );

  if (!next.includes('<KeyboardAvoidingView style={styles.keyboardArea}')) {
    next = next.replace(
      '</LinearGradient><ScrollView style={styles.scroll}',
      '</LinearGradient><KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}><ScrollView style={styles.scroll}'
    );

    next = next.replace(
      '</ScrollView><AppNotice visible={notice.visible}',
      '</ScrollView></KeyboardAvoidingView><AppNotice visible={notice.visible}'
    );
  }

  next = next.replace(
    'contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 24 }]}',
    'contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 120 }]}'
  );

  if (!next.includes('keyboardArea:')) {
    next = next.replace(
      '  scroll: { flex: 1 },',
      '  keyboardArea: { flex: 1 },\n  scroll: { flex: 1 },'
    );
  }

  return next;
}

function patchChat(source) {
  let next = source;

  next = next.replace(
    '<KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>',
    '<KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>'
  );

  next = next.replace(
    '<ScrollView style={s.messagesScroll} contentContainerStyle={s.messagesContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>',
    '<ScrollView style={s.messagesScroll} contentContainerStyle={s.messagesContent} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>'
  );

  return next;
}

function patchSource(source, relPath) {
  let next = source;
  next = enableAndroidKeyboardAvoiding(next);
  next = improveScrollViews(next);

  if (relPath === 'app/alert/new.tsx') next = patchAlertNew(next);
  if (relPath === 'app/jobs/chat/[employerId].tsx') next = patchChat(next);

  return next;
}

for (const relPath of INPUT_SCREENS) {
  edit(relPath, patchSource);
}

console.log('[Connect-T] Keyboard UX patch complete');
