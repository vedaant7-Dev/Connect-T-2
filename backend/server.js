require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

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

const createId = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const WARD_OFFICER_MAP = {
  "1A": "NS002",
  "1B": "NS003",
  "2A": "NS004",
  "2B": "NS005",
  "3A": "NS006",
  "3B": "NS007",
  "4A": "NS008",
  "4B": "NS009",
  "4C": "NS010",
  "5A": "NS011",
  "5B": "NS012",
  "6A": "NS013",
  "6B": "NS014",
  "7A": "NS015",
  "7B": "NS016",
  "8A": "NS017",
  "8B": "NS018",
  "9A": "NS019",
  "9B": "NS020",
  "10A": "NS021",
  "10B": "NS022",
  "11A": "NS023",
  "11B": "NS024",
  "12A": "NS025",
  "12B": "NS026",
  "13A": "NS027",
  "13B": "NS028",
  "14A": "NS029",
  "14B": "NS030",
  "15A": "NS031",
  "15B": "NS032",
  "16A": "NS033",
  "16B": "NS034",
  "17A": "NS035",
  "17B": "NS036",
  "18A": "NS037",
  "18B": "NS038",
  "19A": "NS039",
  "19B": "NS040",
  "20A": "NS041",
  "20B": "NS042",
  "21A": "NS043",
  "21B": "NS044",
  "22A": "NS045",
  "22B": "NS046",
  "23A": "NS047",
  "23B": "NS048",
  "24A": "NS049",
  "24B": "NS050",
  "25A": "NS051",
  "25B": "NS052",
  "26A": "NS053",
  "26B": "NS054",
  "27A": "NS055",
  "27B": "NS056",
  "28A": "NS057",
  "28B": "NS058",
  "29A": "NS059",
  "29B": "NS060",
};

function normalizeWardCode(value) {
  if (!value) return null;

  const match = String(value)
    .trim()
    .toUpperCase()
    .match(/(\d{1,2})\s*([ABC])/);

  if (!match) return null;

  return `${Number(match[1])}${match[2]}`;
}

