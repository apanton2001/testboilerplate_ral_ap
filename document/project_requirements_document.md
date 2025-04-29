# Project Requirements Document

## 1. Project Overview

This project is a web-based platform that helps importers generate accurate customs documentation in minutes instead of days. Users work in an Excel-like grid to enter invoice line‐items. The system automatically looks up and assigns Harmonized System (HS) tariff codes using Jamaica Customs data, flags uncertain entries for manual review, and produces fully populated ASYCUDA-compliant XML and PDF forms. Finally, users can submit paperwork directly to customs via an API or SFTP channel.

We’re building this tool to eliminate expensive brokers, reduce classification errors, and cut shipment delays. Our goals for the first release are:\
• 50% reduction in customs prep time\
• Savings up to $500 per shipment in broker fees\
• 99.8% accuracy in HS code assignment\
• Secure handling of sensitive trade data with five-year retention

## 2. In-Scope vs. Out-of-Scope

### In-Scope (MVP Features)

*   Excel-style grid for manual data entry, CSV/XLSX import, inline editing
*   Automated HS code classification via ContextGem API + biannual Jamaica tariff updates
*   Flagging workflow for low-confidence or conflicting classifications
*   Manual review interface for tariff reviewers (approve/adjust codes, add notes)
*   ASYCUDA-compliant document generation (XML via xmlbuilder2, printable PDF via Puppeteer)
*   Direct submission to customs: API endpoint or secure EDI/SFTP upload
*   Role-based access control (Data Entry Clerk, Tariff Reviewer, Admin)
*   In-app and email notifications (Resend) for key events (classification done, review needed, submission status)
*   Record-keeping with searchable history, five-year data retention, audit logs
*   Basic reporting on import volumes, classification accuracy, cost savings
*   Integrations with QuickBooks (financial data sync) and freight-forwarder portals (shipment status)
*   User authentication: email/password with rules, optional SSO (OAuth/SAML), multi-factor authentication, session timeouts
*   CI/CD pipeline (GitHub Actions) with unit tests (Jest) and end-to-end tests (Playwright)
*   Hosting on Vercel

### Out-of-Scope (Phase 2+)

*   Support for tariff data beyond Jamaica (other countries)
*   SMS or Slack notifications (email + in-app only for MVP)
*   Advanced analytics or AI-driven insights beyond HS classification
*   Mobile-native app (web only)
*   Custom branding/theme editor for end customers
*   Bulk API for high-volume automated imports

## 3. User Flow

A new or returning user lands on the secure login page. They sign in with email/password (or SSO), optionally complete a multi-factor prompt, and arrive at a dashboard showing recent shipments and their statuses. From there, a Data Entry Clerk clicks “New Entry,” drags in a CSV or XLSX file, maps columns to the grid, and sees line-items auto-populated. As they edit any details, the system auto-saves and tags changes to their account.

Once the grid is complete, the user clicks “Classify,” triggering the HS-code engine. Straightforward items get codes instantly; unclear ones get flagged. Tariff Reviewers then see a notification and open the same grid in review mode. They confirm or adjust codes and add comments. When all flags are cleared, the user generates ASYCUDA documents (XML + PDF) with one click. Finally, they choose “Submit to Customs,” and the system sends the package via API or SFTP. The submission history updates in real time, and everyone involved receives an in-app and email notification of success or failure.

## 4. Core Features

*   **Excel-Style Data Entry**\
    Familiar grid UI with inline editing, keyboard shortcuts, CSV/XLSX import, auto-save, and audit tags.
*   **Automated HS Code Classification**\
    Uses biannual Jamaica Customs tariff data plus ContextGem’s REST API for instant code assignment. Caches results and falls back gracefully on API errors.
*   **Flagging & Review Workflow**\
    Low-confidence items auto-flagged. Tariff Reviewers see a dedicated queue, compare AI suggestions with tariff docs, adjust codes, and add review notes.
*   **ASYCUDA Document Generation**\
    Compiles data into XML (via xmlbuilder2) and renders PDF (via Puppeteer) in ASYCUDA format. Offers download or direct submission package.
*   **Direct Submission**\
    Streams XML to customs via ASYCUDA API or deploys files over secure EDI/SFTP. Monitors status and retries on failures.
