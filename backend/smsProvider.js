const mysql = require("mysql2/promise");

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || process.env.DB_PASS,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
}

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

async function ensureSettingsTable() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function readSettings() {
  await ensureSettingsTable();
  const db = getPool();
  const [rows] = await db.query("SELECT setting_key, setting_value FROM app_settings");
  const settings = {};
  for (const row of rows) {
    settings[row.setting_key] = row.setting_value;
  }
  return settings;
}

function getSetting(settings, key, fallback = "") {
  return String(settings[key] || process.env[key] || fallback || "").trim();
}

function required(settings, key, fallback = "") {
  const value = getSetting(settings, key, fallback);
  if (!value) throw new Error(`${key} is required`);
  return value;
}

async function saveDoveSmsSettings(input = {}) {
  await ensureSettingsTable();

  const doveSmsKey = String(input.doveSmsKey || input.DOVE_SMS_KEY || "").trim();
  if (!doveSmsKey) {
    throw new Error("Dove SMS key is required");
  }

  const settings = {
    CONNECT_T_REAL_OTP: "1",
    DOVE_SMS_USER: String(input.doveSmsUser || "Gvkgroup").trim(),
    DOVE_SMS_KEY: doveSmsKey,
    DOVE_SMS_SENDER: String(input.doveSmsSender || "AMCVOT").trim(),
    DOVE_SMS_ACCUSAGE: String(input.doveSmsAccusage || "6").trim(),
    DOVE_SMS_ENTITYID: String(input.doveSmsEntityId || "1501569240000053586").trim(),
    DOVE_SMS_TEMPID: String(input.doveSmsTempId || "1707176250297530657").trim(),
    DOVE_SMS_URL: String(input.doveSmsUrl || "https://mobicomm.dove-sms.com//submitsms.jsp").trim(),
  };

  const db = getPool();

  for (const [key, value] of Object.entries(settings)) {
    await db.query(
      `INSERT INTO app_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, value]
    );
  }

  return {
    success: true,
    savedKeys: Object.keys(settings).filter((key) => key !== "DOVE_SMS_KEY"),
    doveSmsKeySaved: true,
  };
}

async function getDoveSmsSettingsSafe() {
  const settings = await readSettings();
  const key = getSetting(settings, "DOVE_SMS_KEY");

  return {
    connectTRealOtp: getSetting(settings, "CONNECT_T_REAL_OTP", "0"),
    doveSmsUser: getSetting(settings, "DOVE_SMS_USER"),
    doveSmsSender: getSetting(settings, "DOVE_SMS_SENDER"),
    doveSmsAccusage: getSetting(settings, "DOVE_SMS_ACCUSAGE"),
    doveSmsEntityId: getSetting(settings, "DOVE_SMS_ENTITYID"),
    doveSmsTempId: getSetting(settings, "DOVE_SMS_TEMPID"),
    doveSmsUrl: getSetting(settings, "DOVE_SMS_URL"),
    doveSmsKeySet: Boolean(key),
    doveSmsKeyLast4: key ? key.slice(-4) : null,
  };
}

async function sendOtpSms(mobileLast10, otp) {
  const settings = await readSettings();

  const realOtpEnabled = getSetting(settings, "CONNECT_T_REAL_OTP") === "1";
  if (!realOtpEnabled) {
    throw new Error("Real OTP is not enabled");
  }

  const mobile = normalizeMobile(mobileLast10);
  if (mobile.length !== 10) {
    throw new Error("Valid 10 digit mobile number is required");
  }

  const message =
    `Dear User, Your OTP is ${otp}. Please use this code to verify your identity. ` +
    `Do not share this OTP with anyone. Thank you, GBK Group`;

  const params = new URLSearchParams({
    user: required(settings, "DOVE_SMS_USER"),
    key: required(settings, "DOVE_SMS_KEY"),
    mobile: `+91${mobile}`,
    message,
    senderid: required(settings, "DOVE_SMS_SENDER"),
    accusage: required(settings, "DOVE_SMS_ACCUSAGE", "6"),
    entityid: required(settings, "DOVE_SMS_ENTITYID"),
    tempid: required(settings, "DOVE_SMS_TEMPID"),
  });

  const smsUrl = required(settings, "DOVE_SMS_URL", "https://mobicomm.dove-sms.com//submitsms.jsp");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${smsUrl}?`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: params.toString(),
      signal: controller.signal,
    });

    const raw = await response.text().catch(() => "");

    if (!response.ok || !raw) {
      throw new Error(`SMS provider failed: HTTP ${response.status} ${raw || "empty response"}`);
    }

    return { ok: true, raw };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  sendOtpSms,
  saveDoveSmsSettings,
  getDoveSmsSettingsSafe,
  ensureSettingsTable,
};
