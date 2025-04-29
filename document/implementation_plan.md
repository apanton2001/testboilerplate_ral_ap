# Implementation plan

## Phase 1: Environment Setup

1. **Prevalidation:** Check if the current directory contains a `package.json`; if present, skip initialization to avoid redundant setup. (Project Summary)
2. Install Node.js v20.2.1 globally if not already installed.  (Technical Stack: Backend)  
   **Validation:** Run `node -v` and confirm output is `v20.2.1`.
3. Initialize a Git repository in the project root: run `git init`. (Technical Stack: CI/CD)
4. Create a root `.gitignore` file at `/ .gitignore` and add:
   ```
   node_modules/
   .env
   cursor_metrics.md
   ```
   (Technical Stack: Core Tools)
5. Create top-level directories: `/frontend` and `/backend`. (Project Summary)
6. Inside `/frontend`, scaffold a Next.js 14 app by running:  
   ```bash
   cd frontend
   npx create-next-app@14 . --ts
   ```  
   (Technical Stack: Frontend — Next.js)
7. Inside `/backend`, initialize a Node.js project with:  
   ```bash
   cd backend
   npm init -y
   ```  
   (Technical Stack: Backend)
8. Create a `cursor_metrics.md` file at project root and add a reference to `cursor_project_rules.mdc` for metric guidelines. (AI Tools in Use)
9. **Validation:** Open `cursor_metrics.md` and confirm the file exists and contains the header `# Metrics` with a link to `cursor_project_rules.mdc`. (AI Tools in Use)
10. Ensure both `/frontend` and `/backend` directories contain a `.env.example` file with placeholders for environment variables (e.g., `DATABASE_URL`, `NEXTAUTH_SECRET`, `CONTEXTGEM_API_KEY`). (Technical Stack: Core Tools)

## Phase 2: Frontend Development

11. Install React 18.2.0 in `/frontend`:  
    ```bash
    cd frontend
    npm install react@18.2.0 react-dom@18.2.0
    ```  
    (Technical Stack: Frontend)
12. Install Tailwind CSS v3 in `/frontend`:  
    ```bash
    npm install -D tailwindcss@3 postcss autoprefixer
    npx tailwindcss init -p
    ```  
    (Technical Stack: Frontend — Tailwind CSS)
13. Install AG Grid Community and React wrappers v29 in `/frontend`:  
    ```bash
    npm install ag-grid-community@29 ag-grid-react@29
    ```  
    (Technical Stack: Frontend — AG Grid)
14. Configure global styles: update `/frontend/tailwind.config.js` and import `./styles/globals.css` in `/frontend/pages/_app.tsx`. (Technical Stack: Frontend)
15. Create a layout component at `/frontend/components/Layout.tsx` using Tailwind utility classes and reference the design language (Raya + a-leads.co). (Design)
16. Build the invoice entry page at `/frontend/pages/invoices.tsx` with an AG Grid instance configured for inline editing. (Key Features: Excel-like interface)
17. Set up NextAuth.js v4 in `/frontend/pages/api/auth/[...nextauth].ts` with:
    - Credentials provider for email/password  
    - SAML/OAuth providers for SSO  
    (Technical Stack: Frontend — NextAuth.js)
18. Create `/frontend/lib/email.ts` to integrate Resend for transactional emails (e.g., notification on submission). (Technical Stack: Frontend — Resend)
19. **Validation:** Run `npm run dev` inside `/frontend`; navigate to `http://localhost:3000/invoices` and confirm the AG Grid invoice screen loads. (App Flow)

## Phase 3: Backend Development

20. Install Express v4.18.2 in `/backend`:  
    ```bash
    npm install express@4.18.2
    ```  
    (Technical Stack: Backend)
21. Install PostgreSQL client `pg@8.7.3` in `/backend`:  
    ```bash
    npm install pg@8.7.3
    ```  
    (Technical Stack: Backend — PostgreSQL)
22. Install Redis client `redis@4.6.7` in `/backend`:  
    ```bash
    npm install redis@4.6.7
    ```  
    (Technical Stack: Backend — Redis)
23. Install `xmlbuilder2@3.0.2` and `puppeteer@19.7.1` in `/backend` for ASYCUDA XML and EDI/SFTP fallback:  
    ```bash
    npm install xmlbuilder2@3.0.2 puppeteer@19.7.1
    ```  
    (Technical Stack: Backend)
24. Install Stripe SDK v12 and QuickBooks SDK (latest) in `/backend`:  
    ```bash
    npm install stripe@12 quickbooks
    ```  
    (Third-Party Integrations)
