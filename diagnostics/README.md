# Diagnostics

This directory contains all Zxtract diagnostic and inspection scripts. New diagnostic scripts belong here and are grouped automatically under **Diagnostics** in the launcher.

## Current diagnostic: inspect Zynerd institute fields

The institute inspection script is available through the normal Zxtract bookmarklet launcher. No Eruda or developer console is required.

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
