const fs = require("fs");
const path = require("path");
const multer = require("multer");

module.exports = function installNagarsevakCommunity({ app, db, verifyToken, currentCivicUser, createId, uploadDir }) {
  let schemaReady = null;
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
      const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];
      cb(allowed.includes(String(file.mimetype || "").toLowerCase()) ? null : new Error("Unsupported community media type"), allowed.includes(String(file.mimetype || "").toLowerCase()));
    },
  });

  async function ensureSchema() {
    if (schemaReady) return schemaReady;
    schemaReady = db.query(`CREATE TABLE IF NOT EXISTS nagarsevak_community_posts (
      id VARCHAR(64) PRIMARY KEY,
      author_id VARCHAR(64) NOT NULL,
      author_name VARCHAR(160) NOT NULL,
      author_role VARCHAR(32) NOT NULL,
      ward VARCHAR(80) NULL,
      post_type VARCHAR(32) NOT NULL DEFAULT 'message',
      message TEXT NULL,
      media_uri LONGTEXT NULL,
      media_type VARCHAR(16) NULL,
      media_file_name VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_community_created (created_at),
      KEY idx_community_author (author_id)
    )`).catch((error) => { schemaReady = null; throw error; });
    return schemaReady;
  }

  async function requireMember(req, res) {
    const auth = verifyToken(req);
    const user = await currentCivicUser(auth);
    const allowed = user && (user.role === "nagarsevak" || user.role === "super_admin" || !!user.is_super_admin);
    if (!allowed) {
      res.status(403).json({ success: false, error: "Nagarsevak community access required" });
      return null;
    }
    return user;
  }

  function mapPost(row) {
    return {
      id: row.id,
      authorId: row.author_id,
      authorName: row.author_name,
      authorRole: row.author_role,
      ward: row.ward || "",
      type: row.post_type,
      message: row.message || "",
      mediaUri: row.media_uri || undefined,
      mediaType: row.media_type || undefined,
      mediaFileName: row.media_file_name || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function saveMedia(file) {
    if (!file) return null;
    fs.mkdirSync(uploadDir, { recursive: true });
    const extByMime = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "video/mp4": ".mp4",
      "video/quicktime": ".mov",
    };
    const extension = extByMime[String(file.mimetype || "").toLowerCase()] || path.extname(file.originalname || "") || ".bin";
    const fileName = `community_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${extension}`;
    fs.writeFileSync(path.join(uploadDir, fileName), file.buffer);
    return {
      uri: `/uploads/${fileName}`,
      type: String(file.mimetype || "").startsWith("video/") ? "video" : "image",
      fileName: file.originalname || fileName,
    };
  }

  app.get("/api/nagarsevak-community", async (req, res) => {
    try {
      const user = await requireMember(req, res);
      if (!user) return;
      await ensureSchema();
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(50, Math.max(10, Number(req.query.limit || 30)));
      const offset = (page - 1) * limit;
      const [[countRow]] = await db.query("SELECT COUNT(*) AS total FROM nagarsevak_community_posts");
      const [rows] = await db.query(
        "SELECT * FROM nagarsevak_community_posts ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [limit, offset],
      );
      const total = Number(countRow?.total || 0);
      res.json({ success: true, posts: rows.map(mapPost), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message || "Community could not be loaded" });
    }
  });

  app.post("/api/nagarsevak-community", upload.single("media"), async (req, res) => {
    try {
      const user = await requireMember(req, res);
      if (!user) return;
      await ensureSchema();
      const message = String(req.body.message || "").trim();
      const type = ["message", "notice", "information", "announcement"].includes(String(req.body.type)) ? String(req.body.type) : "message";
      if (!message && !req.file) return res.status(400).json({ success: false, error: "Add a message, image or video" });
      const media = saveMedia(req.file);
      const id = createId("community");
      const role = user.role === "super_admin" || user.is_super_admin ? "super_admin" : "nagarsevak";
      await db.query(
        `INSERT INTO nagarsevak_community_posts
         (id, author_id, author_name, author_role, ward, post_type, message, media_uri, media_type, media_file_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, user.id, user.name || "Connect-T Officer", role, user.ward || null, type, message || null, media?.uri || null, media?.type || null, media?.fileName || null],
      );
      const [rows] = await db.query("SELECT * FROM nagarsevak_community_posts WHERE id = ? LIMIT 1", [id]);
      res.status(201).json({ success: true, post: mapPost(rows[0]) });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message || "Community post could not be created" });
    }
  });

  app.patch("/api/nagarsevak-community/:id", async (req, res) => {
    try {
      const user = await requireMember(req, res);
      if (!user) return;
      await ensureSchema();
      const [rows] = await db.query("SELECT * FROM nagarsevak_community_posts WHERE id = ? LIMIT 1", [req.params.id]);
      if (!rows.length) return res.status(404).json({ success: false, error: "Community post not found" });
      const isAdmin = user.role === "super_admin" || !!user.is_super_admin;
      if (!isAdmin && String(rows[0].author_id) !== String(user.id)) return res.status(403).json({ success: false, error: "You can edit only your own post" });
      const message = String(req.body.message ?? rows[0].message ?? "").trim();
      const type = ["message", "notice", "information", "announcement"].includes(String(req.body.type)) ? String(req.body.type) : rows[0].post_type;
      await db.query("UPDATE nagarsevak_community_posts SET message = ?, post_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [message || null, type, req.params.id]);
      const [updated] = await db.query("SELECT * FROM nagarsevak_community_posts WHERE id = ? LIMIT 1", [req.params.id]);
      res.json({ success: true, post: mapPost(updated[0]) });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message || "Community post could not be updated" });
    }
  });

  app.delete("/api/nagarsevak-community/:id", async (req, res) => {
    try {
      const user = await requireMember(req, res);
      if (!user) return;
      await ensureSchema();
      const [rows] = await db.query("SELECT * FROM nagarsevak_community_posts WHERE id = ? LIMIT 1", [req.params.id]);
      if (!rows.length) return res.status(404).json({ success: false, error: "Community post not found" });
      const isAdmin = user.role === "super_admin" || !!user.is_super_admin;
      if (!isAdmin && String(rows[0].author_id) !== String(user.id)) return res.status(403).json({ success: false, error: "You can delete only your own post" });
      await db.query("DELETE FROM nagarsevak_community_posts WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message || "Community post could not be deleted" });
    }
  });
};
