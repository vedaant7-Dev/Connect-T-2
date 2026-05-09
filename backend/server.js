require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ROOT
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Connect-T Render backend running",
  });
});

// HEALTH
app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS connected");

    res.json({
      success: true,
      backend: "render",
      mysql: rows,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      backend: "render",
      error: err.message,
    });
  }
});

// USERS
app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM users ORDER BY id DESC"
    );

    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { full_name, email, phone, city } = req.body;

    if (!full_name) {
      return res.status(400).json({
        success: false,
        error: "full_name is required",
      });
    }

    const [result] = await db.query(
      "INSERT INTO users (full_name, email, phone, city) VALUES (?, ?, ?, ?)",
      [full_name, email || null, phone || null, city || null]
    );

    res.status(201).json({
      success: true,
      userId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CITIES
app.get("/api/cities", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM cities ORDER BY name ASC"
    );

    res.json({ success: true, cities: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/cities", async (req, res) => {
  try {
    const { name, state, country } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "city name is required",
      });
    }

    const [result] = await db.query(
      "INSERT INTO cities (name, state, country) VALUES (?, ?, ?)",
      [name, state || null, country || "India"]
    );

    res.status(201).json({
      success: true,
      cityId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POSTS
app.get("/api/posts", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM posts ORDER BY id DESC"
    );

    res.json({ success: true, posts: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/posts", async (req, res) => {
  try {
    const { user_id, title, content, city, category, image_url } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: "title and content are required",
      });
    }

    const [result] = await db.query(
      `INSERT INTO posts 
       (user_id, title, content, city, category, image_url) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user_id || null,
        title,
        content,
        city || null,
        category || null,
        image_url || null,
      ]
    );

    res.status(201).json({
      success: true,
      postId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SERVICES
app.get("/api/services", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM services ORDER BY id DESC"
    );

    res.json({ success: true, services: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/services", async (req, res) => {
  try {
    const {
      user_id,
      title,
      description,
      category,
      price,
      city,
      phone,
      image_url,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: "title and description are required",
      });
    }

    const [result] = await db.query(
      `INSERT INTO services 
       (user_id, title, description, category, price, city, phone, image_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id || null,
        title,
        description,
        category || null,
        price || null,
        city || null,
        phone || null,
        image_url || null,
      ]
    );

    res.status(201).json({
      success: true,
      serviceId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// BOOKINGS
app.get("/api/bookings", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM bookings ORDER BY id DESC"
    );

    res.json({ success: true, bookings: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/bookings", async (req, res) => {
  try {
    const { user_id, service_id, booking_date, status, notes } = req.body;

    if (!user_id || !service_id) {
      return res.status(400).json({
        success: false,
        error: "user_id and service_id are required",
      });
    }

    const [result] = await db.query(
      `INSERT INTO bookings 
       (user_id, service_id, booking_date, status, notes) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        user_id,
        service_id,
        booking_date || null,
        status || "pending",
        notes || null,
      ]
    );

    res.status(201).json({
      success: true,
      bookingId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CHATS
app.get("/api/chats", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM chats ORDER BY id DESC"
    );

    res.json({ success: true, chats: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/chats", async (req, res) => {
  try {
    const { sender_id, receiver_id, message } = req.body;

    if (!sender_id || !receiver_id || !message) {
      return res.status(400).json({
        success: false,
        error: "sender_id, receiver_id and message are required",
      });
    }

    const [result] = await db.query(
      "INSERT INTO chats (sender_id, receiver_id, message) VALUES (?, ?, ?)",
      [sender_id, receiver_id, message]
    );

    res.status(201).json({
      success: true,
      chatId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// EMERGENCY CONTACTS
app.get("/api/emergency", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM emergency_contacts ORDER BY id DESC"
    );

    res.json({ success: true, emergencyContacts: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/emergency", async (req, res) => {
  try {
    const { name, phone, category, city } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: "name and phone are required",
      });
    }

    const [result] = await db.query(
      "INSERT INTO emergency_contacts (name, phone, category, city) VALUES (?, ?, ?, ?)",
      [name, phone, category || null, city || null]
    );

    res.status(201).json({
      success: true,
      contactId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "API route not found",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Connect-T backend running on port ${PORT}`);
});
