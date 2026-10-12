# Prompt: account picker (opened as a dialog)

In the app designer, select **Add page** > **Generative page** > **Describe a page**, select
**Add data** > **Add table** > **Account**, and paste this:

```text
Build an account picker page that will be opened as a dialog. Show active Account records in a
searchable list with account name, city and main phone, 20 rows at a time. Let the user select
one row. Add a Select button that is enabled only when a row is selected. When Select is
clicked, call dataApi.setPageOutput with an object { action: "selected", accountId: <the
selected account's accountid>, accountName: <the selected account's name> } and then close the
dialog with Xrm.Navigation.navigateBack(), using (window as any).Xrm. Add a Cancel button that
closes the dialog with Xrm.Navigation.navigateBack() without calling setPageOutput.
```

Then open the **Code** tab and compare the Select and Cancel handlers with
[`picker-handlers.ts`](picker-handlers.ts). Two things to confirm:

- `setPageOutput` is called **before** `navigateBack()`. Calling it does not close the dialog,
  and the caller receives the most recently stored value when the dialog closes.
- `accountId` is the bare GUID string and `accountName` is a string. The form script accepts
  only that exact shape and ignores anything else.

**Save and Publish** the app, then copy the page ID: in the app designer select the page in the
pages list and copy the GUID in the **Generative page** field. It goes in `PICKER_PAGE_ID` in
`webresources/genpagelab.js`.
