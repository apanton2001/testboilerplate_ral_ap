# Automated Customs Documentation Platform - Admin User Guide

Welcome, Administrator! This guide provides an overview of the administrative functionalities available in the platform.

## 1. Dashboard Overview

The main dashboard provides a high-level summary of platform activity. As an Admin, you have access to all sections.

## 2. User Management

*(Requires specific UI/API endpoints to be implemented)*

-   **Viewing Users:** Navigate to the Admin section to view a list of all registered users.
-   **Assigning Roles:** Modify user roles (Clerk, Reviewer, Admin) to manage permissions.
-   **Inviting Users:** (If implemented) Invite new users to the platform.
-   **Deactivating Users:** (If implemented) Deactivate user accounts.

## 3. System Configuration

*(Requires specific UI/API endpoints to be implemented)*

-   **Integration Settings:** Manage connections to QuickBooks, Freight Forwarders, and Stripe (view status, connect/disconnect). Access via Settings > Integrations.
-   **Notification Preferences:** Configure system-wide notification settings (if applicable).
-   **Classification Settings:** Adjust confidence thresholds or other parameters for the AI classification service.
-   **Billing/Subscription:** View the current subscription status (via Stripe integration).

## 4. Reporting and Analytics

-   **Accessing Reports:** Navigate to the Reports section.
-   **Volume Report:** View trends in invoice and line item processing volume. Filter by date range and optionally by user.
-   **Accuracy Report:** Analyze the performance of the automated classification system, including auto-classification rates and manual override rates. Filter by date range.
-   **Savings Report:** Estimate cost savings based on reduced manual effort and potential broker fee reductions. Configure cost parameters (broker fee, hourly rate) and filter by date range.
-   **Exporting Reports:** Export any report data to CSV or Excel format for further analysis.
-   **Summary View:** Access a consolidated view of key metrics from all reports.

## 5. Review Queue Management (Admin Access)

Admins typically have the same review capabilities as Reviewers:

-   **Accessing Queue:** Navigate to the Reviews section.
-   **Reviewing Items:** Examine flagged invoice line items with low classification confidence.
-   **Approving/Adjusting:** Approve the suggested HS code or provide a manual correction. Add comments as needed.
-   **History:** View the history of review actions.

## 6. Troubleshooting

-   **API Documentation:** Refer to the `/api-docs` endpoint on the backend server for detailed API information.
-   **Logs:** Check backend logs (`backend/logs/`) for detailed error information if issues arise.
-   **Contact Support:** (Provide contact information or procedure).

*(This guide is a template. Specific steps and screenshots should be added as the UI is developed.)*