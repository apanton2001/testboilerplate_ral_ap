# Tech Stack Document

This document explains the technology choices for our web-based customs documentation platform in clear, everyday language. It shows how each tool fits into the project, why we picked it, and how it helps deliver a fast, reliable, and user-friendly experience.

## 1. Frontend Technologies
These tools power everything the user sees and interacts with in their browser.

- **React**  
  A popular JavaScript library for building fast, interactive user interfaces. React’s component system lets us break the UI into reusable pieces (like the grid, buttons, and dialogs).

- **Next.js**  
  An extension of React that adds built-in routing, server-side rendering, and static-site generation. This means pages load quickly, and we can pre-render common screens for better performance and SEO.

- **AG Grid**  
  A feature-rich, Excel-style data grid component. It gives us sorting, filtering, inline editing, CSV/XLSX import, keyboard shortcuts, and more—so users feel right at home in a familiar spreadsheet interface.

- **Tailwind CSS**  
  A utility-first styling framework that lets us create a clean, modern look (inspired by Raya and a-leads.co) without writing a lot of custom CSS. It speeds up development and ensures a consistent design.

- **NextAuth.js**  
  A simple authentication library for Next.js that supports email/password logins, social logins (OAuth), SAML, and multi-factor authentication (MFA). It handles secure sessions and makes adding SSO options straightforward.

- **Resend (Email API)**  
  Our choice for sending transactional and notification emails (submission confirmations, review requests). It’s reliable, easy to set up, and scales with usage.

## 2. Backend Technologies
These components handle data processing, business logic, and integrations behind the scenes.

- **Node.js**  
  A JavaScript runtime that lets us write server-side code in the same language as the frontend. We use it for API routes (via Next.js) and standalone services (e.g., file processing).

- **PostgreSQL**  
  A robust, open-source relational database. We store user accounts, invoice records, classification results, audit logs, and configuration data here.

- **Redis**  
  An in-memory data store used for:
  • Caching classification results from the ContextGem API (speeds up repeat lookups)  
  • Session store and rate limiting (protects APIs from overuse)  

- **xmlbuilder2**  
  A lightweight library for programmatically building ASYCUDA-compliant XML documents from our invoice and tariff data.

- **Puppeteer**  
  A headless‐Chrome tool we use to render those XML documents into PDF—so users get print-ready forms with one click.

- **NextAuth.js (API side)**  
  Manages secure authentication flows, session tokens, and role-based access control (data-entry clerk, tariff reviewer, admin).

- **Express (optional)**  
  For any custom API endpoints outside of Next.js routes—though most logic lives in serverless functions.

## 3. Infrastructure and Deployment
How we host, build, test, and deploy the application for reliability and scalability.

- **Vercel**  
  Our hosting platform for Next.js. It provides global CDNs, automatic SSL, zero-config deployments, and serverless function execution.

- **GitHub & GitHub Actions**  
  • **Version Control (GitHub)**: We keep all code in GitHub repos, using feature branches and pull requests for team collaboration and code reviews.  
  • **CI/CD (GitHub Actions)**: Automated workflows run on every commit to:
  – Install dependencies  
  – Run unit tests (Jest)  
  – Run end-to-end tests (Playwright)  
  – Lint and build the app  
  – Deploy to Vercel on successful builds  

- **Database & Backups**  
  • **Managed PostgreSQL** (e.g., AWS RDS or Heroku Postgres) with daily automated backups and point-in-time recovery.  
  • **Data residency controls** ensure all data stays in approved geographic regions.  
  • **Five-year retention policy** for audit purposes, enforced via scheduled scripts.

- **Containerization (Future)**  
  If we outgrow serverless, we’ll containerize services with Docker and orchestrate with Kubernetes for more control over scaling.

## 4. Third-Party Integrations
External services that add essential features without reinventing the wheel.

- **ContextGem API**  
  The AI engine that scans invoice line items (including PDF uploads) and suggests HS tariff codes.

- **QuickBooks API**  
  Two-way sync of financial data—invoice amounts, payment statuses, and expense records—to keep accounting up to date automatically.

- **Freight-Forwarder API**  
  Real-time shipping and tracking updates, reducing manual status checks and ensuring shipment details flow seamlessly.

- **Stripe**  
  Handles customer billing, subscriptions, and one-off payments. We chose it for its global reach, secure PCI compliance, and flexible plans.

- **Resend**  
  Sends email notifications for events like classification complete, review needed, or submission confirmed.

- **Slack & SMS (via Twilio) [Optional]**  
  For teams that prefer instant alerts in Slack channels or SMS texts, we can plug in those channels alongside email.

- **ASYCUDA API / EDI-SFTP**  
  A hybrid submission pipeline:
  • **API Endpoint**: Direct XML submissions to customs authorities.  
  • **EDI/SFTP**: Fallback file-transfer method when API isn’t available.

## 5. Security and Performance Considerations
Measures we’ve built in to protect data and keep the app responsive.

- **Authentication & Access Control**  
  • Multi-factor authentication (MFA) and password complexity rules via NextAuth.js.  
  • Role-based permissions to ensure each user only sees the data and actions they’re entitled to.

- **Data Encryption**  
  • TLS for all data in transit (HTTPS everywhere).  
  • AES-256 at rest for database and backups.

- **Rate Limiting & Throttling**  
  • Redis-backed limits on classification API calls to prevent abuse and control costs.  
  • Graceful fallbacks if the external API is unavailable.

- **Input Validation & Sanitization**  
  • Frontend and backend checks on all user-provided data to prevent injection attacks.

- **Caching & CDN**  
  • Vercel’s global CDN for static assets and pre-rendered pages.  
  • Redis caching of classification results and commonly requested tariff data.

- **Performance Testing**  
  • Jest for unit tests ensures code quality.  
  • Playwright for end-to-end tests checks user flows and measures load times.

- **Monitoring & Logging**  
  • Application logs and audit trails captured in PostgreSQL or a central logging service.  
  • Uptime and error-rate alerts configured via monitoring tools (e.g., Sentry, Datadog).

## 6. Conclusion and Overall Tech Stack Summary
Our technology choices align with the project’s goals to cut customs-preparation time in half, eliminate costly broker fees, and deliver 99.8% classification accuracy—all in a familiar spreadsheet interface.

Key takeaways:

- **User-Friendly Frontend**: React, Next.js, AG Grid, and Tailwind CSS create a fast, intuitive Excel-like experience.
- **Robust Backend**: Node.js, PostgreSQL, Redis, xmlbuilder2, and Puppeteer ensure reliable data handling, document generation, and high performance.
- **Scalable Infrastructure**: Vercel hosting, GitHub Actions CI/CD, and managed databases provide smooth deployments, global delivery, and easy scaling.
- **Essential Integrations**: ContextGem for AI classification, QuickBooks and freight-forwarder APIs for seamless data flow, Stripe for billing, and Resend for notifications.
- **Strong Security & Compliance**: NextAuth.js authentication, encryption at rest/in transit, rate limiting, and audit-grade logging keep data safe and compliant.

This cohesive stack empowers small-to-mid-sized importers to handle customs documentation quickly, accurately, and securely—without expensive brokers or steep learning curves. If you have questions about any of these choices or want more detail on a specific component, let us know!