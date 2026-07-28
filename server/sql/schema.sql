-- Barangay 179, Amparo, Caloocan City - crime record management schema
-- Target: MySQL 8.0 on 127.0.0.1:3307
-- Applied by `npm run db:setup` (the database itself is created by that script).

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS patrols;
DROP TABLE IF EXISTS incidents;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS puroks;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- puroks: normalized locations so hotspots aggregate cleanly instead of
-- relying on the free-text location string the prototype used.
-- ---------------------------------------------------------------------------
CREATE TABLE puroks (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  purok_no      TINYINT UNSIGNED NOT NULL,
  name          VARCHAR(120) NOT NULL,
  landmark      VARCHAR(160) DEFAULT NULL,
  lat           DECIMAL(10, 7) NOT NULL,
  lng           DECIMAL(10, 7) NOT NULL,
  household_count SMALLINT UNSIGNED DEFAULT NULL,
  risk_note     VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_puroks_name (name),
  KEY idx_puroks_no (purok_no)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- users: roles match the front-end (admin / captain / tanod).
-- password_hash is bcrypt; the seed keeps the prototype's demo passwords.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(120) NOT NULL,
  username      VARCHAR(60) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin', 'captain', 'tanod') NOT NULL DEFAULT 'tanod',
  contact_no    VARCHAR(24) DEFAULT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_role (role)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- incidents: the core fact table. danger_level 1-3 mirrors the dangerInfo()
-- thresholds in menu-pages/menu-page.js.
-- ---------------------------------------------------------------------------
CREATE TABLE incidents (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  incident_type      VARCHAR(80) NOT NULL,
  occurred_on        DATE NOT NULL,
  occurred_at        TIME NOT NULL,
  purok_id           INT UNSIGNED DEFAULT NULL,
  location_label     VARCHAR(180) NOT NULL,
  description        TEXT,
  reported_by        VARCHAR(120) NOT NULL,
  reported_by_user_id INT UNSIGNED DEFAULT NULL,
  status             ENUM('Under Review', 'Patrolled', 'Resolved', 'Referred to PNP') NOT NULL DEFAULT 'Under Review',
  danger_level       TINYINT UNSIGNED NOT NULL DEFAULT 1,
  lat                DECIMAL(10, 7) NOT NULL,
  lng                DECIMAL(10, 7) NOT NULL,
  recommended_action VARCHAR(180) DEFAULT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_incidents_occurred_on (occurred_on),
  KEY idx_incidents_type (incident_type),
  KEY idx_incidents_status (status),
  KEY idx_incidents_danger (danger_level),
  KEY idx_incidents_month_danger (occurred_on, danger_level),
  KEY idx_incidents_purok (purok_id),
  CONSTRAINT fk_incidents_purok FOREIGN KEY (purok_id) REFERENCES puroks (id) ON DELETE SET NULL,
  CONSTRAINT fk_incidents_reporter FOREIGN KEY (reported_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_incidents_danger CHECK (danger_level BETWEEN 1 AND 3)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- patrols: schedules/assignments backing the Patrol Decision Support page.
-- ---------------------------------------------------------------------------
CREATE TABLE patrols (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  patrol_date    DATE NOT NULL,
  shift_start    TIME NOT NULL,
  shift_end      TIME NOT NULL,
  purok_id       INT UNSIGNED NOT NULL,
  assigned_user_id INT UNSIGNED DEFAULT NULL,
  team_label     VARCHAR(80) NOT NULL,
  priority       ENUM('Low', 'Moderate', 'High') NOT NULL DEFAULT 'Moderate',
  status         ENUM('Scheduled', 'Ongoing', 'Completed', 'Missed') NOT NULL DEFAULT 'Scheduled',
  incidents_logged SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  notes          VARCHAR(255) DEFAULT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_patrols_date (patrol_date),
  KEY idx_patrols_purok (purok_id),
  KEY idx_patrols_status (status),
  CONSTRAINT fk_patrols_purok FOREIGN KEY (purok_id) REFERENCES puroks (id) ON DELETE CASCADE,
  CONSTRAINT fk_patrols_user FOREIGN KEY (assigned_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- audit_log: who touched which record, for the administrator module.
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED DEFAULT NULL,
  username    VARCHAR(60) DEFAULT NULL,
  action      ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT') NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id   VARCHAR(40) DEFAULT NULL,
  details     JSON DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_created (created_at),
  KEY idx_audit_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- settings: key/value so the front-end can keep its flat settings object.
-- ---------------------------------------------------------------------------
CREATE TABLE settings (
  setting_key   VARCHAR(60) NOT NULL,
  setting_value VARCHAR(255) NOT NULL,
  value_type    ENUM('string', 'number', 'boolean') NOT NULL DEFAULT 'string',
  description   VARCHAR(255) DEFAULT NULL,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Convenience view: incidents joined to their purok, shaped like the JSON the
-- front-end already consumes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_incident_details AS
SELECT
  i.id,
  i.incident_type          AS type,
  i.occurred_on            AS date,
  i.occurred_at            AS time,
  i.location_label         AS location,
  i.description,
  i.reported_by            AS reportedBy,
  i.status,
  i.danger_level           AS danger,
  i.lat,
  i.lng,
  i.recommended_action     AS action,
  p.id                     AS purokId,
  p.purok_no               AS purokNo,
  p.name                   AS purokName,
  DATE_FORMAT(i.occurred_on, '%Y-%m') AS month
FROM incidents i
LEFT JOIN puroks p ON p.id = i.purok_id;
