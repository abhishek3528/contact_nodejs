const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

app.get("/", (req, res) => {
  res.json({ message: "Contact Manager Backend Running with PostgreSQL" });
});

app.get("/api/contacts", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM contacts ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching contacts", error: err.message });
  }
});

app.post("/api/contacts", async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;

    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await pool.query(
      `INSERT INTO contacts ("firstName", "lastName", email, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [firstName, lastName, email, phone]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error creating contact", error: err.message });
  }
});

app.put("/api/contacts/:id", async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE contacts
       SET "firstName"=$1, "lastName"=$2, email=$3, phone=$4
       WHERE id=$5
       RETURNING *`,
      [firstName, lastName, email, phone, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Contact not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error updating contact", error: err.message });
  }
});

app.delete("/api/contacts/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM contacts WHERE id=$1 RETURNING *",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Contact not found" });
    }

    res.json({ message: "Contact deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting contact", error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});