# Backend Structure Document

This document provides a clear overview of the backend architecture, database design, hosting, infrastructure, security, and maintenance strategies for the customs documentation platform.

## 1. Backend Architecture

### Overview
We follow a modular, layered architecture using Node.js and Express. Each layer has a clear responsibility:

- **Controllers** handle HTTP requests and responses.
- **Services** contain business logic (e.g., tariff classification, document generation).
- **Repositories (Data Access Layer)** interact with the database.
- **Middleware** enforces authentication, authorization, validation, error handling, and logging.

### Design Patterns and Frameworks
- **MVC-inspired structure** (Controllers → Services → Repositories).  
- **Dependency Injection** for loosely coupled modules.  
- **Repository Pattern** to abstract database operations.  
- **Factory Pattern** for generating XML/PDF documents (`xmlbuilder2`, `Puppeteer`).

### Scalability, Maintainability, Performance
- **Stateless API servers** enable horizontal scaling behind load balancers.  
- **Redis caching** for frequently accessed data (e.g., tariff tables, session store).  
- **CI/CD** with GitHub Actions automates testing and deployment.  
- **Modular codebase** eases feature addition and unit testing.  
- **Asynchronous processing** (e.g., classification jobs, document generation) offloads heavy tasks via message queues if needed.

## 2. Database Management

### Technologies
- **PostgreSQL** (primary relational database)  
- **Redis** (in-memory data store for caching and session management)

### Data Structure & Access
- **Normalized schema** in PostgreSQL for users, invoices, items, classifications, submissions, notifications, billing.  
- **Parameterized queries** or ORM (e.g., Sequelize/TypeORM) to prevent SQL injection.  
- **Redis caches** tariff tables (biannual Jamaica Customs data) and API rate‐limited results (ContextGem).  
- **Backup strategy**: nightly snapshots stored securely, point-in-time recovery enabled.  
- **Retention**: Five-year data retention in compliance with customs regulations.

## 3. Database Schema

Below is a human-readable description followed by SQL for PostgreSQL.

### Human-Readable Schema
- **Users**: Stores user credentials, roles, contact info.  
- **Roles**: Defines available roles (Clerk, Reviewer, Admin).  
- **User_Roles**: Maps users to roles (many-to-many).  
- **Invoices**: Holds invoices submitted by clerks (date, supplier, totals).  
- **Invoice_Lines**: Line items for each invoice (description, quantity, price).  
- **Tariff_Classifications**: HS code assignments for invoice lines (algorithmic, manual flags).  
- **Submissions**: Records each export to ASYCUDA (status, timestamp, method).  
- **Notifications**: Tracks email/in-app alerts per user/event.  
- **Subscriptions**: Stripe billing and subscription status.  

### SQL Schema (PostgreSQL)
```sql
-- Users and Roles
drop table if exists user_roles cascade;
drop table if exists roles cascade;
drop table if exists users cascade;
create table users (
  id             serial primary key,
  email          varchar(255) unique not null,
  password_hash  varchar(255) not null,
  full_name      varchar(255),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create table roles (
  id    serial primary key,
  name  varchar(50) unique not null  -- e.g., Clerk, Reviewer, Admin
);

create table user_roles (
  user_id integer references users(id) on delete cascade,
  role_id integer references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- Invoices and Line Items
drop table if exists invoice_lines cascade;
drop table if exists invoices cascade;
create table invoices (
  id              serial primary key,
  user_id         integer references users(id),
  supplier        varchar(255),
  invoice_date    date,
  total_amount    numeric(12,2),
  status          varchar(50) default 'Draft',  -- Draft, Submitted, Approved
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table invoice_lines (
  id            serial primary key,
  invoice_id    integer references invoices(id) on delete cascade,
  description   text,
  quantity      integer,
  unit_price    numeric(12,2),
  hs_code       varchar(10),
  classification_method varchar(50), -- Auto, Manual
  flagged       boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Tariff Classification History
drop table if exists classification_history cascade;
create table classification_history (
  id                serial primary key,
  invoice_line_id   integer references invoice_lines(id) on delete cascade,
  previous_hs_code  varchar(10),
  new_hs_code       varchar(10),
  changed_by        integer references users(id),
  changed_at        timestamptz default now()
);

-- Submissions
drop table if exists submissions cascade;
create table submissions (
  id                serial primary key,
  invoice_id        integer references invoices(id) on delete cascade,
  method            varchar(20), -- API, EDI-SFTP
  status            varchar(50), -- Pending, Success, Failed
  response_message  text,
  submitted_at      timestamptz default now()
);

-- Notifications
drop table if exists notifications cascade;
create table notifications (
  id          serial primary key,
  user_id     integer references users(id),
  type        varchar(50), -- SubmissionStatus, ClassificationFlag
  message     text,
  read        boolean default false,
  created_at  timestamptz default now()
);

-- Subscriptions/Billing
drop table if exists subscriptions cascade;
create table subscriptions (
  id                serial primary key,
  user_id           integer references users(id),
  stripe_customer_id varchar(255),
  stripe_sub_id      varchar(255),
  status            varchar(50), -- Active, PastDue, Canceled
  started_at        timestamptz,
  ended_at          timestamptz
);
```  

## 4. API Design and Endpoints

We use a **RESTful** approach with JSON over HTTPS. All endpoints are versioned under `/api/v1`.

