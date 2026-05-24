import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getDb(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "193.203.184.201",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "u818923248_app",
      password: process.env.DB_PASS || "K3I?XVCE#Io",
      database: process.env.DB_NAME || "u818923248_app",
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 10000,
    });
  }
  return pool;
}

export function normMobile(s: string): string {
  return String(s || "").replace(/\D/g, "");
}