*   **Role-Based Access Control**\
    Three roles (Data Entry Clerk, Tariff Reviewer, Admin) with clearly defined permissions around creating, editing, reviewing, exporting, and system configuration.
*   **Record-Keeping & Reporting**\
    Searchable history of all entries, five-year retention, audit logs. Custom exportable reports on volume, accuracy, and cost savings.
*   **Integrations**\
    • QuickBooks API for financial reconciliation\
    • Freight-forwarder API for shipment status\
    • Stripe for subscription billing\
    • Resend for email notifications
*   **Notifications**\
    In-app alerts and emails for classification completion, review requests, submission success/failure. Preferences managed per user.
*   **Security & Compliance**\
    AES-256 encryption at rest, TLS in transit, GDPR/local-law compliance, daily backups, geographic data-residency control, session timeouts and MFA.

## 5. Tech Stack & Tools

*   **Frontend**\
    • React (UI library)\
    • Next.js (server-rendered React framework)\
    • AG Grid (editable spreadsheet component)
*   **Backend**\
    • Node.js & Express (JavaScript runtime + web server)\
    • xmlbuilder2 (builds XML documents)\
    • Puppeteer (headless Chrome for PDF rendering)\
    • PostgreSQL (relational database)\
    • Redis (in-memory cache)
*   **Integrations & APIs**\
    • ContextGem REST API (HS code classification)\
    • ASYCUDA API / EDI-SFTP (customs submission)\
    • QuickBooks API (financial data)\
    • Freight-forwarder API (shipment data)\
    • Stripe (payments)\
    • Resend (email notifications)
*   **Authentication & Security**\
    • NextAuth.js (authentication) supporting OAuth/SAML & MFA\
    • AES-256 encryption, TLS certificates
*   **DevOps & Testing**\
    • GitHub Actions (CI/CD)\
    • Jest (unit testing)\
    • Playwright (end-to-end testing)\
    • Vercel (hosting & serverless functions)
*   **Developer Tools (AI-Powered Coding)**\
    • Cursor (AI-driven IDE)\
    • Gemini 2.5 Pro & Claude 3.7 Sonnet (complex problem-solving models)\
    • Cline (collaborative AI partner)

## 6. Non-Functional Requirements

*   **Performance**\
    • Grid load time < 2 seconds for up to 1,000 rows\
    • HS classification calls under 200 ms (cached)\
    • Document generation < 5 seconds
*   **Scalability**\
    • Support 100 concurrent users\
    • Horizontal scaling in Vercel / serverless functions
*   **Security & Compliance**\
    • AES-256 at rest / TLS in transit\
    • GDPR + local data protection\
    • 5-year retention, daily backups, audit logs\
    • Role-based access, session expiration, MFA
*   **Availability**\
    • 99.9% uptime SLAs\
    • Automatic retry & fallback for external API failures
*   **Usability**\
    • Responsive design for tablets & desktops\
    • Onboarding tutorial for first-time users\
    • Inline help tips and error messages

## 7. Constraints & Assumptions

*   **ContextGem API** must remain available and within rate limits.
*   Biannual tariff data updates handled by Admin; assumes Jamaica Customs publishes on schedule.
*   ASYCUDA endpoint credentials and SFTP access provided by local customs authority.
*   Users have modern browsers (latest Chrome, Firefox, Edge).
*   QuickBooks & freight-forwarder integrations require valid API keys.
*   All data stored in Vercel region that meets data-residency rules.

## 8. Known Issues & Potential Pitfalls

*   **API Rate Limits** (ContextGem, QuickBooks): implement local caching, retry logic, and back-off.
*   **Large File Imports**: CSV/XLSX up to 10,000 rows may strain browser memory; chunk uploads and server-side processing recommended.
*   **SFTP Connectivity**: corporate firewalls may block ports; build manual upload fallback.
*   **Data Mapping Errors**: CSV column mismatches; include header-mapping UI with validation and user feedback.
*   **Tariff Data Drift**: if tariff codes change mid-cycle, flag inconsistencies and force reclassification.

With this document, the AI model has a comprehensive, unambiguous foundation to generate detailed technical specifications, user interface guidelines, backend structures, and test plans without missing context.
