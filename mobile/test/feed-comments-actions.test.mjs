import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Feed post cards wire like, comments and share controls to real actions", () => {
  const feed = read("app/(tabs)/feed.tsx");

  assert.match(feed, /toggleLike\(post\.id, userId\)/);
  assert.match(feed, /pathname: "\/feed\/comments\/\[id\]"/);
  assert.match(feed, /params: \{ id: post\.id/);
  assert.match(feed, /shareText\(`\$\{post\.authorName\}'s post`/);
  assert.match(feed, /accessibilityLabel=\{`Open \$\{post\.commentsCount\} comments/);
});

test("comments screen uses authenticated API routes and keyboard-safe composition", () => {
  const comments = read("app/feed/comments/[id].tsx");

  assert.match(comments, /apiGet<\{ comments\?: any\[\] \}>\(`\/api\/feed\/posts\/\$\{encodeURIComponent\(postId\)\}\/comments`\)/);
  assert.match(comments, /apiPost<\{ comment\?: any \}>/);
  assert.match(comments, /apiDelete\(`\/api\/feed\/posts\/\$\{encodeURIComponent\(postId\)\}\/comments\/\$\{encodeURIComponent\(comment\.id\)\}`\)/);
  assert.match(comments, /KeyboardAvoidingView/);
  assert.match(comments, /keyboardShouldPersistTaps="handled"/);
  assert.match(comments, /textAlignVertical="top"/);
});

test("Feed backend installs comments, blocked-author filtering and ownership checks", () => {
  const patch = readFileSync(new URL("../../backend/communityFeedPatch.js", import.meta.url), "utf8");

  assert.match(patch, /CREATE TABLE IF NOT EXISTS feed_post_comments/);
  assert.match(patch, /LEFT JOIN feed_user_blocks b/);
  assert.match(patch, /COUNT\(DISTINCT c\.id\) AS comments_count/);
  assert.match(patch, /You cannot delete another user's post/);
  assert.match(patch, /You cannot delete another user's comment/);
  assert.match(patch, /removeManagedMedia\(post\.image_uri, "feed"\)/);
});
