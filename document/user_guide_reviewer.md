# Automated Customs Documentation Platform - Reviewer User Guide

Welcome, Reviewer! This guide explains how to use the platform's review features to ensure classification accuracy.

## 1. Dashboard Overview

Your dashboard provides quick access to relevant sections, including the Review Queue and recent activity.

## 2. Accessing the Review Queue

-   Navigate to the "Reviews" section from the main menu.
-   This page displays a list of invoice line items that have been automatically flagged by the system due to low classification confidence or other criteria.
-   The queue can typically be sorted and filtered (e.g., by date, invoice ID).

## 3. Reviewing Flagged Items

-   Click on an item in the queue to view its details.
-   You will see:
    -   The product description.
    -   The automatically suggested HS code.
    -   The confidence score assigned by the AI classifier.
    -   Relevant invoice details (supplier, date, etc.).
    -   (Potentially) Images or other supporting documents if available.

## 4. Taking Action

For each flagged item, you have two primary actions:

-   **Approve:**
    -   If you agree with the automatically suggested HS code, click the "Approve" button.
    -   You may optionally add a comment explaining your decision.
    -   Approving removes the flag and confirms the HS code.
-   **Adjust:**
    -   If the suggested HS code is incorrect, click the "Adjust" button.
    -   Enter the correct HS code in the provided field.
    -   It is highly recommended to add a comment explaining the reason for the adjustment (this helps improve the AI model over time).
    -   Submitting the adjustment updates the HS code, removes the flag, and logs the change.

## 5. Review History

-   You can access a history of past review actions (approvals and adjustments) you have taken.
-   This helps track changes and maintain an audit trail. Navigate to the "Review History" sub-section or tab.

## 6. Best Practices

-   Review items promptly to avoid delays in customs processing.
-   Use the comments field to provide context for your decisions, especially for adjustments.
-   Consult tariff schedules or other resources if unsure about the correct HS code.
-   Report any recurring issues or patterns in misclassifications to the Admin or development team.

*(This guide is a template. Specific UI elements, button names, and navigation paths should be updated based on the final frontend implementation.)*