### Authentication & User Management
- `POST /api/v1/auth/login` – user login (email/password or SSO).  
- `POST /api/v1/auth/logout` – invalidate session/JWT.  
- `POST /api/v1/auth/signup` – admin-created accounts or self-registration.
- `GET /api/v1/users` – list users (admin only).  
- `PATCH /api/v1/users/:id` – update user roles/settings (admin).

### Invoice & Line Item Management
- `GET /api/v1/invoices` – list invoices (with filters).  
- `GET /api/v1/invoices/:id` – retrieve invoice details.  
- `POST /api/v1/invoices` – create new invoice.  
- `PUT /api/v1/invoices/:id` – update invoice metadata.  
- `DELETE /api/v1/invoices/:id` – archive invoice.
- `POST /api/v1/invoices/:id/lines` – add line item.  
- `PATCH /api/v1/invoice_lines/:lineId` – edit line, trigger re-classification if HS code changed.

### Tariff Classification
- `POST /api/v1/classify` – bulk classify invoice lines via ContextGem.  
- `GET /api/v1/classify/:lineId` – get latest classification.  
- `PATCH /api/v1/classify/:lineId` – manual override of HS code (reviewer only).

### Document Generation & Submission
- `GET /api/v1/invoices/:id/document/xml` – generate ASYCUDA-compliant XML.  
- `GET /api/v1/invoices/:id/document/pdf` – generate PDF using Puppeteer.  
- `POST /api/v1/invoices/:id/submit` – submit to customs via:
  • API (ASYCUDA API)  
  • EDI-SFTP (fallback)

### Notifications & Reporting
- `GET /api/v1/notifications` – fetch unread/read alerts.  
- `PATCH /api/v1/notifications/:id/read` – mark notification as read.  
- `GET /api/v1/reports/import-activity` – get activity summary and export CSV.

### Integrations
- `POST /api/v1/integrations/quickbooks/sync` – pull invoice data.  
- `POST /api/v1/integrations/freight/status` – update shipment status.  
- Webhooks:
  • `POST /api/v1/webhooks/stripe` – subscription events.  
  • `POST /api/v1/webhooks/resend` – email delivery events.

## 5. Hosting Solutions

- **Frontend & API**: Deployed on **Vercel** as serverless functions and Edge Runtime.  
- **Database**: Managed on AWS RDS for PostgreSQL with Multi-AZ replication.  
- **Redis**: AWS ElastiCache for Redis in-memory cluster.  
- **CI/CD**: GitHub Actions triggers linting, tests, and deployments to Vercel.

### Benefits
- **High availability** and automatic scaling by Vercel and AWS.  
- **Global edge network** via Vercel for low-latency access.  
- **Pay-as-you-go** models reduce cost at early stages.

## 6. Infrastructure Components

- **Load Balancer**: Handled by Vercel’s edge network.
- **CDN**: Static assets and serverless functions served from Vercel’s CDN.
- **Caching**: Redis for session store and tariff data.  
- **Message Queue (optional)**: RabbitMQ or AWS SQS for asynchronous tasks (classification, document creation).
- **SFTP Gateway**: Secure file transfer for EDI fallback using dedicated SFTP server (e.g., AWS Transfer Family).

## 7. Security Measures

- **Authentication**:
  • Email/password with bcrypt-hashed passwords.  
  • Optional SSO via SAML/OAuth2.  
  • Multi-Factor Authentication (MFA) via email or authenticator apps.
- **Authorization**: Role-based access control enforced in middleware.
- **Data Encryption**:
  • TLS 1.2+ in transit.  
  • AWS KMS–managed encryption at rest for RDS and S3 backups.
- **API Protection**:
  • Rate limiting and IP whitelisting for ASYCUDA and third-party calls.  
  • Helmet and CORS policies in Express.  
  • Parameterized queries to prevent SQL injection.
- **Compliance**: GDPR and local data regulations, data residency in required regions.

## 8. Monitoring and Maintenance

### Monitoring
- **Logs**: Centralized logs (AWS CloudWatch or Logflare) for errors and access logs.  
- **Performance Metrics**: Vercel Analytics and AWS RDS Performance Insights.  
- **Error Tracking**: Sentry for real-time exception alerts.

### Maintenance
- **Database Migrations**: Managed via a tool like Flyway or Sequelize CLI.  
- **Backups**: Automated daily snapshots and transaction logs retained for 30 days.  
- **Dependency Updates**: Quarterly security reviews and updates via GitHub Dependabot.  
- **Tariff Data Refresh**: Semi-annual update of Jamaica Customs tariff tables in Redis and database.

## 9. Conclusion and Overall Backend Summary

The backend is designed to be **modular**, **scalable**, and **secure**, meeting the needs of small-to-mid-sized importers by automating customs documentation, tariff classification, and direct submissions. Key strengths:

- **Clear separation of concerns** (controllers, services, repositories).  
- **Industry-grade security** and data compliance.  
- **Resilient hosting** on Vercel and AWS for high availability.  
- **Seamless integrations** with ContextGem, ASYCUDA, QuickBooks, Stripe, and freight carriers.  
- **Robust monitoring and maintenance** practices ensure reliability and data integrity.

This setup empowers your team to rapidly develop and iterate on features while ensuring your users enjoy fast, reliable, and secure customs processing.