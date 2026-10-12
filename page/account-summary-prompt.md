# Prompt: company summary (opened in a side pane)

In the app designer, select **Add page** > **Generative page** > **Describe a page**, select
**Add data** > **Add table** > **Account**, and paste this:

```text
Set up the page to accept an account recordId and entityName. When the page loads, read
pageInput.recordId and fetch that account with dataApi.retrieveRow, selecting only name,
telephone1, websiteurl, address1_city, numberofemployees, revenue and description. Show it as a
compact summary card that fits a 400-pixel-wide side pane: the account name as a heading, then
phone, website, city, employees and revenue as label and value pairs, then the description. If
no recordId is provided, show the message "Pick a company to see its summary."
```

Asking for specific columns matters: `retrieveRow` returns every column when `select` is
omitted, and a side pane that refreshes on every record change should not fetch the whole row.

The page captures its inputs when the script calls `pane.navigate`, and it does not follow the
form afterward. The form script navigates the pane again whenever Company Name changes, which is
why the page only needs to read its inputs once, on load.

**Save and Publish** the app, then copy this page's ID into `SUMMARY_PAGE_ID` in
`webresources/genpagelab.js`.
