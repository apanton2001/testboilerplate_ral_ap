# Automated Customs Documentation Platform - Clerk User Guide

Welcome! This guide outlines the primary tasks for users with the Clerk role in the platform, focusing on invoice management and submission preparation.

## 1. Dashboard Overview

Your dashboard provides quick access to your recent invoices, pending submissions, and notifications.

## 2. Managing Invoices

-   **Viewing Invoices:** Navigate to the "Invoices" section to see a list of all invoices you have access to. You can typically search, sort, and filter this list.
-   **Creating a New Invoice:**
    -   Click the "New Invoice" or "Create Invoice" button.
    -   Enter the required invoice header information (Supplier, Invoice Date, etc.).
    -   Add line items using the grid interface:
        -   Enter product descriptions, quantities, and unit prices.
        -   The system will attempt to automatically suggest an HS code based on the description.
    -   Save the invoice (initially as a "Draft").
-   **Editing an Invoice:**
    -   Open an existing invoice from the list.
    -   Modify header details or line items as needed.
    -   Save your changes.
-   **Deleting an Invoice:** (If permissions allow) Delete draft invoices that are no longer needed.

## 3. HS Code Classification

-   As you enter line item descriptions, the system uses AI (ContextGem) to suggest an HS code.
-   Review the suggested HS code and the associated confidence score.
-   If an item is automatically flagged (low confidence), it will require attention from a Reviewer before submission. You typically cannot override flags directly as a Clerk.
-   If you strongly believe an *unflagged* auto-suggested code is incorrect, you might need to request a review or consult with a Reviewer/Admin depending on the workflow.

## 4. Preparing for Submission

-   Ensure all line items have HS codes assigned (either automatically or through the review process).
-   Verify the accuracy of all invoice details.
-   Once an invoice is complete and all classifications are finalized (no pending flags), you can typically mark it as ready for submission or initiate the submission process (depending on workflow design).

## 5. Submitting Documents

-   Navigate to the specific invoice you want to submit.
-   Click the "Submit to Customs" button (or similar).
-   The system will generate the necessary documents and attempt to submit them electronically.
-   You can monitor the submission status in the "Submissions" section or via notifications.

## 6. Tracking Submissions

-   Go to the "Submissions" section or view the status on the relevant invoice detail page.
-   Check the status (e.g., Pending, Submitted, Accepted, Rejected, Failed).
-   View any response messages from the customs system.

## 7. Notifications

-   Check the notification center (bell icon or dedicated section) for updates on submission statuses, required reviews (if applicable to your workflow), or other important events.

*(This guide is a template. Specific UI elements, button names, and navigation paths should be updated based on the final frontend implementation.)*