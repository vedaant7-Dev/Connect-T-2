const crypto = require("crypto");

const { issueOtpProof, normalizeMobile } = require("./authSecurity");

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_DELAY_MS = 45 * 1000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 6;
const MAX_VERIFY_ATTEMPTS = 5;

const sessions = new Map();
const activeSessions = new Map();
const rateLimits = new Map();

class OtpError extends Error {
  constructor(message, status = 400, code = "OTP_ERROR", retryAfterMs = 0) {
    super(message);
    this.name = "OtpError";
    this.status = status;
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

function cleanPurpose(value) {
  return String(value || "login").trim().slice(0, 40) || "login";
}

function activeKey(mobile, purpose) {
  return `${mobile}:${cleanPurpose(purpose)}`;
}

function otpDigest(sessionToken, code) {
  return crypto.createHash("sha256").update(`${sessionToken}:${code}`).digest();
}

function removeSession(token) {
  const session = sessions.get(token);
  sessions.delete(token);
  if (session) {
    const key = activeKey(session.mobile, session.purpose);
    if (activeSessions.get(key) === token) activeSessions.delete(key);
  }
}

function cleanup(now = Date.now()) {
  for (const [token, session] of sessions.entries()) {
    if (!session || session.expiresAt <= now) removeSession(token);
  }

  for (const [mobile, item] of rateLimits.entries()) {
    if (!item || item.windowStartedAt + RATE_WINDOW_MS <= now) rateLimits.delete(mobile);
  }
}

function nextRateState(mobile, now) {
  const previous = rateLimits.get(mobile);
  if (!previous || previous.windowStartedAt + RATE_WINDOW_MS <= now) {
    return { windowStartedAt: now, count: 0, lastSentAt: 0 };
  }
  return previous;
}

async function sendOtp({ mobile: rawMobile, purpose = "login", sendSms }) {
  const mobile = normalizeMobile(rawMobile);
  const normalizedPurpose = cleanPurpose(purpose);
  if (mobile.length !== 10) {
    throw new OtpError("Valid 10 digit mobile number is required", 400, "INVALID_MOBILE");
  }
  if (typeof sendSms !== "function") {
    throw new OtpError("OTP service is temporarily unavailable", 503, "SMS_UNAVAILABLE");
  }

  const now = Date.now();
  cleanup(now);
  const rate = nextRateState(mobile, now);
  const resendWait = rate.lastSentAt + RESEND_DELAY_MS - now;

  if (resendWait > 0) {
    throw new OtpError(
      "Please wait before requesting another OTP",
      429,
      "OTP_RESEND_TOO_SOON",
      resendWait,
    );
  }
  if (rate.count >= MAX_SENDS_PER_WINDOW) {
    throw new OtpError(
      "Too many OTP requests. Please try again later",
      429,
      "OTP_RATE_LIMITED",
      rate.windowStartedAt + RATE_WINDOW_MS - now,
    );
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const sessionToken = `otp_${crypto.randomBytes(24).toString("hex")}`;
  try {
    await sendSms(mobile, code);
  } catch (error) {
    console.warn("[OTP] SMS provider request failed", error?.code || error?.name || "provider_error");
    throw new OtpError("OTP service is temporarily unavailable", 503, "SMS_UNAVAILABLE");
  }

  // A successfully issued replacement OTP always supersedes the previous code
  // for the same mobile and purpose. This guarantees one active verification
  // transaction and prevents an older SMS from authenticating after resend.
  const key = activeKey(mobile, normalizedPurpose);
  const previousToken = activeSessions.get(key);
  if (previousToken) removeSession(previousToken);

  sessions.set(sessionToken, {
    mobile,
    purpose: normalizedPurpose,
    codeDigest: otpDigest(sessionToken, code),
    attempts: 0,
    expiresAt: now + OTP_TTL_MS,
  });
  activeSessions.set(key, sessionToken);
  rateLimits.set(mobile, { ...rate, count: rate.count + 1, lastSentAt: now });

  return {
    sessionToken,
    otpLength: 6,
    expiresInSeconds: OTP_TTL_MS / 1000,
    resendAfterSeconds: RESEND_DELAY_MS / 1000,
  };
}

function verifyOtp({ mobile: rawMobile, code: rawCode, purpose = "login", sessionToken }) {
  const mobile = normalizeMobile(rawMobile);
  const normalizedPurpose = cleanPurpose(purpose);
  const code = String(rawCode || "").replace(/\D/g, "");
  const token = String(sessionToken || "").trim();
  cleanup();

  if (!token) throw new OtpError("OTP session is required", 400, "OTP_SESSION_REQUIRED");
  const session = sessions.get(token);
  if (!session) throw new OtpError("OTP session expired or was replaced. Request a new OTP.", 400, "OTP_SESSION_EXPIRED");

  if (session.mobile !== mobile || session.purpose !== normalizedPurpose || activeSessions.get(activeKey(mobile, normalizedPurpose)) !== token) {
    removeSession(token);
    throw new OtpError("OTP session does not match this request", 400, "OTP_SESSION_MISMATCH");
  }

  session.attempts += 1;
  const expected = session.codeDigest;
  const received = otpDigest(token, code);
  const valid = expected.length === received.length && crypto.timingSafeEqual(expected, received);

  if (!valid) {
    if (session.attempts >= MAX_VERIFY_ATTEMPTS) {
      removeSession(token);
      throw new OtpError(
        "Too many invalid attempts. Request a new OTP.",
        429,
        "OTP_MAX_ATTEMPTS",
        RESEND_DELAY_MS,
      );
    }
    throw new OtpError("The OTP is incorrect. Please try again.", 400, "OTP_INVALID");
  }

  removeSession(token);
  return {
    mobile,
    purpose: session.purpose,
    verificationToken: issueOtpProof(mobile, session.purpose),
  };
}

function resetForTests() {
  sessions.clear();
  activeSessions.clear();
  rateLimits.clear();
}

module.exports = {
  MAX_SENDS_PER_WINDOW,
  MAX_VERIFY_ATTEMPTS,
  OTP_TTL_MS,
  RESEND_DELAY_MS,
  OtpError,
  resetForTests,
  sendOtp,
  verifyOtp,
};
