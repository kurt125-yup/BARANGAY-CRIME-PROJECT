const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const config = {
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3307),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "barangay_crime_db"
  },
  port: Number(process.env.PORT || 4000),
  seed: {
    incidentCount: Number(process.env.SEED_INCIDENT_COUNT || 1000),
    months: Number(process.env.SEED_MONTHS || 24),
    endMonth: process.env.SEED_END_MONTH || "2026-07"
  },
  rootDir: path.join(__dirname, "..")
};

module.exports = config;
