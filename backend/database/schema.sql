-- Database Schema for Automated Customs Documentation Platform

-- Users and Roles
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  email          VARCHAR(255) UNIQUE NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  full_name      VARCHAR(255),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(50) UNIQUE NOT NULL  -- e.g., Clerk, Reviewer, Admin
);

CREATE TABLE user_roles (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Invoices and Line Items
DROP TABLE IF EXISTS invoice_lines CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

CREATE TABLE invoices (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id),
  supplier        VARCHAR(255),
  invoice_date    DATE,
  total_amount    NUMERIC(12,2),
  status          VARCHAR(50) DEFAULT 'Draft',  -- Draft, Submitted, Approved
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_lines (
  id                  SERIAL PRIMARY KEY,
  invoice_id          INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  description         TEXT,
  quantity            INTEGER,
  unit_price          NUMERIC(12,2),
  hs_code             VARCHAR(10),
  classification_method VARCHAR(50), -- Auto, Manual
  flagged             BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Tariff Classification History
DROP TABLE IF EXISTS classification_history CASCADE;

CREATE TABLE classification_history (
  id                SERIAL PRIMARY KEY,
  invoice_line_id   INTEGER REFERENCES invoice_lines(id) ON DELETE CASCADE,
  previous_hs_code  VARCHAR(10),
  new_hs_code       VARCHAR(10),
  changed_by        INTEGER REFERENCES users(id),
  changed_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions
DROP TABLE IF EXISTS submissions CASCADE;

CREATE TABLE submissions (
  id                SERIAL PRIMARY KEY,
  invoice_id        INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  method            VARCHAR(20), -- API, EDI-SFTP
  status            VARCHAR(50), -- Pending, Success, Failed
  response_message  TEXT,
  submitted_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id),
  type        VARCHAR(50), -- SubmissionStatus, ClassificationFlag
  message     TEXT,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions/Billing
DROP TABLE IF EXISTS subscriptions CASCADE;

CREATE TABLE subscriptions (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER REFERENCES users(id),
  stripe_customer_id VARCHAR(255),
  stripe_sub_id      VARCHAR(255),
  status            VARCHAR(50), -- Active, PastDue, Canceled
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
CREATE INDEX idx_invoice_lines_hs_code ON invoice_lines(hs_code);
CREATE INDEX idx_invoice_lines_flagged ON invoice_lines(flagged);
CREATE INDEX idx_classification_history_line_id ON classification_history(invoice_line_id);
CREATE INDEX idx_submissions_invoice_id ON submissions(invoice_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);


-- Insert default roles
INSERT INTO roles (name) VALUES ('Admin'), ('Reviewer'), ('Clerk');