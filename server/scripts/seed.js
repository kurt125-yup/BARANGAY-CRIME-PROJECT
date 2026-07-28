// Generates dummy-but-plausible data for local testing.
// Usage: npm run db:seed
//
// The generator is deterministic (fixed PRNG seed), so every teammate who runs
// it against a fresh schema gets the exact same dataset. Change SEED below if
// you want a different draw.
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const config = require("../config");

const SEED = 20260726;

// ---------------------------------------------------------------------------
// Deterministic PRNG helpers (mulberry32)
// ---------------------------------------------------------------------------
function makeRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = makeRandom(SEED);
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = list => list[Math.floor(rand() * list.length)];

function pickWeighted(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rand() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1];
}

// Nudge a coordinate by up to ~metres/111000 degrees so incidents scatter
// around their purok centre instead of stacking on one pin.
const jitter = metres => (rand() - 0.5) * 2 * (metres / 111000);
const round7 = value => Number(value.toFixed(7));

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
const CENTER = { lat: 14.7287, lng: 120.9834 };

const PUROKS = [
  { purok_no: 1, name: "Purok 1 - Amparo Main Gate", landmark: "Main gate arch and jeepney terminal", lat: 14.7301, lng: 120.9827, household_count: 240, risk_note: "High foot traffic, frequent traffic obstruction reports" },
  { purok_no: 2, name: "Purok 2 - Riverside Walk", landmark: "Creek footbridge", lat: 14.7258, lng: 120.9851, household_count: 186, risk_note: "Poor lighting along the creek path" },
  { purok_no: 3, name: "Purok 3 - Amparo Main Road", landmark: "Tricycle waiting shed", lat: 14.7298, lng: 120.9836, household_count: 312, risk_note: "Recurring theft of parked motorcycle parts" },
  { purok_no: 4, name: "Purok 4 - Basketball Court", landmark: "Covered court and multi-purpose hall", lat: 14.7272, lng: 120.9832, household_count: 204, risk_note: "Night gatherings, vandalism on signage" },
  { purok_no: 5, name: "Purok 5 - Lopez Compound", landmark: "Compound gate, sari-sari store row", lat: 14.7266, lng: 120.9847, household_count: 158, risk_note: "Dense housing, noise complaints after 22:00" },
  { purok_no: 6, name: "Purok 6 - Amparo Market Perimeter", landmark: "Public market rear gate", lat: 14.7279, lng: 120.9818, household_count: 132, risk_note: "Loitering and lookout behaviour near market gates" },
  { purok_no: 7, name: "Purok 7 - Barangay Hall Access Road", landmark: "Barangay hall and health centre", lat: 14.7285, lng: 120.9824, household_count: 176, risk_note: "Walk-in disputes escalate outside the hall" },
  { purok_no: 8, name: "Purok 8 - Amparo Elementary Back Gate", landmark: "School perimeter fence", lat: 14.7289, lng: 120.9843, household_count: 221, risk_note: "School dismissal crowding, curfew violations" },
  { purok_no: 9, name: "Purok 9 - Sitio Maligaya", landmark: "Chapel and covered basketball half-court", lat: 14.7313, lng: 120.9852, household_count: 143, risk_note: "Far from patrol base, slow response time" },
  { purok_no: 10, name: "Purok 10 - Kalayaan Extension", landmark: "Water tank and pumping station", lat: 14.7248, lng: 120.9822, household_count: 167, risk_note: "Vacant lots used as shortcut at night" },
  { purok_no: 11, name: "Purok 11 - Bagong Silang Boundary", landmark: "Boundary marker along the service road", lat: 14.7325, lng: 120.9811, household_count: 198, risk_note: "Boundary disputes with neighbouring barangay" },
  { purok_no: 12, name: "Purok 12 - Amparo Terminal Annex", landmark: "Tricycle terminal annex and vulcanising shop", lat: 14.7261, lng: 120.9869, household_count: 121, risk_note: "Late-night drinking near the terminal annex" }
];

// Relative share of incidents per purok - hotspots must actually look like
// hotspots so the risk map and CART pages have something to classify.
const PUROK_WEIGHTS = [16, 9, 18, 11, 8, 12, 7, 10, 5, 6, 4, 6];

