from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace(relative: str, old: str, new: str) -> None:
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Expected block not found in {relative}: {old[:100]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


replace(
    "mobile/context/BroadcastContext.tsx",
    "Broadcast API is not deployed on the connected backend. Redeploy the latest backend and try again.",
    "Broadcast API is not deployed on the connected backend. Redeploy the connect-t-2 backend and try again.",
)

replace(
    "mobile/app/(tabs)/feed.tsx",
    '<TouchableOpacity style={styles.action} onPress={() => router.push({ pathname: "/feed/comments/[id]", params: { id: post.id, title: post.content.slice(0, 80) } } as any)}>',
    '<TouchableOpacity style={styles.action} accessibilityLabel={`Open ${post.commentsCount} comments for this post`} onPress={() => router.push({ pathname: "/feed/comments/[id]", params: { id: post.id, title: post.content.slice(0, 80) } } as any)}>',
)

path = ROOT / "mobile/test/civic-broadcast-experience.test.mjs"
text = path.read_text(encoding="utf-8")
old = '''test("Civic Home shows sent broadcasts and opens the exact item on Alerts & News", () => {
  const experience = read("components/CivicBroadcastExperience.tsx");
  const layout = read("app/_layout.tsx");

  assert.match(layout, /CivicBroadcastExperience/);
  assert.match(experience, /item\.status === "sent"/);
  assert.match(experience, /pathname: "\/alert\/list"/);
  assert.match(experience, /broadcastId: item\.id/);
  assert.match(experience, /selectedBroadcast/);
  assert.match(experience, /markBroadcastRead/);
});'''
new = '''test("Civic Home announcements open the exact item in the Citizen News tab", () => {
  const experience = read("components/CivicBroadcastExperience.tsx");
  const home = read("app/(tabs)/index.tsx");
  const feed = read("app/(tabs)/feed.tsx");
  const layout = read("app/_layout.tsx");

  assert.match(layout, /CivicBroadcastExperience/);
  assert.match(home, /item\.category === "announcement"/);
  assert.match(home, /pathname: "\/\(tabs\)\/feed"/);
  assert.match(feed, /broadcastId: item\.id/);
  assert.match(experience, /secondSegment === "feed"/);
  assert.match(experience, /selectedBroadcast/);
  assert.match(experience, /markBroadcastRead/);
  assert.doesNotMatch(experience, /floatingBar/);
});'''
if old not in text:
    raise RuntimeError("Civic broadcast test block was not found")
path.write_text(text.replace(old, new, 1), encoding="utf-8")

replace(
    "mobile/test/production-audit-phase1.test.mjs",
    "  assert.match(context, /apiPostForm/);",
    "  assert.match(context, /uploadComplaintForm/);",
)

Path(__file__).unlink()
print("Stale source-contract checks aligned with the new behavior.")
