const crypto = require("crypto");

const DEFAULT_SECRET = "CHANGE_THIS_CONNECT_T_SECRET";
const MIN_SECRET_LENGTH = 32;
let generatedSecret = null;
let warnedAboutSecret = false;

function isProduction() {
  return String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";
}

function configuredSigningSecret() {
  return String(process.env.JWT_SECRET || "").trim();
}

function getSigningSecret() {
  const configured = configuredSigningSecret();
  if (configured && configured !== DEFAULT_SECRET && configured.length >= MIN_SECRET_LENGTH) return configured;

  if (isProduction()) {
    throw new Error(
      "JWT_SECRET must be configured with at least 32 characters before the Connect-T backend can start in production.",
    );
  }

  if (!generatedSecret) generatedSecret = crypto.randomBytes(48).toString("hex");
  if (!warnedAboutSecret) {
    warnedAboutSecret = true;
    console.warn(
      "[Connect-T] JWT_SECRET is not configured for this non-production runtime. Using an ephemeral secure secret; sessions will expire when the backend restarts.",
    );
  }
  return generatedSecret;
}

function b64url(input) {
  const value = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return value.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decodeB64url(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  return Buffer.from(normalized + padding, "base64");
}

function signatureFor(unsigned) {
  return b64url(crypto.createHmac("sha256", getSigningSecret()).update(unsigned).digest());
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function signToken(payload, ttlSeconds = 60 * 60 * 24 * 30) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(body))}`;
  return `${unsigned}.${signatureFor(unsigned)}`;
}

function verifySignedToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;

  const unsigned = `${parts[0]}.${parts[1]}`;
  if (!safeEqual(signatureFor(unsigned), parts[2])) return null;

  try {
    const header = JSON.parse(decodeB64url(parts[0]).toString("utf8"));
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;
    const payload = JSON.parse(decodeB64url(parts[1]).toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

function bearerToken(req) {
  const header = String(req?.headers?.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function verifyRequestToken(req) {
  return verifySignedToken(bearerToken(req));
}

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function issueOtpProof(mobile, purpose) {
  return signToken(
    {
      scope: "otp_verification",
      mobile: normalizeMobile(mobile),
      purpose: String(purpose || "login"),
      jti: crypto.randomBytes(12).toString("hex"),
    },
    10 * 60,
  );
}

function readOtpProof(req) {
  return String(
    req?.headers?.["x-otp-verification"] ||
      req?.body?.otpVerificationToken ||
      req?.body?.otp_verification_token ||
      "",
  ).trim();
}

function verifyOtpProof(req, expectedMobile, allowedPurposes = ["login", "register"]) {
  const payload = verifySignedToken(readOtpProof(req));
  if (!payload || payload.scope !== "otp_verification") return null;
  if (normalizeMobile(payload.mobile) !== normalizeMobile(expectedMobile)) return null;
  if (!allowedPurposes.includes(String(payload.purpose || ""))) return null;
  return payload;
}

// Fail at startup instead of issuing unstable or shared-secret production sessions.
if (isProduction()) getSigningSecret();

module.exports = {
  MIN_SECRET_LENGTH,
  bearerToken,
  getSigningSecret,
  issueOtpProof,
  normalizeMobile,
  signToken,
  verifyOtpProof,
  verifyRequestToken,
  verifySignedToken,
};