const USERS = [
  { name: "Barangay Captain", username: "admin", password: "admin123", role: "admin", contact_no: "0917-100-1001" },
  { name: "Crime Analyst", username: "analyst", password: "analyst123", role: "captain", contact_no: "0917-100-1002" },
  { name: "Tanod Patrol A", username: "tanod1", password: "tanod123", role: "tanod", contact_no: "0917-100-1003" },
  { name: "Tanod Patrol B", username: "tanod2", password: "tanod123", role: "tanod", contact_no: "0917-100-1004" },
  { name: "Tanod Patrol C", username: "tanod3", password: "tanod123", role: "tanod", contact_no: "0917-100-1005" },
  { name: "Tanod Patrol D", username: "tanod4", password: "tanod123", role: "tanod", contact_no: "0917-100-1006" },
  { name: "Barangay Secretary", username: "secretary", password: "secretary123", role: "admin", contact_no: "0917-100-1007" },
  { name: "Kagawad - Peace and Order", username: "kagawad", password: "kagawad123", role: "captain", contact_no: "0917-100-1008" }
];

// danger: allowed levels for the type; night: 0-1 bias toward late hours.
const INCIDENT_TYPES = [
  { type: "Theft", weight: 17, danger: [2, 3], night: 0.75, descriptions: ["Motorcycle parts reported missing after a night shift.", "Laundry and small appliances taken from an open terrace.", "Bicycle taken from an unlocked front yard.", "Cellphone snatched from a pedestrian along the main road."] },
  { type: "Suspicious Activity", weight: 16, danger: [1, 2, 3], night: 0.8, descriptions: ["Loitering and repeated lookout behavior near the gate.", "Unknown individuals observed watching the school perimeter.", "Unfamiliar vehicle parked with engine running for an hour.", "Two men repeatedly circling the block on a motorcycle."] },
  { type: "Noise Complaint", weight: 14, danger: [1], night: 0.9, descriptions: ["Loud gathering reported late at night.", "Videoke session past the barangay curfew hour.", "Amplified music from a birthday party beyond 23:00.", "Sustained shouting from a group drinking outdoors."] },
  { type: "Traffic Obstruction", weight: 11, danger: [1, 2], night: 0.35, descriptions: ["Unauthorized parking blocked the lane for 30 minutes.", "Delivery truck double-parked along the narrow road.", "Construction materials left on the roadside.", "Tricycles queued past the designated loading bay."] },
  { type: "Domestic Disturbance", weight: 10, danger: [2, 3], night: 0.7, descriptions: ["Neighbor dispute escalated into a domestic disturbance call.", "Shouting and thrown objects reported inside a residence.", "Family argument required tanod mediation.", "Repeat call-out to the same household within a week."] },
  { type: "Physical Injury", weight: 8, danger: [3], night: 0.75, descriptions: ["Altercation outside the barangay hall.", "Fistfight after a drinking session at the court.", "Minor injuries after a dispute over parking space.", "Assault reported near the market rear gate."] },
  { type: "Vandalism", weight: 7, danger: [1, 2], night: 0.85, descriptions: ["Paint damage and broken community signage reported after dusk.", "Graffiti sprayed on the perimeter wall.", "Streetlight cover smashed overnight.", "Barangay bulletin board torn down."] },
  { type: "Curfew Violation", weight: 6, danger: [1, 2], night: 0.95, descriptions: ["Minors found outside past the 22:00 curfew.", "Group of teenagers gathered at the court after midnight.", "Repeat curfew violation by the same group.", "Minors escorted home after curfew sweep."] },
  { type: "Illegal Gambling", weight: 4, danger: [2], night: 0.6, descriptions: ["Card game with bets reported in an alley.", "Cockfight derby betting reported in a vacant lot.", "Small-time numbers game operating near the terminal.", "Dice game broken up by the patrol team."] },
  { type: "Illegal Drugs", weight: 4, danger: [3], night: 0.85, descriptions: ["Suspected hand-to-hand transaction reported by a resident.", "Paraphernalia found in an abandoned structure.", "Tip received about a recurring drop-off point.", "Suspected user causing a disturbance in the alley."] },
  { type: "Robbery", weight: 2, danger: [3], night: 0.8, descriptions: ["Sari-sari store forced open and cash taken.", "Armed hold-up reported along the service road.", "Home broken into while the family was away.", "Store display case pried open before dawn."] },
  { type: "Property Damage", weight: 1, danger: [1, 2], night: 0.4, descriptions: ["Fence damaged by a reversing vehicle.", "Water pipe broken during an argument.", "Parked tricycle sideswiped and left unattended.", "Gate dented after a dispute between neighbours."] }
];

const REPORTER_SOURCES = [
  { label: "Resident Call-In", weight: 30, isUser: false },
  { label: "Walk-In Complainant", weight: 14, isUser: false },
  { label: "Barangay Hotline", weight: 10, isUser: false },
  { label: "Anonymous Text Report", weight: 6, isUser: false },
  { label: "Tanod Patrol", weight: 40, isUser: true }
];

