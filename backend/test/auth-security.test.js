"use strict";

process.env.JWT_SECRET = "connect-t-test-secret-with-more-than-thirty-two-characters";

const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");

const {
  issueOtpProof,
  signToken,
  verifyOtpProof,
  verifyRequestToken,
  verifySignedToken,
} = require("../authSecurity");
const { MAX_VERIFY_ATTEMPTS, resetForTests, sendOtp, verifyOtp } = require("../otpService");

beforeEach(() => resetForTests());

test("signed authentication tokens verify and tampered tokens fail", () => {
  const token = signToken({ sub: "U100", role: "citizen", scope: "civic" });
  const request = { headers: { authorization: `Bearer ${token}` } };

  assert.equal(verifyRequestToken(request).sub, "U100");
  assert.equal(verifySignedToken(`${token.slice(0, -1)}x`), null);
  assert.equal(verifySignedToken(signToken({ sub: "expired" }, 0)), null);
});

test("OTP proof is limited to its mobile number and purpose", () => {
  const proof = issueOtpProof("+91 98765 43210", "login");
  const request = { headers: { "x-otp-verification": proof } };

  assert.equal(verifyOtpProof(request, "9876543210", ["login"]).mobile, "9876543210");
  assert.equal(verifyOtpProof(request, "9876543210", ["register"]), null);
  assert.equal(verifyOtpProof(request, "9999999999", ["login"]), null);
});

test("OTP sessions require the matching session, mobile, purpose, and code", async () => {
  let deliveredCode = "";
  const sent = await sendOtp({
    mobile: "9876543210",
    purpose: "register",
    sendSms: async (_mobile, code) => {
      deliveredCode = code;
    },
  });

  assert.match(deliveredCode, /^\d{6}$/);
  assert.throws(
    () =>
      verifyOtp({
        mobile: "9876543210",
        purpose: "login",
        code: deliveredCode,
        sessionToken: sent.sessionToken,
      }),
    (error) => error?.code === "OTP_SESSION_MISMATCH",
  );

  resetForTests();
  const second = await sendOtp({
    mobile: "9876543210",
    purpose: "register",
    sendSms: async (_mobile, code) => {
      deliveredCode = code;
    },
  });
  const verified = verifyOtp({
    mobile: "9876543210",
    purpose: "register",
    code: deliveredCode,
    sessionToken: second.sessionToken,
  });

  assert.equal(verified.mobile, "9876543210");
  assert.ok(verifySignedToken(verified.verificationToken));
  assert.throws(
    () =>
      verifyOtp({
        mobile: "9876543210",
        purpose: "register",
        code: deliveredCode,
        sessionToken: second.sessionToken,
      }),
    (error) => error?.code === "OTP_SESSION_EXPIRED",
  );
});

test("incorrect OTP attempts remain retryable until the maximum is reached", async () => {
  let deliveredCode = "";
  const sent = await sendOtp({
    mobile: "9000000001",
    purpose: "login",
    sendSms: async (_mobile, code) => {
      deliveredCode = code;
    },
  });

  for (let attempt = 1; attempt < MAX_VERIFY_ATTEMPTS; attempt += 1) {
    assert.throws(
      () => verifyOtp({ mobile: "9000000001", purpose: "login", code: "000000", sessionToken: sent.sessionToken }),
      (error) => error?.code === "OTP_INVALID",
    );
  }

  assert.throws(
    () => verifyOtp({ mobile: "9000000001", purpose: "login", code: "000000", sessionToken: sent.sessionToken }),
    (error) => error?.code === "OTP_MAX_ATTEMPTS" && error?.status === 429,
  );
  assert.throws(
    () => verifyOtp({ mobile: "9000000001", purpose: "login", code: deliveredCode, sessionToken: sent.sessionToken }),
    (error) => error?.code === "OTP_SESSION_EXPIRED",
  );
});

test("OTP resend throttling is enforced", async () => {
  const sendSms = async () => {};
  await sendOtp({ mobile: "9123456789", purpose: "login", sendSms });

  await assert.rejects(
    sendOtp({ mobile: "9123456789", purpose: "login", sendSms }),
    (error) => error?.status === 429 && error?.code === "OTP_RESEND_TOO_SOON",
  );
});

test("replacement OTP supersedes the previous session", async () => {
  const originalNow = Date.now;
  let now = 1_800_000_000_000;
  Date.now = () => now;
  const codes = [];
  try {
    const first = await sendOtp({
      mobile: "9988776655",
      purpose: "login",
      sendSms: async (_mobile, code) => codes.push(code),
    });
    now += 46_000;
    const second = await sendOtp({
      mobile: "9988776655",
      purpose: "login",
      sendSms: async (_mobile, code) => codes.push(code),
    });
    assert.throws(
      () => verifyOtp({ mobile: "9988776655", purpose: "login", code: codes[0], sessionToken: first.sessionToken }),
      (error) => error?.code === "OTP_SESSION_EXPIRED",
    );
    assert.equal(verifyOtp({ mobile: "9988776655", purpose: "login", code: codes[1], sessionToken: second.sessionToken }).mobile, "9988776655");
  } finally {
    Date.now = originalNow;
  }
});
