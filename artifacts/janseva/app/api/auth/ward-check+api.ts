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
    const ward = url.searchParams.get("ward");
    if (!ward) return Response.json({ success: false, message: "Ward required" }, { status: 400 });
    const [rows] = await db.query(
      `SELECT id FROM officers WHERE ward = ? AND approval_status IN ('pending','approved') LIMIT 1`,
      [ward]
    ) as any[];
    return Response.json({ success: true, available: (rows as any[]).length === 0, ward });
  } finally {
    await db.end().catch(() => {});
  }
}