const STATUS_BY_AGE = {
  // Older records are mostly closed; recent ones are still being worked.
  old: [
    { value: "Resolved", weight: 62 },
    { value: "Patrolled", weight: 24 },
    { value: "Referred to PNP", weight: 9 },
    { value: "Under Review", weight: 5 }
  ],
  recent: [
    { value: "Under Review", weight: 46 },
    { value: "Patrolled", weight: 31 },
    { value: "Resolved", weight: 16 },
    { value: "Referred to PNP", weight: 7 }
  ]
};

const ACTION_BY_DANGER = {
  3: ["Priority patrol and close monitoring", "Priority patrol and incident validation", "Coordinate with PNP Amparo sub-station"],
  2: ["Scheduled patrol and resident reminder", "Scheduled patrol and warning notice", "Increased awareness and scheduled patrol"],
  1: ["Normal monitoring and awareness round", "Afternoon patrol monitoring", "Logged for trend monitoring"]
};

const SETTINGS = [
  { key: "centerLat", value: String(CENTER.lat), type: "number", description: "Map centre latitude for Barangay 179, Amparo" },
  { key: "centerLng", value: String(CENTER.lng), type: "number", description: "Map centre longitude for Barangay 179, Amparo" },
  { key: "highRiskThreshold", value: "3", type: "number", description: "Danger level treated as high risk" },
  { key: "moderateThreshold", value: "2", type: "number", description: "Danger level treated as moderate risk" },
  { key: "patrolWindow", value: "19:00 - 23:00", type: "string", description: "Default priority patrol window" },
  { key: "barangayName", value: "Barangay 179, Amparo, Caloocan City", type: "string", description: "Display name used in report headers" },
  { key: "mapZoom", value: "16", type: "number", description: "Default risk-map zoom level" },
  { key: "hotspotMinIncidents", value: "8", type: "number", description: "Monthly incident count before a purok is flagged a hotspot" },
  { key: "curfewStart", value: "22:00", type: "string", description: "Barangay curfew start time for minors" },
  { key: "enableEmailAlerts", value: "0", type: "boolean", description: "Prototype flag for high-risk email alerts" }
];

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
function monthKeys(endMonth, count) {
  const [endYear, endMonthNo] = endMonth.split("-").map(Number);
  const keys = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(endYear, endMonthNo - 1 - offset, 1);
    keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function daysInMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

// Seasonal multiplier: December holidays and the May fiesta season run hot,
// the rainy August-September lull runs cool.
function seasonalWeight(monthKey) {
  const monthNo = Number(monthKey.split("-")[1]);
  const byMonth = { 1: 1.05, 2: 0.92, 3: 1.0, 4: 1.08, 5: 1.18, 6: 1.02, 7: 0.98, 8: 0.85, 9: 0.88, 10: 1.0, 11: 1.1, 12: 1.3 };
  return byMonth[monthNo] || 1;
}

function randomTime(nightBias) {
  // nightBias -> probability the incident lands in the 18:00-03:00 window.
  let hour;
  if (rand() < nightBias) {
    hour = [18, 19, 20, 21, 22, 23, 0, 1, 2][randInt(0, 8)];
  } else {
    hour = randInt(6, 17);
  }
  const minute = randInt(0, 59);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------
function buildIncidents(users, purokRows, { incidentCount, months, endMonth }) {
  const keys = monthKeys(endMonth, months);
  const tanods = users.filter(user => user.role === "tanod");

  // Today's date bounds the final month so the dataset never contains
  // "future" incidents relative to the demo date.
  const [endYear, endMonthNo] = endMonth.split("-").map(Number);
  const today = new Date();
  const finalMonthCap =
    today.getFullYear() === endYear && today.getMonth() + 1 === endMonthNo
      ? today.getDate()
      : daysInMonth(endMonth);

  // Distribute the target count across months by seasonal weight, with a mild
  // upward trend so the 24-month view shows growth in reporting volume.
  const weights = keys.map((key, index) => seasonalWeight(key) * (0.85 + (index / keys.length) * 0.4));
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  const perMonth = weights.map(weight => Math.max(1, Math.round((weight / weightSum) * incidentCount)));

  const purokPool = purokRows.flatMap((purok, index) =>
    Array.from({ length: PUROK_WEIGHTS[index] || 5 }, () => purok)
  );

  const rows = [];
  keys.forEach((monthKey, monthIndex) => {
    const lastDay = monthKey === endMonth ? finalMonthCap : daysInMonth(monthKey);
    const isRecent = monthIndex >= keys.length - 3;

    for (let n = 0; n < perMonth[monthIndex]; n += 1) {
      const typeSpec = pickWeighted(INCIDENT_TYPES);
      const purok = pick(purokPool);
      const day = randInt(1, lastDay);
      const dangerLevel = pick(typeSpec.danger);

      const source = pickWeighted(REPORTER_SOURCES);
      let reportedBy = source.label;
      let reporterId = null;
      if (source.isUser && tanods.length) {
        const tanod = pick(tanods);
        reportedBy = tanod.name;
        reporterId = tanod.id;
      }

      const status = pickWeighted(
        (isRecent ? STATUS_BY_AGE.recent : STATUS_BY_AGE.old).map(entry => ({ ...entry, value: entry.value }))
      ).value;

      rows.push([
        typeSpec.type,
        `${monthKey}-${pad(day)}`,
        randomTime(typeSpec.night),
        purok.id,
        purok.name,
        pick(typeSpec.descriptions),
        reportedBy,
        reporterId,
        status,
        dangerLevel,
        round7(Number(purok.lat) + jitter(160)),
        round7(Number(purok.lng) + jitter(160)),
        pick(ACTION_BY_DANGER[dangerLevel])
      ]);
    }
  });

  rows.sort((a, b) => (a[1] === b[1] ? a[2].localeCompare(b[2]) : a[1].localeCompare(b[1])));
  return rows;
}

function buildPatrols(users, purokRows, incidentRows, { months, endMonth }) {
  const keys = monthKeys(endMonth, months).slice(-6); // last 6 months of schedules
  const tanods = users.filter(user => user.role === "tanod");
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // Priority follows where the incidents actually landed.
  const countsByPurok = incidentRows.reduce((acc, row) => {
    acc[row[3]] = (acc[row[3]] || 0) + 1;
    return acc;
  }, {});
  const maxCount = Math.max(...Object.values(countsByPurok), 1);

  const shifts = [
    ["18:00:00", "22:00:00"],
    ["19:00:00", "23:00:00"],
    ["22:00:00", "02:00:00"],
    ["06:00:00", "10:00:00"]
  ];

  const rows = [];
  keys.forEach(monthKey => {
    const lastDay = daysInMonth(monthKey);
    for (let day = 1; day <= lastDay; day += 2) {
      const patrolDate = `${monthKey}-${pad(day)}`;
      const teamsToday = randInt(2, 3);
      const usedPuroks = new Set();

      for (let t = 0; t < teamsToday; t += 1) {
        const purok = pick(purokRows);
        if (usedPuroks.has(purok.id)) continue;
        usedPuroks.add(purok.id);

        const share = (countsByPurok[purok.id] || 0) / maxCount;
        const priority = share > 0.66 ? "High" : share > 0.33 ? "Moderate" : "Low";
        const [start, end] = pick(shifts);
        const tanod = tanods.length ? pick(tanods) : null;

        let status;
        if (patrolDate > todayKey) {
          status = "Scheduled";
        } else if (patrolDate === todayKey) {
          status = pick(["Ongoing", "Scheduled", "Completed"]);
        } else {
          status = pickWeighted([
            { value: "Completed", weight: 88 },
            { value: "Missed", weight: 12 }
          ]).value;
        }

        rows.push([
          patrolDate,
          start,
          end,
          purok.id,
          tanod ? tanod.id : null,
          tanod ? tanod.name.replace("Tanod Patrol", "Team") : `Team ${t + 1}`,
          priority,
          status,
          status === "Completed" ? randInt(0, 3) : 0,
          priority === "High" ? "Hotspot sweep based on recurring reports" : "Routine visibility round"
        ]);
      }
    }
  });

  return rows;
}

function buildAuditLog(users, incidentCount) {
  const admins = users.filter(user => user.role !== "tanod");
  const rows = [];
  const today = new Date();

  // Record creation entries for a slice of recent incidents, plus logins.
  for (let i = 0; i < 120; i += 1) {
    const actor = pick(users);
    const daysAgo = randInt(0, 90);
    const stamp = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo, randInt(7, 22), randInt(0, 59), randInt(0, 59));
    const createdAt = `${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())} ${pad(stamp.getHours())}:${pad(stamp.getMinutes())}:${pad(stamp.getSeconds())}`;

    const action = pickWeighted([
      { value: "CREATE", weight: 34 },
      { value: "LOGIN", weight: 28 },
      { value: "UPDATE", weight: 20 },
      { value: "DELETE", weight: 6 },
      { value: "EXPORT", weight: 8 },
      { value: "LOGOUT", weight: 4 }
    ]).value;

    let entityType = "incident";
    let entityId = String(randInt(1, Math.max(1, incidentCount)));
    let details = { note: "Seeded audit entry" };

    if (action === "LOGIN" || action === "LOGOUT") {
      entityType = "session";
      entityId = null;
      details = { ip: `192.168.1.${randInt(2, 254)}`, agent: "Prototype browser" };
    } else if (action === "EXPORT") {
      entityType = "report";
      entityId = null;
      details = { format: pick(["PDF", "CSV", "Print"]), scope: "Monthly incident summary" };
    } else if (action === "UPDATE") {
      details = { changed: pick([["status"], ["danger_level"], ["description"], ["status", "recommended_action"]]) };
    }

    const actorForAction = action === "DELETE" && admins.length ? pick(admins) : actor;

    rows.push([
      actorForAction.id,
      actorForAction.username,
      action,
      entityType,
      entityId,
      JSON.stringify(details),
      createdAt
    ]);
  }

  rows.sort((a, b) => a[6].localeCompare(b[6]));
  return rows;
}

// ---------------------------------------------------------------------------
// Insert helpers
// ---------------------------------------------------------------------------
async function insertChunked(connection, sql, rows, chunkSize = 250) {
  for (let start = 0; start < rows.length; start += chunkSize) {
    await connection.query(sql, [rows.slice(start, start + chunkSize)]);
  }
}

async function main() {
  const connection = await mysql.createConnection({ ...config.db, multipleStatements: true, dateStrings: true });
  console.log(`Seeding ${config.db.database} on ${config.db.host}:${config.db.port}`);

  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of ["audit_log", "patrols", "incidents", "settings", "users", "puroks"]) {
    await connection.query(`TRUNCATE TABLE \`${table}\``);
  }
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  console.log("Cleared existing rows");

  // puroks
  await insertChunked(
    connection,
    "INSERT INTO puroks (purok_no, name, landmark, lat, lng, household_count, risk_note) VALUES ?",
    PUROKS.map(p => [p.purok_no, p.name, p.landmark, p.lat, p.lng, p.household_count, p.risk_note])
  );
  const [purokRows] = await connection.query("SELECT id, purok_no, name, lat, lng FROM puroks ORDER BY purok_no");
  console.log(`  puroks      ${purokRows.length}`);

  // users
  const userRows = USERS.map(user => [
    user.name,
    user.username,
    bcrypt.hashSync(user.password, 10),
    user.role,
    user.contact_no,
    1
  ]);
  await insertChunked(
    connection,
    "INSERT INTO users (name, username, password_hash, role, contact_no, is_active) VALUES ?",
    userRows
  );
  const [users] = await connection.query("SELECT id, name, username, role FROM users ORDER BY id");
  console.log(`  users       ${users.length}`);

  // settings
  await insertChunked(
    connection,
    "INSERT INTO settings (setting_key, setting_value, value_type, description) VALUES ?",
    SETTINGS.map(s => [s.key, s.value, s.type, s.description])
  );
  console.log(`  settings    ${SETTINGS.length}`);

  // incidents
  const incidentRows = buildIncidents(users, purokRows, config.seed);
  await insertChunked(
    connection,
    `INSERT INTO incidents
       (incident_type, occurred_on, occurred_at, purok_id, location_label, description,
        reported_by, reported_by_user_id, status, danger_level, lat, lng, recommended_action)
     VALUES ?`,
    incidentRows
  );
  console.log(`  incidents   ${incidentRows.length}`);

  // patrols
  const patrolRows = buildPatrols(users, purokRows, incidentRows, config.seed);
  await insertChunked(
    connection,
    `INSERT INTO patrols
       (patrol_date, shift_start, shift_end, purok_id, assigned_user_id, team_label,
        priority, status, incidents_logged, notes)
     VALUES ?`,
    patrolRows
  );
  console.log(`  patrols     ${patrolRows.length}`);

  // audit log
  const auditRows = buildAuditLog(users, incidentRows.length);
  await insertChunked(
    connection,
    "INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, details, created_at) VALUES ?",
    auditRows
  );
  console.log(`  audit_log   ${auditRows.length}`);

  const [[range]] = await connection.query(
    "SELECT MIN(occurred_on) AS first_date, MAX(occurred_on) AS last_date, COUNT(DISTINCT DATE_FORMAT(occurred_on, '%Y-%m')) AS months FROM incidents"
  );
  console.log(`\nIncident range: ${range.first_date} to ${range.last_date} (${range.months} months)`);
  console.log("Demo logins: admin/admin123, analyst/analyst123, tanod1/tanod123");

  await connection.end();
}

main().catch(error => {
  console.error("\nSeed failed:", error.message);
  process.exit(1);
});
