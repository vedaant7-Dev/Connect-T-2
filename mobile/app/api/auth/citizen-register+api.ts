import { getDb, normMobile } from "../_db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mobile = normMobile(body.mobile);

    if (!body.name?.trim() || !mobile || mobile.length !== 10) {
      return Response.json({ success: false, message: "Name and valid mobile required" }, { status: 400 });
    }

    const db = getDb();
    const [existing] = await db.query(
      "SELECT id FROM citizens WHERE mobile = ? LIMIT 1",
      [mobile]
    ) as any[];

    let id: string;
    if ((existing as any[]).length) {
      id = (existing as any[])[0].id;
      await db.query(
        `UPDATE citizens SET full_name=?, ward=?, address=?, email=? WHERE id=?`,
        [body.name.trim(), body.ward || null, body.address || null, body.email || null, id]
      );
    } else {
      id = "CIT" + Date.now();
      await db.query(
        `INSERT INTO citizens (id, full_name, mobile, ward, address, email)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, body.name.trim(), mobile, body.ward || null, body.address || null, body.email || null]
      );
    }

    return Response.json({
      success: true,
      user: {
        id,
        role: "citizen",
        name: body.name.trim(),
        mobile,
        ward: body.ward || null,
        address: body.address || null,
        email: body.email || null,
        avatarColor: "#1E40AF",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Citizen register error:", err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
