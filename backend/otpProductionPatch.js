/*
 * Production OTP route patch.
 *
 * Loaded before server.js. Registers /api/auth/send-otp and /api/auth/verify-otp
 * before legacy routes so production does not depend on fixed demo codes.
 */

const sessions = new Map();
let installed = false;

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  return res.status(status).json(payload);
}

function cleanup() {
  const now = Date.now();
  for (const [token, item] of sessions.entries()) {
    if (!item || item.expiresAt <= now) sessions.delete(token);
  }
}

async function sendSms(mobile, code) {
  const apiKey = String(process.env.FAST2SMS_API_KEY || "").trim();
  if (!apiKey) return { skipped: true };

  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "q",
      message: `Your Connect T verification code is ${code}. Valid for 5 minutes. Do not share it with anyone.`,
      language: "english",
      flash: "0",
      numbers: mobile,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.return === false) {
    throw new Error(data?.message?.[0] || data?.message || "SMS provider failed");
  }
  return data;
}

async function sendOtp(req, res) {
  try {
    const mobile = normalizeMobile(req.body?.mobile || req.body?.phone);
    const purpose = String(req.body?.purpose || "login").trim() || "login";
    if (mobile.length !== 10) {
      return sendJson(res, 400, { success: false, error: "Valid 10 digit mobile number is required" });
    }

    cleanup();
    const code = makeCode();
    const sessionToken = `otp_${purpose}_${mobile}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await sendSms(mobile, code);

    sessions.set(sessionToken, {
      mobile,
      purpose,
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    const payload = { success: true, sessionToken, message: "OTP sent successfully" };
    if (process.env.NODE_ENV !== "production" && !process.env.FAST2SMS_API_KEY) payload.devOtp = code;
    return sendJson(res, 200, payload);
  } catch (err) {
    return sendJson(res, 500, { success: false, error: err.message || "Failed to send OTP" });
  }
}

async function verifyOtp(req, res) {
  try {
    const code = String(req.body?.otp || req.body?.otp_code || "").trim();
    const sessionToken = String(req.body?.sessionToken || req.body?.session_token || "").trim();
    const mobile = normalizeMobile(req.body?.mobile || req.body?.phone);

    cleanup();
    let session = sessionToken ? sessions.get(sessionToken) : null;

    if (!session && mobile) {
      for (const item of sessions.values()) {
        if (item.mobile === mobile && item.code === code) {
          session = item;
          break;
        }
      }
    }

    if (!session || session.code !== code) {
      return sendJson(res, 400, { success: false, valid: false, error: "Invalid or expired OTP" });
    }

    if (sessionToken) sessions.delete(sessionToken);
    return sendJson(res, 200, {
      success: true,
      valid: true,
      mobile: session.mobile,
      purpose: session.purpose,
      message: "OTP verified successfully",
    });
  } catch (err) {
    return sendJson(res, 500, { success: false, valid: false, error: err.message || "OTP verification failed" });
  }
}

try {
  const express = require("express");
  const originalPost = express.application.post;

  function install(app) {
    if (installed) return;
    installed = true;
    originalPost.call(app, "/api/auth/send-otp", sendOtp);
    originalPost.call(app, "/api/auth/verify-otp", verifyOtp);
  }

  express.application.post = function patchedPost(path, ...handlers) {
    if (path === "/api/auth/send-otp" || path === "/api/auth/verify-otp") install(this);
    return originalPost.call(this, path, ...handlers);
  };

  console.log("[OtpProductionPatch] active");
} catch (err) {
  console.warn("[OtpProductionPatch] disabled:", err.message);
}

module.exports = {};
