import mysql from "mysql2/promise";

const DB = {
  host: "193.203.184.201", port: 3306,
  user: "u818923248_app", password: "K3I?XVCE#Io",
  database: "u818923248_app", waitForConnections: true, connectionLimit: 3,
};

export async function GET(request: Request) {
  const db = mysql.createPool(DB);
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    let query = `SELECT id, name, mobile, ward, ward_code AS wardCode, role,
      is_super_admin AS isSuperAdmin, approval_status AS approvalStatus,
      office_address AS officeAddress, residence_address AS residenceAddress,
      contact_number AS contactNumber, profile_photo AS profilePhoto,
      created_at AS createdAt
      FROM officers`;
    const params: any[] = [];
    if (status) {
      query += " WHERE approval_status = ?";
      params.push(status);
    }
    query += " ORDER BY created_at DESC";
    const [rows] = await db.query(query, params) as any[];
    return Response.json({ success: true, officers: rows });
  } finally {
    await db.end().catch(() => {});
  }
}

export async function PATCH(request: Request) {
  const db = mysql.createPool(DB);
  try {
    const body = await request.json();
    const { id, approvalStatus } = body;
    if (!id || !["approved", "rejected", "pending"].includes(approvalStatus)) {
      return Response.json({ success: false, message: "Invalid request" }, { status: 400 });
    }
    await db.query("UPDATE officers SET approval_status = ? WHERE id = ?", [approvalStatus, id]);
    return Response.json({ success: true, id, approvalStatus });
  } finally {
    await db.end().catch(() => {});
  }
}
