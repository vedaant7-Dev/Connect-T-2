import mysql from "mysql2/promise";

const DB = {
  host: "193.203.184.201", port: 3306,
  user: "u818923248_app", password: "K3I?XVCE#Io",
  database: "u818923248_app", waitForConnections: true, connectionLimit: 3,
};

function norm(s: string) { return String(s || "").replace(/\D/g, ""); }

export async function POST(request: Request) {
  const db = mysql.createPool(DB);
  try {
    const body = await request.json();
    const mobile = norm(body.mobile);
    if (!body.name?.trim() || !mobile || mobile.length !== 10) {
      return Response.json({ success: false, message: "Name and valid mobile required" }, { status: 400 });
    }
    if (!body.ward?.trim()) {
      return Response.json({ success: false, message: "Ward selection required" }, { status: 400 });
    }
    const [existing] = await db.query("SELECT id, approval_status FROM officers WHERE mobile = ? LIMIT 1", [mobile]) as any[];
    if ((existing as any[]).length) {
      const rec = (existing as any[])[0];
      return Response.json({ success: false, message: rec.approval_status === "pending" ? "ALREADY_PENDING" : "ALREADY_EXISTS", approvalStatus: rec.approval_status }, { status: 409 });
    }
    const [wardCheck] = await db.query(`SELECT id FROM officers WHERE ward = ? AND approval_status IN ('pending','approved') LIMIT 1`, [body.ward]) as any[];
    if ((wardCheck as any[]).length) {
      return Response.json({ success: false, message: "WARD_TAKEN" }, { status: 409 });
    }
    const id = "NGS" + Date.now();
    await db.query(
      `INSERT INTO officers (id, name, mobile, ward, ward_code, role, is_super_admin, approval_status, office_address, residence_address, contact_number, profile_photo)
       VALUES (?, ?, ?, ?, ?, 'nagarsevak', 0, 'pending', ?, ?, ?, ?)`,
      [id, body.name.trim(), mobile, body.ward, body.ward, body.officeAddress || null, body.address || null, body.contactNumber || null, body.profilePhoto || null]
    );
    return Response.json({ success: true, officerId: id, approvalStatus: "pending" });
  } finally {
    await db.end().catch(() => {});
  }
}
