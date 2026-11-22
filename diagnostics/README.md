# Diagnostics

This directory contains all Zxtract diagnostic and inspection scripts. New diagnostic scripts belong here and are grouped automatically under **Diagnostics** in the launcher.

## Andhra Pradesh Management Quota — API inspection

Script: [`inspect-ap-management-quota.js`](./inspect-ap-management-quota.js)  
Version: **1.0.0**

Use this on the Andhra Pradesh PG Medical Management Quota allotment/results page. The MQ portal is a separate APTOnline application, so its API contract is not assumed to match the Zynerd Government Quota endpoint.

1. Open the AP Management Quota allotment/results table.
2. Tap the saved **Zxtract** bookmarklet.
3. Select **Inspect AP Management Quota** under **Diagnostics**.
4. Tap **Load selected extractor**.
5. Refresh the table or change to another page so the page makes its data request.
6. Wait for the panel to report captured requests, then tap **Copy inspection**.
7. Paste the copied report into the ChatGPT conversation.

The report includes request URLs (with common secret/session parameters redacted), methods, status codes, request-body structure, JSON response keys/types, table headers, and pagination controls. It deliberately omits arbitrary personal string values such as candidate names and contact details. It does not modify the page, paginate automatically, or save allotment data.

Once the endpoint, request parameters, response record path, pagination behaviour, and output fields are confirmed, the production MQ extractor can be implemented safely.

## Andhra Pradesh Government Quota — institute fields

Script: [`inspect-institute-fields.js`](./inspect-institute-fields.js)

1. Open the Andhra Pradesh Government Quota allotments page on Zynerd.
2. Tap the saved **Zxtract** bookmarklet.
3. Select **Inspect Institute Fields** under **Diagnostics**.
4. Tap **Load selected extractor**.
5. Trigger one table page load on Zynerd.
6. When the panel reports that the response was captured, tap **Copy inspection**.
7. Paste the copied report into the ChatGPT conversation.

The diagnostic captures one matching API response, displays an on-page status and copy button, and restores the original XHR methods. It does not trigger pagination, change page data, or save files.

## Adding diagnostics

- Place each diagnostic JavaScript file in this directory (or a descriptive subdirectory).
- Give each script a clear source header and version where applicable.
- Provide an on-page status and copy/export action when output is needed on Android; do not require developer tools.
- Document its purpose, launch steps, captured fields, and limitations here or in a script-specific README.
- The Worker build automatically lists it under **Diagnostics** after the next successful deployment.