function getOfficerIdByWardCode(wardCode) {
  const normalizedWardCode = normalizeWardCode(wardCode);

  if (!normalizedWardCode) return null;

  return WARD_OFFICER_MAP[normalizedWardCode] || null;
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Connect-T Render backend running",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS connected");
    res.json({ success: true, backend: "render", mysql: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* USERS */
app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM users ORDER BY created_at DESC",
    );

    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const id = req.body.id || createId("user");

    const {
      name,
      mobile,
      role = "citizen",
      ward,
      ward_code,
      ward_number,
      is_super_admin = false,
      age,
      email,
      address,
      nagarsevak_id,
      avatar_color,
      profile_photo,
      notify_email = false,
      notify_whatsapp = false,
    } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({
        success: false,
        error: "name and mobile are required",
      });
    }

    await db.query(
      `INSERT INTO users
      (id, name, mobile, role, ward, ward_code, ward_number, is_super_admin, age, email, address, nagarsevak_id, avatar_color, profile_photo, notify_email, notify_whatsapp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      role = VALUES(role),
      ward = VALUES(ward),
      ward_code = VALUES(ward_code),
      ward_number = VALUES(ward_number),
      is_super_admin = VALUES(is_super_admin),
      age = VALUES(age),
      email = VALUES(email),
      address = VALUES(address),
      nagarsevak_id = VALUES(nagarsevak_id),
      avatar_color = VALUES(avatar_color),
      profile_photo = VALUES(profile_photo),
      notify_email = VALUES(notify_email),
      notify_whatsapp = VALUES(notify_whatsapp)`,
      [
        id,
        name,
        mobile,
        role,
        ward || null,
        ward_code || null,
        ward_number || null,
        is_super_admin ? 1 : 0,
        age || null,
        email || null,
        address || null,
        nagarsevak_id || null,
        avatar_color || null,
        profile_photo || null,
        notify_email ? 1 : 0,
        notify_whatsapp ? 1 : 0,
      ],
    );

    res.status(201).json({ success: true, userId: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* COMPLAINTS */
app.get("/api/complaints", async (req, res) => {
  try {
    const {
      ward,
      ward_code,
      assigned_officer_id,
      status,
      category,
      user_id,
      user_mobile,
    } = req.query;

    let sql = "SELECT * FROM complaints WHERE 1=1";
    const params = [];

    if (ward) {
      sql += " AND ward = ?";
      params.push(ward);
    }

    if (ward_code) {
      sql += " AND ward_code = ?";
      params.push(ward_code);
    }

    if (assigned_officer_id) {
      sql += " AND assigned_officer_id = ?";
      params.push(assigned_officer_id);
    }

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }

    if (user_id) {
      sql += " AND user_id = ?";
      params.push(user_id);
    }

    if (user_mobile) {
      sql += " AND user_mobile = ?";
      params.push(user_mobile);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await db.query(sql, params);

    res.json({
      success: true,
      complaints: rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/complaints/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM complaints WHERE id = ?", [
      req.params.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Complaint not found",
      });
    }

    const [timeline] = await db.query(
      "SELECT * FROM complaint_status_updates WHERE complaint_id = ? ORDER BY created_at ASC",
      [req.params.id],
    );

    res.json({
      success: true,
      complaint: {
        ...rows[0],
        timeline,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/complaints", async (req, res) => {
  try {
    const id = req.body.id || createId("complaint");

    const {
      title,
      description,
      category = "other",
      photo_url,
      location,
      ward,
      ward_code,
      assigned_officer_id,
      user_id,
      user_name,
      user_mobile,
      user_address,
      user_age,
      user_email,
    } = req.body;

    if (!title || !description || !location || !ward) {
      return res.status(400).json({
        success: false,
        error: "title, description, location and ward are required",
      });
    }

    const finalWardCode =
      normalizeWardCode(ward_code) || normalizeWardCode(ward);

    const finalAssignedOfficerId =
      assigned_officer_id || getOfficerIdByWardCode(finalWardCode);

    await db.query(
      `INSERT INTO complaints
      (id, title, description, category, photo_url, location, ward, ward_code, assigned_officer_id, user_id, user_name, user_mobile, user_address, user_age, user_email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title,
        description,
        category,
        photo_url || null,
        location,
        ward,
        finalWardCode || null,
        finalAssignedOfficerId || null,
        user_id || null,
        user_name || null,
        user_mobile || null,
        user_address || null,
        user_age || null,
        user_email || null,
      ],
    );

    await db.query(
      `INSERT INTO complaint_status_updates
      (complaint_id, status, note, updated_by)
      VALUES (?, 'submitted', 'Complaint submitted', ?)`,
      [id, user_name || "citizen"],
    );

    res.status(201).json({
      success: true,
      complaintId: id,
      ward_code: finalWardCode || null,
      assigned_officer_id: finalAssignedOfficerId || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/complaints/:id/status", async (req, res) => {
  try {
    const { status, note, assigned_to, resolved_note, updated_by } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "status is required",
      });
    }

    await db.query(
      `UPDATE complaints
       SET status = ?,
           assigned_to = COALESCE(?, assigned_to),
           resolved_note = COALESCE(?, resolved_note)
       WHERE id = ?`,
      [status, assigned_to || null, resolved_note || null, req.params.id],
    );

    await db.query(
      `INSERT INTO complaint_status_updates
      (complaint_id, status, note, updated_by)
      VALUES (?, ?, ?, ?)`,
      [req.params.id, status, note || null, updated_by || "admin"],
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ADMIN ANALYTICS */
app.get("/api/admin/analytics", async (req, res) => {
  try {
    const [summary] = await db.query(
      `SELECT 
        COUNT(*) AS total,
        SUM(status = 'submitted') AS submitted,
        SUM(status = 'assigned') AS assigned,
        SUM(status = 'in_progress') AS in_progress,
        SUM(status = 'resolved') AS resolved,
        SUM(status = 'rejected') AS rejected
       FROM complaints`,
    );

    const [wardStats] = await db.query(
      `SELECT 
        ward_code,
        ward,
        COUNT(*) AS total,
        SUM(status = 'submitted') AS submitted,
        SUM(status = 'assigned') AS assigned,
        SUM(status = 'in_progress') AS in_progress,
        SUM(status = 'resolved') AS resolved,
        SUM(status = 'rejected') AS rejected
       FROM complaints
       GROUP BY ward_code, ward
       ORDER BY ward_code ASC`,
    );

    const [officerStats] = await db.query(
      `SELECT 
        assigned_officer_id,
        COUNT(*) AS total,
        SUM(status = 'submitted') AS submitted,
        SUM(status = 'assigned') AS assigned,
        SUM(status = 'in_progress') AS in_progress,
        SUM(status = 'resolved') AS resolved,
        SUM(status = 'rejected') AS rejected
       FROM complaints
       GROUP BY assigned_officer_id
       ORDER BY assigned_officer_id ASC`,
    );

    res.json({
      success: true,
      summary: summary[0],
      wardStats,
      officerStats,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ALERTS */
app.get("/api/alerts", async (req, res) => {
  try {
    const { type, ward } = req.query;

    let sql = "SELECT * FROM alerts WHERE 1=1";
    const params = [];

    if (type) {
      sql += " AND type = ?";
      params.push(type);
    }

    if (ward) {
      sql += " AND (ward = ? OR ward IS NULL)";
      params.push(ward);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await db.query(sql, params);
    res.json({ success: true, alerts: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/alerts", async (req, res) => {
  try {
    const id = req.body.id || createId("alert");

    const {
      title,
      body,
      type = "alert",
      category,
      priority = "normal",
      location,
      valid_until,
      expires_at,
      target_audience,
      media_uri,
      media_type,
      media_file_name,
      media_mime_type,
      media_duration,
      posted_by,
      posted_by_id,
      ward,
    } = req.body;

    if (!title || !body || !posted_by) {
      return res.status(400).json({
        success: false,
        error: "title, body and posted_by are required",
      });
    }

    await db.query(
      `INSERT INTO alerts
      (id, title, body, type, category, priority, location, valid_until, expires_at, target_audience, media_uri, media_type, media_file_name, media_mime_type, media_duration, posted_by, posted_by_id, ward)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title,
        body,
        type,
        category || null,
        priority,
        location || null,
        valid_until || null,
        expires_at || null,
        target_audience || null,
        media_uri || null,
        media_type || null,
        media_file_name || null,
        media_mime_type || null,
        media_duration || null,
        posted_by,
        posted_by_id || null,
        ward || null,
      ],
    );

    res.status(201).json({ success: true, alertId: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* FEED */
app.get("/api/feed/posts", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        p.*,
        COUNT(l.id) AS likes_count
       FROM feed_posts p
       LEFT JOIN feed_post_likes l ON p.id = l.post_id
       GROUP BY p.id
       ORDER BY p.pinned DESC, p.created_at DESC`,
    );

    res.json({ success: true, posts: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/feed/posts", async (req, res) => {
  try {
    const id = req.body.id || createId("post");

    const {
      author_id,
      author_name,
      author_role,
      avatar_color,
      type = "general",
      content,
      image_uri,
      pinned = false,
    } = req.body;

    if (!author_id || !author_name || !author_role || !content) {
      return res.status(400).json({
        success: false,
        error: "author_id, author_name, author_role and content are required",
      });
    }

    await db.query(
      `INSERT INTO feed_posts
      (id, author_id, author_name, author_role, avatar_color, type, content, image_uri, pinned)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        author_id,
        author_name,
        author_role,
        avatar_color || null,
        type,
        content,
        image_uri || null,
        pinned ? 1 : 0,
      ],
    );

    res.status(201).json({ success: true, postId: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/feed/posts/:id/like", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "user_id is required",
      });
    }

    await db.query(
      "INSERT IGNORE INTO feed_post_likes (post_id, user_id) VALUES (?, ?)",
      [req.params.id, user_id],
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* CHAT */
app.get("/api/chat/messages", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM chat_messages ORDER BY created_at ASC",
    );

    res.json({ success: true, messages: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/chat/messages", async (req, res) => {
  try {
    const id = req.body.id || createId("msg");

    const { author_id, author_name, author_role, avatar_color, text } =
      req.body;

    if (!author_id || !author_name || !author_role || !text) {
      return res.status(400).json({
        success: false,
        error: "author_id, author_name, author_role and text are required",
      });
    }

    await db.query(
      `INSERT INTO chat_messages
      (id, author_id, author_name, author_role, avatar_color, text)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [id, author_id, author_name, author_role, avatar_color || null, text],
    );

    res.status(201).json({ success: true, messageId: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* SERVICES */
app.get("/api/services", async (req, res) => {
  try {
    const { category_id } = req.query;

    let sql = "SELECT * FROM service_places";
    const params = [];

    if (category_id) {
      sql += " WHERE category_id = ?";
      params.push(category_id);
    }

    sql += " ORDER BY rating DESC, name ASC";

    const [rows] = await db.query(sql, params);
    res.json({ success: true, services: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/services", async (req, res) => {
  try {
    const id = req.body.id || createId("service");

    const {
      category_id,
      name,
      address,
      distance,
      distance_km,
      type,
      speciality,
      timing,
      govt_type,
      established,
      beds,
      beds_occupied,
      services_json,
      rating,
      review_count = 0,
    } = req.body;

    if (!category_id || !name || !address) {
      return res.status(400).json({
        success: false,
        error: "category_id, name and address are required",
      });
    }

    await db.query(
      `INSERT INTO service_places
      (id, category_id, name, address, distance, distance_km, type, speciality, timing, govt_type, established, beds, beds_occupied, services_json, rating, review_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        category_id,
        name,
        address,
        distance || null,
        distance_km || null,
        type || null,
        speciality || null,
        timing || null,
        govt_type || null,
        established || null,
        beds || null,
        beds_occupied || null,
        services_json ? JSON.stringify(services_json) : null,
        rating || null,
        review_count,
      ],
    );

    res.status(201).json({ success: true, serviceId: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* EMERGENCY */
app.get("/api/emergency", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM emergency_contacts ORDER BY id ASC",
    );

    res.json({ success: true, emergencyContacts: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* JOB USERS */
app.get("/api/job-users", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM job_users ORDER BY created_at DESC",
    );

    res.json({ success: true, jobUsers: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/job-users", async (req, res) => {
  try {
    const id = req.body.id || createId("jobuser");

    const {
      name,
      phone,
      role,
      avatar_color,
      age,
      qualification,
      skills,
      email,
      about,
      current_status,
      current_company,
      current_job_role,
      experience,
      previous_company,
      previous_role,
      college_name,
      field_of_study,
      location,
      languages,
      profile_photo,
      company,
      gst_no,
      company_type,
      company_size,
      industry,
      website,
      company_description,
      address,
      pincode,
      whatsapp,
      year_established,
      contact_person,
    } = req.body;

    if (!name || !phone || !role) {
      return res.status(400).json({
        success: false,
        error: "name, phone and role are required",
      });
    }

    await db.query(
      `INSERT INTO job_users
      (id, name, phone, role, avatar_color, age, qualification, skills, email, about, current_status, current_company, current_job_role, experience, previous_company, previous_role, college_name, field_of_study, location, languages, profile_photo, company, gst_no, company_type, company_size, industry, website, company_description, address, pincode, whatsapp, year_established, contact_person)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        phone,
        role,
        avatar_color || null,
        age || null,
        qualification || null,
        skills || null,
        email || null,
        about || null,
        current_status || null,
        current_company || null,
        current_job_role || null,
        experience || null,
        previous_company || null,
        previous_role || null,
        college_name || null,
        field_of_study || null,
        location || null,
        languages || null,
        profile_photo || null,
        company || null,
        gst_no || null,
        company_type || null,
        company_size || null,
        industry || null,
        website || null,
        company_description || null,
        address || null,
        pincode || null,
        whatsapp || null,
        year_established || null,
        contact_person || null,
      ],
    );

    res.status(201).json({ success: true, jobUserId: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* JOBS */
app.get("/api/jobs", async (req, res) => {
  try {
    const { category, type, active } = req.query;

    let sql = "SELECT * FROM jobs WHERE 1=1";
    const params = [];

    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }

    if (type) {
      sql += " AND type = ?";
      params.push(type);
    }

    if (active !== undefined) {
      sql += " AND active = ?";
      params.push(active === "true" ? 1 : 0);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await db.query(sql, params);
    res.json({ success: true, jobs: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/jobs", async (req, res) => {
  try {
    const id = req.body.id || createId("job");

    const {
      employer_id,
      employer_name,
      employer_phone,
      employer_whatsapp,
      company,
      title,
      category = "other",
      type = "full-time",
      salary,
      location,
      description,
      requirements,
      openings = 1,
      active = true,
    } = req.body;

    if (!employer_id || !employer_name || !company || !title) {
      return res.status(400).json({
        success: false,
        error: "employer_id, employer_name, company and title are required",
      });
    }

    await db.query(
      `INSERT INTO jobs
      (id, employer_id, employer_name, employer_phone, employer_whatsapp, company, title, category, type, salary, location, description, requirements, openings, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        employer_id,
        employer_name,
        employer_phone || null,
        employer_whatsapp || null,
        company,
        title,
        category,
        type,
        salary || null,
        location || null,
        description || null,
        requirements || null,
        openings,
        active ? 1 : 0,
      ],
    );

    res.status(201).json({ success: true, jobId: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* JOB APPLICATIONS */
app.post("/api/jobs/:id/apply", async (req, res) => {
  try {
    const { seeker_id } = req.body;

    if (!seeker_id) {
      return res.status(400).json({
        success: false,
        error: "seeker_id is required",
      });
    }

    await db.query(
      "INSERT INTO job_applications (job_id, seeker_id) VALUES (?, ?)",
      [req.params.id, seeker_id],
    );

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/jobs/:id/applications", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, u.name, u.phone, u.qualification, u.skills, u.location
       FROM job_applications a
       LEFT JOIN job_users u ON a.seeker_id = u.id
       WHERE a.job_id = ?
       ORDER BY a.created_at DESC`,
      [req.params.id],
    );

    res.json({ success: true, applications: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* OTP AUTH */
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeMobile(mobile) {
  return String(mobile || "").replace(/\D/g, "");
}

app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const mobile = normalizeMobile(req.body?.mobile);
    const purpose = req.body?.purpose || "login";

    if (mobile.length !== 10) {
      return res.status(400).json({
        success: false,
        error: "Valid 10 digit mobile number is required",
      });
    }

    const otp = "1234";
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.query(
      `INSERT INTO otp_codes (mobile, otp_code, purpose, expires_at)
       VALUES (?, ?, ?, ?)`,
      [mobile, otp, purpose, expiresAt],
    );

    return res.json({
      success: true,
      message: "Demo OTP sent successfully",
      devOtp: "1234",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const mobile = normalizeMobile(req.body?.mobile);
    const otp = String(req.body?.otp || "").trim();

    if (mobile.length !== 10) {
      return res.status(400).json({
        success: false,
        error: "Valid mobile number required",
      });
    }

    if (otp !== "1234") {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP. Use demo OTP 1234",
      });
    }

    return res.json({
      success: true,
      message: "OTP verified successfully",
      user: {
        mobile,
        role: mobile === "8554994735" ? "super_admin" : "citizen",
        is_super_admin: mobile === "8554994735" ? 1 : 0,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* 404 */
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
