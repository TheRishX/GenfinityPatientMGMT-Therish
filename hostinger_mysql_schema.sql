-- Genfinity Portal production persistence schema.
-- The application initializes this table automatically; this file is retained
-- for disaster recovery and manual verification in phpMyAdmin.
CREATE TABLE IF NOT EXISTS app_state (
  state_key VARCHAR(64) NOT NULL PRIMARY KEY,
  payload LONGTEXT NOT NULL,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
