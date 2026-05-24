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
    if (!mobile || mobile.length !== 10) {
      return Response.json({ success: false, message: "Valid 10-digit mobile required" }, { status: 400 });
    }
    const [rows] = await db.query(
      `SELECT id, name, mobile, ward, ward_code AS wardCode, role,
        is_super_admin AS isSuperAdmin, approval_status AS approvalStatus,
        office_address AS officeAddress, profile_photo AS profilePhoto
       FROM officers WHERE mobile = ? LIMIT 1`,
      [mobile]
    ) as any[];
    if (!(rows as any[]).length) {
      return Response.json({ success: false, message: "NOT_FOUND", notFound: true }, { status: 404 });
    }
    const o = (rows as any[])[0];
    if (o.approvalStatus !== "approved") {
      return Response.json({
        success: false,
        message: o.approvalStatus === "pending" ? "PENDING" : "REJECTED",
        approvalStatus: o.approvalStatus,
      }, { status: 403 });
    }
    return Response.json({
      success: true,
      user: {
        id: o.id, name: o.name, mobile: o.mobile,
        role: o.isSuperAdmin ? "super_admin" : (o.role || "nagarsevak"),
        ward: o.ward, wardCode: o.wardCode, nagarsevakId: o.id,
        isSuperAdmin: !!o.isSuperAdmin, officeAddress: o.officeAddress,
        profilePhoto: o.profilePhoto, avatarColor: "#059669",
        createdAt: new Date().toISOString(),
      },
    });
  } finally {
    await db.end().catch(() => {});
  }
}
