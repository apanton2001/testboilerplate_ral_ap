# App Flow Document

## Onboarding and Sign-In/Sign-Up

When a new user arrives at the platform, they land on a public welcome page that highlights the benefits of automating customs documentation. From this page, they click a call-to-action button to begin creating an account. The sign-up form prompts for basic profile information such as name, email address, and password. The password field enforces complexity rules and users receive immediate feedback if their chosen password is too weak. Below the standard email and password option, there are buttons for social login via OAuth providers and a link to initiate single sign-on through SAML for corporate environments. Once they submit the form, they receive an email with a verification link. After verifying their address, they return to the app and are guided through an optional multi-factor authentication setup using either an authenticator app or SMS codes.

Returning users access the sign-in page directly, where they enter their credentials or use the social login buttons. If a user forgets their password, a recovery link guides them through entering their email and receiving a reset link. After resetting their password, they are prompted to sign in and optionally re-enable multi-factor authentication. Each successful login starts a secure session that includes an inactivity timeout. Users only need to reauthenticate when their session expires or when they explicitly sign out from the user menu in the application header.

## Main Dashboard or Home Page

Upon successful login, every user sees a unified dashboard tailored to their role. The top of the page features a header with the application logo, the user’s name and avatar, and a settings icon. Below the header, a horizontal navigation bar lists core areas such as Shipments, Reviews, Reports, and Settings. On the left side, a collapsible sidebar displays quick links to commonly used functions based on the user’s permissions. In the central area of the dashboard, a summary widget presents the most recent import jobs, showing their status and a link to launch the invoice entry interface. If a user has flagged items awaiting review, an alert panel appears above the summary. Each widget includes real-time notifications that update automatically when new events occur.

Users move from the dashboard to other parts of the application by clicking the sidebar icons or navigation bar links. For example, choosing Shipments opens a list view of all past and present customs jobs, while clicking Reports takes the user to a page where they can generate or view analytics dashboards. The settings icon in the header always returns the user to their account preferences and administrative controls if they have the necessary permissions.

## Detailed Feature Flows and Page Transitions

When a data entry clerk begins a new shipment, they click the Create Shipment button on the dashboard. This action opens the invoice data entry page, presenting an Excel-like grid powered by AG Grid. If the clerk has a CSV or XLSX file ready, they click the Import button, select the file, and map its columns to the grid’s fields. The system automatically saves each mapping choice and populates the grid with line items in real time. If the clerk prefers manual entry, they simply click a cell and type values directly.

Once the grid is populated, the clerk clicks the Classify Items button. The grid column for HS codes fills with provisional classifications fetched from the ContextGem API and the latest Jamaica Customs tariff dataset. Behind the scenes, a confidence score is calculated for each line item. Items with high confidence display in normal font, while those with lower confidence are flagged and highlighted. The user navigates through flagged rows by clicking Next Flag, which scrolls the grid to each ambiguous entry.

When the classification step completes, the clerk submits the shipment for review. The page transitions to a confirmation screen showing a summary of classified items and their confidence levels. This screen includes a Submit for Review button that notifies the assigned tariff reviewer. The tariff reviewer receives an in-app alert and an email notification prompting them to open the Review page.

On the Review page, the reviewer sees the same grid interface but with additional columns for reviewer comments and approval toggles. The reviewer inspects each flagged line, adjusts codes if necessary, and adds explanatory notes. Once all items are approved, the reviewer clicks Finalize Review. This triggers the next transition to the document generation page.

On the document generation page, the complete shipment record is compiled into an ASYCUDA-compliant XML package. A progress bar displays the build status and then provides two download buttons: one for the XML file and one for a print-ready PDF rendered via Puppeteer. Below the download options, the user sees a button labeled Submit to Customs.

Clicking Submit to Customs opens a modal where the user chooses either the API integration or the EDI/SFTP process. For the API path, clicking Confirm streams the XML packet directly to the ASYCUDA endpoint and displays a live status log. For the EDI/SFTP path, the user is shown the secure credentials and destination folder, and the system establishes the transfer in the background. On successful completion, a notification appears and the shipment moves into the Submitted state.

At any point, users can access the Shipments list to view the current status of each job. Clicking a shipment row opens a detail page with tabs for Overview, Documents, History, and Integrations. The Overview tab shows key metadata, the Documents tab lists all exports, the History tab shows a timestamped audit log, and the Integrations tab displays links to QuickBooks entries or freight-forwarder updates.

## Settings and Account Management

From the header’s settings icon, all users can access their account details page. Here they update personal information, change their password, and configure multi-factor authentication. A Notifications tab offers toggles for email, in-app, SMS, and Slack alerts, with options to select which event types each channel should handle. A Data Retention section explains that customs records are stored for five years and can only be deleted by administrators.

Administrators see additional sections in Settings for User Management, Billing, and System Configuration. In User Management, admins add or remove users, assign roles of Data Entry Clerk, Tariff Reviewer, or Admin, and reset passwords. The Billing section integrates with Stripe, allowing admins to view subscription status, update payment methods, and download invoices. Under System Configuration, admins upload new tariff data sets every six months, set session timeout durations, manage SFTP credentials, and configure data residency rules for backup locations.

After making changes in Settings, users click Save or Apply and are returned to their previous page or the dashboard depending on the context. A confirmation toast briefly appears to confirm successful updates.

## Error States and Alternate Paths

If users enter invalid data during invoice entry, inline validation messages appear beneath the affected cells explaining the error. Users cannot proceed until they correct these entries. If the classification API fails or times out, the system displays a fallback message and automatically caches any successful responses before retrying. Users can continue manual classification in the meantime.

Network connectivity issues are detected and indicated by a banner at the top of each page. While offline, users can continue editing the grid and their changes are stored locally until reconnection. If an authenticated session expires due to inactivity, users see a prompt asking them to log in again without losing unsaved data.

During direct submission, if the ASYCUDA endpoint returns an error, the submission modal shows the error code and description. The user may choose to retry the submission or switch to the EDI/SFTP method without losing the prepared XML package. Administrative errors, such as an invalid SFTP configuration or expired API token, redirect administrators to the System Configuration page for correction.

## Conclusion and Overall App Journey

A new user signs up, verifies their email, and sets up multi-factor authentication before landing on a dashboard that reflects their assigned role. A data entry clerk begins by importing or typing invoice data into a familiar spreadsheet interface. They invoke the automated classification engine, review any flagged items, and submit the file for tariff review. A tariff reviewer then inspects ambiguous line items and finalizes classifications. The system generates ASYCUDA-compliant documents, which the user can download or submit directly via API or SFTP. Throughout the process, users receive real-time notifications and can view historical records, generate reports, and integrate shipment data with QuickBooks or freight-forwarder portals. Administrators maintain user roles, tariff data, compliance settings, and billing information in a dedicated console. Error handling ensures seamless recovery from validation issues, connectivity disruptions, and integration failures. Over time, this journey transforms hours of manual customs paperwork into minutes of automated classification, document generation, and secure submission, delivering efficiency gains and cost savings to the import/export business.