25. Create `/backend/src/db/schema.sql` defining tables:
    - users (id, email, password_hash, role_id)
    - roles (id, name)
    - invoices (id, fields…, status)
    - tariff_classifications (invoice_id, item_index, hs_code, confidence)
    - audit_logs (entity, action, user_id, timestamp)
    (Data and Compliance Requirements)
26. Execute the schema on your AWS RDS PostgreSQL instance in `us-east-1`:  
    ```bash
    psql "$DATABASE_URL" -f src/db/schema.sql
    ```  
    (Technical Stack: Backend — PostgreSQL)
27. Create Express server entry at `/backend/src/app.js` with CORS, JSON parsing, and route mounts. (Technical Stack: Backend)
28. Implement authentication routes in `/backend/src/routes/auth.js` using bcrypt for hashing and JWT for sessions; enforce password rules (min 8 chars, complexity). (Authentication and Security)
29. Build classification service at `/backend/src/services/classifier.js` to call ContextGem API and store results. (Key Features: Automated tariff classification)
30. Build customs submission service at `/backend/src/services/customsSubmit.js` using xmlbuilder2 for ASYCUDA API and Puppeteer for EDI/SFTP fallback. (Key Features: Submission to Customs)
31. Implement QuickBooks integration in `/backend/src/services/quickbooks.js` to sync invoice amounts and payment status. (Integrations)
32. Implement freight-forwarder integration in `/backend/src/services/freight.js` to fetch shipment details. (Integrations)
33. Implement email notifications in `/backend/src/services/email.js` using Resend. (Technical Stack: Resend)
34. Add audit-logging middleware at `/backend/src/middleware/auditLogger.js` to write to `audit_logs` on each data change. (Data and Compliance Requirements)
35. **Validation:** Run `npm test` in `/backend` (set up Jest or Mocha) and verify at least one test for each route returns expected status codes. (App Flow)

## Phase 4: Integration

36. Create `/frontend/services/api.ts` that exports functions to call backend endpoints (`/api/auth`, `/api/classify`, `/api/submit`, `/api/history`). (Integration)
37. Enable CORS in `/backend/src/app.js` to allow `https://*.vercel.app` and `http://localhost:3000`. (Integration)
38. Implement Redis caching middleware at `/backend/src/middleware/cache.js` for classification results (TTL = 24h). (Technical Stack: Redis)
39. Implement rate limiting middleware at `/backend/src/middleware/rateLimiter.js` (max 100 requests/min per IP). (Technical Stack: Redis)
40. Update `/frontend/services/api.ts` to call `/classify` and display HS codes in the AG Grid UI. (Integration)
41. Update `/frontend/pages/invoices.tsx` to call `/submit` and show submission status via in-app alerts. (Integration)
42. **Validation:** Run a Cypress end-to-end test that logs in as Data Entry Clerk, classifies an invoice, submits it, and verifies a record in `audit_logs`. (App Flow)

## Phase 5: Deployment

43. Add `.github/workflows/frontend.yml` to build, lint, and test the `/frontend` directory on pull requests and merges to `main`. (Infrastructure: CI/CD)
44. Add `.github/workflows/backend.yml` to build, lint, test, and (optionally) build a Docker image for `/backend` on pull requests and merges to `main`. (Infrastructure: CI/CD)
45. Configure and deploy the `/frontend` app to Vercel by connecting the GitHub repo and setting environment variables (`NEXTAUTH_URL`, `RESEND_API_KEY`). (Infrastructure: Vercel)
46. Provision an AWS Elastic Beanstalk environment in `us-east-1` for the `/backend` service; add environment variables (`DATABASE_URL`, `REDIS_URL`, `CONTEXTGEM_API_KEY`, `ASYCUDA_CREDENTIALS`). (Infrastructure: AWS)
47. Configure AWS RDS automated daily backups (retention = 7 days) and enable encryption at rest with a KMS key. (Data and Compliance Requirements)
48. Configure AWS CloudWatch to collect backend logs and set a retention policy of 5 years. (Data and Compliance Requirements)
49. Enforce SSL/TLS on all backend endpoints by enabling HTTPS in Elastic Beanstalk and setting `ssl: true` in the PostgreSQL client in `/backend/src/db/index.js`. (Authentication and Security)
50. **Validation:** Perform a production smoke test by:
    1. Visiting the deployed frontend URL.  
    2. Logging in as each role (Clerk, Reviewer, Admin).  
    3. Classifying and submitting an invoice.  
    4. Verifying entries in AWS RDS, Redis cache, CloudWatch logs, and automated backup snapshots.  
    (Deployment)