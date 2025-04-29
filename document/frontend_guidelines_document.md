# Frontend Guideline Document

This guide explains how our frontend is built, styled, and organized. It covers the architecture, design principles, component structure, state management, routing, performance optimizations, testing, and more. Anyone reading this—technical or not—will understand how the frontend works.

## 1. Frontend Architecture

### 1.1 Overview

*   Framework: **Next.js** (React-based) for server-side rendering (SSR), static site generation (SSG), and client-side navigation.
*   Library: **React** for building reusable UI components.
*   Grid: **AG Grid** for spreadsheet-like interfaces (data entry, inline editing, CSV/XLSX import).
*   Styling: **Tailwind CSS** (utility-first CSS).
*   Authentication: **NextAuth.js** for secure login flows (email/password, OAuth/SAML, MFA).

### 1.2 Scalability, Maintainability, Performance

*   **Modular Components**: Each UI piece lives in its own file/folder under `components/`, making it easy to extend or replace.
*   **File-based Routing**: Next.js automatically handles routes in `pages/`, so adding new screens is simple.
*   **Server/Data Caching**: Built-in ISR (Incremental Static Regeneration) and API caching reduce server load.
*   **Code Splitting & Lazy Loading**: Next.js automatically splits code by page, and we use dynamic imports for heavy components (e.g., AG Grid).
*   **CI/CD & Preview Environments**: Vercel + GitHub Actions let us ship, preview, and roll back quickly.

## 2. Design Principles

### 2.1 Key Principles

1.  **Usability**: Simple, spreadsheet-style data entry without confusion. Inline validation and auto-save reduce user errors.
2.  **Accessibility**: WCAG AA compliance—semantic HTML, ARIA labels, keyboard navigation for grids and forms.
3.  **Responsiveness**: Mobile to desktop—flexible layouts, breakpoints defined in Tailwind’s config.
4.  **Clarity**: Clean interfaces with clear labels, tooltips for HS code classification steps, and unobtrusive notifications.

### 2.2 Applying Principles

*   **Forms & Tables**: Focus states, clear error messages, pagination, and virtual scrolling for large datasets.
*   **Notifications**: Non-blocking toast messages (top right) with Resend integration for emails.
*   **Review Workflows**: Flagged items clearly highlighted in the grid (warning color), and a dedicated review panel.

## 3. Styling and Theming

### 3.1 Styling Approach

*   **Methodology**: Utility-first with Tailwind CSS—no global CSS, only component-scoped styles via class names.
*   **Pre-processing**: PostCSS handled by Next.js (built in). PurgeCSS removes unused styles in production.

### 3.2 Theming

*   **Light and Dark Modes**: Controlled via a React context. Tailwind’s `dark:` variants switch colors.
*   **Custom Properties**: CSS variables for primary, secondary, text, and background colors—overridden based on theme.

### 3.3 Visual Style

*   **Overall Style**: Modern flat design with subtle glassmorphism: translucent panels in header and modals. Clean, minimal, and professional—similar to Raya and A-Leads.
*   **Color Palette**: • Primary: #2563EB (blue) • Secondary: #10B981 (green) • Accent: #F59E0B (amber) • Background Light: #F3F4F6 (gray-100) • Background Dark: #1F2937 (gray-800) • Surface (cards/panels): rgba(255, 255, 255, 0.7) in light, rgba(31, 41, 55, 0.7) in dark\
    • Text Dark: #111827 (gray-900) • Text Light: #D1D5DB (gray-300)
*   **Font**: **Inter** (sans-serif) for readability. Headings use `font-semibold`, body text `font-normal`.

## 4. Component Structure

### 4.1 Organization

`/components /Grid # AG Grid wrapper and custom cell editors /Auth # Login, MFA, onboarding forms /Layout # Header, Sidebar, Footer /Modals # Shared modal dialogs /Buttons # Primary, Secondary, Icon buttons /Notifications # Toast and alert components /pages /index.js # Dashboard /invoices # Data entry and review pages /docs # ASYCUDA export pages /admin # Settings and user management /utils # Helpers, API wrappers /hooks # Custom React hooks /context # Theme, Auth, Notification contexts`

### 4.2 Reusability & Maintainability

*   **Atomic Components**: Buttons, inputs, and form controls live in `components/` and accept props for variants (size, color).
*   **Composite Components**: Grids and complex forms composed of atomic components.
*   **Folder-per-Feature**: Keeps related files together, reducing import complexity.

## 5. State Management

### 5.1 Approach

*   **Local State**: React `useState` and `useReducer` for form and grid state.
*   **Global State**: React Context for auth/user info, theme, and toast notifications.
*   **Data Fetching & Caching**: Next.js `getServerSideProps` / `getStaticProps` for SSR/SSG and `fetch` or `axios` for client side. We also consider **SWR** (stale-while-revalidate) for caching GET requests.

### 5.2 Sharing State

*   **Auth Context**: Exposes user role and session functions from NextAuth.js.
*   **Grid Context**: Tracks current invoice session, auto-save status, and flagged items.
*   **Notification Context**: Queues and displays toasts, triggers Resend emails via API.

## 6. Routing and Navigation

### 6.1 Next.js Routing

*   **File-based**: `/pages` maps to URL paths. Dynamic routes use `[param].js`.
*   **Nested Layouts**: `pages/_app.js` wraps all pages in a common layout; `pages/invoices/_layout.js` for invoice-specific layouts.

### 6.2 Navigation Structure

*   **Sidebar Menu**: Links to Dashboard, Invoices, Review, Documents, Reports, Admin.
*   **Breadcrumbs**: Show current page hierarchy on sub-pages (e.g., Invoices → Review).
*   **Protected Routes**: Higher-order component checks user roles before rendering pages.

## 7. Performance Optimization

*   **Code Splitting**: Dynamic imports (`next/dynamic`) for AG Grid and heavy charts.
*   **Image Optimization**: Next.js `<Image>` component auto-optimizes assets.
*   **Caching & ISR**: Use `revalidate` to update tariff data every X hours without a full rebuild.
*   **Tailwind Purge**: Removes unused CSS classes in production.
*   **Minification**: Next.js builds with Terser.
*   **Server-Side Rendering**: Critical pages SSR for SEO; data entry pages use client-side rendering for interactivity.

## 8. Testing and Quality Assurance

### 8.1 Testing Strategy

*   **Unit Tests**: Jest + React Testing Library for components and utility functions.
*   **Integration Tests**: Testing user flows in isolated environments (e.g., grid edits + auto-save trigger).
*   **End-to-End Tests**: Playwright for critical flows—login, invoice import, HS code assignment, document export.

### 8.2 Tools & CI

*   **Jest**: Mock API responses, test React hooks and contexts.
*   **React Testing Library**: Accessibility queries, user-event simulations.
*   **Playwright**: Multi-browser tests (Chromium, Firefox, WebKit).
*   **GitHub Actions**: Run tests on every PR, block merges on failures, generate coverage reports.

## 9. Conclusion and Overall Frontend Summary

Our frontend combines Next.js, React, AG Grid, and Tailwind CSS to deliver a fast, maintainable, and user-friendly platform for customs documentation. We prioritize:

*   **Efficiency**: Excel-like interface with auto-classification and one-click exports.
*   **Security**: NextAuth.js with MFA, AES-256 encryption for data in transit and at rest.
*   **Scalability**: Modular components, code splitting, and server caching.
*   **Quality**: Rigorous testing with Jest and Playwright, CI/CD on Vercel.

This setup ensures any developer—or non-technical stakeholder—can understand, maintain, and extend the frontend, while delivering a modern, accessible, and high-performance user experience aligned with our project goals.
