from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

backend = ROOT / "backend/nagarsevakCommunity.js"
text = backend.read_text()
marker = '  app.get("/api/nagarsevak-community", async (req, res) => {'
route = '''  // APP_USERS_ALL_ROLES_V112\n  app.get("/api/admin/app-users", async (req, res) => {\n    try {\n      const user = await requireMember(req, res);\n      if (!user) return;\n      const isAdmin = user.role === "super_admin" || !!user.is_super_admin;\n      if (!isAdmin) return res.status(403).json({ success: false, error: "Super Admin required" });\n      const page = Math.max(1, Number(req.query.page || 1));\n      const limit = Math.min(50, Math.max(10, Number(req.query.limit || 10)));\n      const offset = (page - 1) * limit;\n      const [[countRow]] = await db.query("SELECT COUNT(*) AS total FROM users");\n      const [rows] = await db.query(\n        `SELECT id, name, mobile, role, ward, ward_code, address, email, profile_photo, approval_status, created_at\n         FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`,\n        [limit, offset],\n      );\n      const total = Number(countRow?.total || 0);\n      res.json({\n        success: true,\n        users: rows.map((row) => ({\n          id: row.id,\n          name: row.name,\n          mobile: row.mobile,\n          role: row.role,\n          ward: row.ward || row.ward_code || "",\n          address: row.address || "",\n          email: row.email || "",\n          profilePhoto: row.profile_photo || undefined,\n          approvalStatus: row.approval_status || undefined,\n          createdAt: row.created_at,\n        })),\n        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },\n      });\n    } catch (error) {\n      res.status(500).json({ success: false, error: error.message || "App users could not be loaded" });\n    }\n  });\n\n'''
if 'APP_USERS_ALL_ROLES_V112' not in text:
    if marker not in text:
        raise RuntimeError("Community route marker not found")
    text = text.replace(marker, route + marker, 1)
backend.write_text(text)

page = ROOT / "mobile/app/super-admin/users.tsx"
text = page.read_text()
text = text.replace('/api/admin/citizens?page=${nextPage}&limit=10', '/api/admin/app-users?page=${nextPage}&limit=10')
text = text.replace('setUsers(result.citizens || result.users || []);', 'setUsers(result.users || []);')
text = text.replace('Number(result.pagination?.total || (result.citizens || result.users || []).length)', 'Number(result.pagination?.total || (result.users || []).length)')
text = text.replace('registered citizens from the production database', 'registered app users from the production database')
text = text.replace('<Text style={{ color: GREEN, fontFamily: "Inter_600SemiBold", fontSize: 9 }}>Citizen</Text>', '<Text style={{ color: GREEN, fontFamily: "Inter_600SemiBold", fontSize: 9 }}>{String(item.role || "user").replace("_", " ")}</Text>')
page.write_text(text)

print("All-role App Users endpoint applied")
