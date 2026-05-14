async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    const cleanPhone = String(phone ?? "").replace(/\D/g, "");

    if (cleanPhone.length !== 10) {
      return Response.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const exp = Date.now() + 10 * 60 * 1000;
    const payload = `${cleanPhone}:${otp}:${exp}`;

    const secret = process.env.FAST2SMS_API_KEY ?? "";
    const sig = await hmacSign(payload, "janseva_otp_" + secret);
    const sessionToken = btoa(unescape(encodeURIComponent(payload))) + "." + sig;

    const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: secret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "q",
        message: `Your Connect T OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`,
        language: "english",
        flash: "0",
        numbers: cleanPhone,
      }),
    });

    const smsResult = await smsRes.json();

    if (!smsResult.return) {
      console.error("Fast2SMS error:", smsResult);
      return Response.json(
        { error: smsResult.message?.[0] ?? "Failed to send OTP. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ success: true, sessionToken });
  } catch (err) {
    console.error("send-otp error:", err);
    return Response.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
