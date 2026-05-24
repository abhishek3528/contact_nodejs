const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
});

app.get("/", (req, res) => {
  console.log("Health check API called");
  res.json({ message: "Contact Manager Backend Running with PostgreSQL" });
});

app.get("/api/contacts", async (req, res) => {
  console.log("GET /api/contacts called");

  try {
    const result = await pool.query(
      'SELECT phone, "firstName", "lastName", email, created_at FROM contacts ORDER BY created_at DESC'
    );

    console.log(`Fetched ${result.rows.length} contacts`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({
      message: "Error fetching contacts",
      error: err.message
    });
  }
});

app.get("/api/contacts/:phone", async (req, res) => {
  const { phone } = req.params;
  console.log(`GET /api/contacts/${phone} called`);

  try {
    const result = await pool.query(
      'SELECT phone, "firstName", "lastName", email, created_at FROM contacts WHERE phone=$1',
      [phone]
    );

    if (result.rows.length === 0) {
      console.log(`Contact not found for phone: ${phone}`);
      return res.status(404).json({ message: "Contact not found" });
    }

    console.log(`Contact found for phone: ${phone}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching contact:", err);
    res.status(500).json({
      message: "Error fetching contact",
      error: err.message
    });
  }
});

app.post("/api/contacts", async (req, res) => {
  console.log("POST /api/contacts called");
  console.log("Request body:", req.body);

  try {
    const { firstName, lastName, email, phone } = req.body;

    if (!firstName || !lastName || !email || !phone) {
      console.log("Validation failed: missing required fields");
      return res.status(400).json({
        message: "firstName, lastName, email, and phone are required"
      });
    }

    const result = await pool.query(
      `INSERT INTO contacts (phone, "firstName", "lastName", email)
       VALUES ($1, $2, $3, $4)
       RETURNING phone, "firstName", "lastName", email, created_at`,
      [phone, firstName, lastName, email]
    );

    console.log("Contact created:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating contact:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        message: "Contact with this phone number already exists"
      });
    }

    res.status(500).json({
      message: "Error creating contact",
      error: err.message
    });
  }
});

app.put("/api/contacts/:phone", async (req, res) => {
  const oldPhone = req.params.phone;
  console.log(`PUT /api/contacts/${oldPhone} called`);
  console.log("Request body:", req.body);

  try {
    const { firstName, lastName, email, phone } = req.body;

    if (!firstName || !lastName || !email || !phone) {
      console.log("Validation failed: missing required fields");
      return res.status(400).json({
        message: "firstName, lastName, email, and phone are required"
      });
    }

    const result = await pool.query(
      `UPDATE contacts
       SET phone=$1,
           "firstName"=$2,
           "lastName"=$3,
           email=$4
       WHERE phone=$5
       RETURNING phone, "firstName", "lastName", email, created_at`,
      [phone, firstName, lastName, email, oldPhone]
    );

    if (result.rows.length === 0) {
      console.log(`Contact not found for update: ${oldPhone}`);
      return res.status(404).json({ message: "Contact not found" });
    }

    console.log("Contact updated:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating contact:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        message: "Another contact with this phone number already exists"
      });
    }

    res.status(500).json({
      message: "Error updating contact",
      error: err.message
    });
  }
});

app.delete("/api/contacts/:phone", async (req, res) => {
  const { phone } = req.params;
  console.log(`DELETE /api/contacts/${phone} called`);

  try {
    const result = await pool.query(
      "DELETE FROM contacts WHERE phone=$1 RETURNING *",
      [phone]
    );

    if (result.rows.length === 0) {
      console.log(`Contact not found for delete: ${phone}`);
      return res.status(404).json({ message: "Contact not found" });
    }

    console.log("Contact deleted:", result.rows[0]);
    res.json({ message: "Contact deleted successfully" });
  } catch (err) {
    console.error("Error deleting contact:", err);
    res.status(500).json({
      message: "Error deleting contact",
      error: err.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});