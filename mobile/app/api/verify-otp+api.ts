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
    const { otp, sessionToken } = await request.json();

    if (!otp || !sessionToken) {
      return Response.json({ valid: false, error: "Missing OTP or session" });
    }

    const dotIdx = (sessionToken as string).lastIndexOf(".");
    if (dotIdx === -1) {
      return Response.json({ valid: false, error: "Invalid session token" });
    }

    const encodedPayload = (sessionToken as string).slice(0, dotIdx);
    const sig = (sessionToken as string).slice(dotIdx + 1);

    let payload: string;
    try {
      payload = decodeURIComponent(escape(atob(encodedPayload)));
    } catch {
      return Response.json({ valid: false, error: "Malformed session token" });
    }

    const parts = payload.split(":");
    if (parts.length !== 3) {
      return Response.json({ valid: false, error: "Invalid session format" });
    }

    const [phone, storedOtp, expStr] = parts;
    const secret = process.env.FAST2SMS_API_KEY ?? "";
    const expectedSig = await hmacSign(payload, "janseva_otp_" + secret);

    if (sig !== expectedSig) {
      return Response.json({ valid: false, error: "Invalid session token" });
    }

    if (Date.now() > parseInt(expStr)) {
      return Response.json({ valid: false, error: "OTP has expired. Please request a new one." });
    }

    if (otp !== storedOtp) {
      return Response.json({ valid: false, error: "Incorrect OTP. Please try again." });
    }

    return Response.json({ valid: true, phone });
  } catch (err) {
    console.error("verify-otp error:", err);
    return Response.json({ valid: false, error: "Verification failed. Please try again." });
  }
}
