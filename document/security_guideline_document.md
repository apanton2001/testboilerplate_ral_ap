# Security Guidelines Document

This document outlines the security requirements and best practices for the Automated Customs Documentation Platform. It maps the core security principles to the project’s architecture, tech stack, and operational needs.

---

## 1. Security by Design

- Integrate security reviews at every sprint and pull request.
- Classify components by risk (frontend, backend, integrations) and apply appropriate controls.
- Threat model the end-to-end flow: from CSV/XLSX import to ASYCUDA submission.

## 2. Authentication & Access Control

- **NextAuth.js** with email/password, OAuth (Google, LinkedIn) and SAML SSO.
- Enforce strong password policy: minimum 12 characters, mixed case, digits, symbols.
- Mandatory Multi‐Factor Authentication (MFA) via TOTP or SMS for Admin and Reviewer roles.
- Session management:
  - Secure, HttpOnly, SameSite=Strict cookies.
  - Idle timeout: 15 minutes; absolute session lifespan: 8 hours.
  - CSRF protection on all state‐changing endpoints (synchronizer token pattern via NextAuth).
- **Role-Based Access Control (RBAC)**:
  - Data Entry Clerks: create/edit own shipments only.
  - Tariff Reviewers: approve/modify flagged items.
  - Admins: full access + user management, system configuration.
  - Enforce server‐side permission checks on every API route.

## 3. Input Handling & Processing

- Validate and sanitize all user inputs (grid cells, file uploads) on the server:
  - Reject unexpected file types, enforce maximum file size (e.g., 10 MB).
  - Strict field validation (dates, numeric values, text lengths).
- Use parameterized queries (pg or ORM) to prevent SQL injection.
- Escape or encode dynamic content before rendering in React to prevent XSS.
- Validate redirect targets against a whitelist for any in-app navigation.
- Secure file uploads for manual XML/PDF packages:
  - Store outside webroot with randomized filenames.
  - Scan for malware via third-party service or antivirus gateway.

## 4. Data Protection & Privacy

- **Encryption**:
  - TLS 1.2+ (recommend TLS 1.3) for all traffic (Vercel automatic HTTPS).
  - AES-256 at rest for database backups and sensitive fields (e.g., OAuth tokens).
- **Secrets Management**:
  - Store API keys, database credentials, SFTP credentials in Vercel environment variables or a vault.
  - Rotate secrets at least every 90 days or upon personnel change.
- **PII Handling**:
  - Mask or omit customer-specific data in logs and error messages.
  - Comply with GDPR: provide data export/deletion upon request.
- **Data Retention & Backup**:
  - Retain customs records, audit logs, and backups for a minimum of 5 years.
  - Enforce geographic data residency per regional regulations.
  - Daily backups with tested restore procedures.

## 5. API & Service Security

- Enforce HTTPS on all Next.js API routes and external integrations.
- Configure CORS to allow only trusted origins (e.g., your corporate domains).
- Implement rate limiting and throttling at the API gateway using Redis:
  - e.g., max 100 classification calls/minute per user/IP.
- Secure ASYCUDA submission endpoints:
  - Validate the XML schema before submission.
  - Use mutually authenticated TLS or SSH keys for SFTP.

## 6. Web Application Security Hygiene

- **Security Headers**:
  - Content-Security-Policy (CSP) restricting scripts/styles to your domain.
  - Strict-Transport-Security: `max-age=31536000; includeSubDomains; preload`.
  - X-Content-Type-Options: `nosniff`.
  - X-Frame-Options: `DENY`.
  - Referrer-Policy: `strict-origin-when-cross-origin`.
- **Cookie Security**:
  - `HttpOnly`, `Secure`, `SameSite=Strict` on session cookies.
- **CSRF**:
  - Built-in NextAuth CSRF tokens on all form submissions.
- **Clickjacking & SRI**:
  - Use Subresource Integrity for any CDN-hosted scripts.

## 7. Infrastructure & Configuration Management

- **Hosting** on Vercel:
  - Disable debug mode and verbose error stacks in production.
  - Restrict environment variable visibility to necessary scopes.
- **Network Hardening**:
  - Minimize exposed ports; use serverless functions for business logic.
  - Use Vercel’s firewall and IP allowlisting for admin panels.
- **Software Patching**:
  - Subscribe to Dependabot or Renovate for automatic dependency updates.
  - Apply security patches to Node.js, Next.js, AG Grid, and other frameworks promptly.
- **File Permissions**:
  - Read-only for static assets; use managed storage for uploads.

## 8. Dependency Management

- Maintain `package-lock.json` to ensure deterministic builds.
- Vet third-party libraries for security reputations and active maintenance.
- Run SCA (Software Composition Analysis) tool in CI to detect vulnerable transitive dependencies.
- Remove unused packages to reduce the attack surface.

---

By following these guidelines, the Automated Customs Documentation Platform will meet enterprise-grade security standards, protect sensitive trade data, and ensure compliance with regulatory requirements. Continuous monitoring, periodic audits, and incident response planning are assumed to be part of ongoing operations.