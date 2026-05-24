import { getDb, normMobile } from "../_db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mobile = normMobile(body.mobile);

    const db = getDb();
    const [rows] = await db.query(
      `SELECT id, full_name AS name, mobile, email, address, ward
       FROM citizens WHERE mobile = ? LIMIT 1`,
      [mobile]
    ) as any[];

    if (!(rows as any[]).length) {
      return Response.json({ success: false, message: "NOT_FOUND", notFound: true }, { status: 404 });
    }

    const c = (rows as any[])[0];
    return Response.json({
      success: true,
      user: {
        id: c.id,
        role: "citizen",
        name: c.name,
        mobile: c.mobile,
        email: c.email,
        address: c.address,
        ward: c.ward,
        avatarColor: "#1E40AF",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Citizen login error:", err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
