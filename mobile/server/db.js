const mysql = require("mysql2/promise");

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: requiredEnv("DB_USER"),
  password: process.env.DB_PASSWORD || process.env.DB_PASS || requiredEnv("DB_PASSWORD"),
  database: requiredEnv("DB_NAME"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
