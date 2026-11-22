# Zxtract diagnostics

## Inspect Zynerd institute fields

The institute inspection script is available through the normal Zxtract bookmarklet launcher. No Eruda or developer console is needed.

1. Open the Andhra Pradesh Government Quota allotments page on Zynerd.
2. Tap the saved **Zxtract** bookmarklet.
3. In the launcher, select **Institute diagnostics** under the **diagnostics** category.
4. Tap **Load selected extractor**.
5. Trigger one table page load on Zynerd.
6. When the panel reports that the response was captured, tap **Copy inspection**.
7. Paste the copied report into the ChatGPT conversation.

The diagnostic captures one matching API response, displays an on-page status and copy button, and restores the original XHR methods. It does not trigger pagination, change the page data, or save any files.

The launcher discovers this script automatically from the repository. It becomes available after the next successful Worker build and deployment.
