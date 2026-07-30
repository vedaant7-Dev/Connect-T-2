"use strict";

/*
 * Direct Job Portal identity handoff.
 *
 * A citizen has already verified the mobile number with OTP before entering the
 * Civic or Job Portal dashboard. The normal Civic bearer token can become stale
 * after a backend deployment, which previously blocked profile setup even though
 * the user had just completed OTP verification. For the three handoff routes
 * only, accept that signed OTP identity as the citizen identity and let the route
 * issue a normal Job Portal token after setup or switching.
 */

const authSecurity = require("./authSecurity");

const originalVerifyRequestToken = authSecurity.verifyRequestToken;
const ALLOWED_PATHS = new Set([
  "/api/job-portal/session",
  "/api/job-portal/onboarding",
  "/api/job-portal/switch-role",
  "/session",
  "/onboarding",
  "/switch-role",
]);
const ALLOWED_PURPOSES = new Set(["login", "register"]);

function requestPath(req) {
  const values = [req?.originalUrl, req?.baseUrl && req?.path ? `${req.baseUrl}${req.path}` : "", req?.path, req?.url];
  return values
    .map((value) => String(value || "").split("?")[0])
    .find((value) => ALLOWED_PATHS.has(value)) || "";
}

function otpProof(req) {
  return String(
    req?.headers?.["x-otp-verification"] ||
      req?.body?.otpVerificationToken ||
      req?.body?.otp_verification_token ||
      "",
  ).trim();
}

function verifiedOtpIdentity(req) {
  if (!requestPath(req)) return null;
  const payload = authSecurity.verifySignedToken(otpProof(req));
  const mobile = authSecurity.normalizeMobile(payload?.mobile);
  if (!payload || payload.scope !== "otp_verification") return null;
  if (!ALLOWED_PURPOSES.has(String(payload.purpose || ""))) return null;
  if (mobile.length !== 10) return null;

  // The existing Job Portal resolvers already support a job-portal scoped token
  // by locating the citizen through the verified mobile number. A synthetic sub
  // is used only to satisfy their non-empty identity guard; it is never used as
  // a database user id.
  return {
    sub: `verified_mobile_${mobile}`,
    mobile,
    role: "citizen",
    scope: "job_portal",
    otpVerified: true,
  };
}

authSecurity.verifyRequestToken = function verifyRequestTokenWithOtpIdentity(req) {
  const bearerIdentity = originalVerifyRequestToken(req);
  if (bearerIdentity?.sub) return bearerIdentity;
  return verifiedOtpIdentity(req);
};

console.log("[JobPortalOtpIdentityPatch] direct verified-mobile setup and switching active");

module.exports = { ALLOWED_PATHS, verifiedOtpIdentity };
