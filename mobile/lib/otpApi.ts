import { apiUrl } from "./api";

export async function verifyRealOtp(mobile: string, otp: string, purpose = "login") {
  try {
    const mobile10 = String(mobile || "").replace(/\D/g, "").slice(-10);
    const code = String(otp || "").replace(/\D/g, "");

    if (mobile10.length !== 10) {
      return { success: false, error: "Enter valid 10-digit mobile number" };
    }

    if (code.length !== 6) {
      return { success: false, error: "Enter 6-digit OTP" };
    }

    const res = await fetch(apiUrl("/api/auth/verify-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mobile: mobile10,
        otp: code,
        purpose,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || "Invalid OTP",
      };
    }

    return { success: true, data };
  } catch {
    return { success: false, error: "OTP verification failed. Please try again." };
  }
}
