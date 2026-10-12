# Generative Page Dialog Lab

## A Companion Lab for The Workbench

Two generative page capabilities documented on October 9, 2026, wired together on one
model-driven form:

- A generative page opened as a **dialog** can now **return a value** to the script that
  opened it, through `dataApi.setPageOutput`.
- A generative page can now open in an **app side pane**, which the docs previously listed as
  unsupported.

The demo: a **Pick company** button on the Contact form opens a generative-page account picker
as a dialog, applies the account it returns to **Company Name**, and a side pane showing a
generative-page summary of that company follows along.

Companion to the post *The Dialog That Answers Back* on
[The Workbench](https://www.theworkbench.blog).

Source of truth: [Navigate to and from a generative page using client API](https://learn.microsoft.com/power-apps/developer/model-driven-apps/clientapi/navigate-to-generative-page-examples)
and the [`setPageOutput` method](https://learn.microsoft.com/power-apps/developer/model-driven-apps/generative-page/data-api/#setpageoutput-method).

---

## Repo Structure

```
genpage-dialog-lab/
├── README.md                        # This file
├── webresources/
│   └── genpagelab.js                # The form script: pickCompany + syncCompanyPane
├── page/
│   ├── account-picker-prompt.md     # Prompt for the dialog page
│   ├── account-summary-prompt.md    # Prompt for the side pane page
│   └── picker-handlers.ts           # What the picker's Select and Cancel must do
└── tests/
    └── genpagelab.test.mjs          # Runs the real web resource against a mocked Xrm
```

---

## The Contract Between the Script and the Page

| Rule (from the docs) | What the code does about it |
|---|---|
| `setPageOutput` stores a value but doesn't close the dialog | The picker calls it, then `Xrm.Navigation.navigateBack()` |
| The caller receives the **most recently stored** value | The picker sets it once, on Select only |
| Cancel or the close button with no output gives an `undefined` `returnValue` | The script treats anything but the expected shape as "leave the form alone" |
| Returning a value doesn't change the form by itself | The script calls `setValue` and then `fireOnChange()` explicitly |
| Dialogs return values; inline pages and side panes don't | The side pane is one-way: the script sends inputs, nothing comes back |
| A side pane captures its inputs at `pane.navigate` and doesn't follow the form | The script navigates the pane again on every Company Name change |

---

## Prerequisites

- A model-driven app that includes the **Contact** and **Account** tables.
- Generative pages: the in-browser designer needs an environment in the United States, Great
  Britain, Australia or Singapore. Elsewhere, create the pages with the AI code generation tools
  route instead.
- **Node.js 20** or later, only to run the tests.

---

## Steps

1. **Picker page.** Create it from [`page/account-picker-prompt.md`](page/account-picker-prompt.md),
   check its handlers against [`page/picker-handlers.ts`](page/picker-handlers.ts), **Save and
   Publish**, and copy its ID (app designer > select the page > the **Generative page** field).
2. **Summary page.** Create it from [`page/account-summary-prompt.md`](page/account-summary-prompt.md),
   **Save and Publish**, and copy its ID.
3. **Script.** Paste the two IDs into `PICKER_PAGE_ID` and `SUMMARY_PAGE_ID` in
   [`webresources/genpagelab.js`](webresources/genpagelab.js).
4. **Web resource.** In your solution select **New** > **More** > **Web resource**, choose the
   file, set **Type** to **JavaScript (JS)**, and name it with your publisher prefix, for
   example `new_genpagelab.js`.
5. **Form library.** Edit the Contact main form, select **Form Libraries** > **Add library**,
   and add the web resource.
6. **Form events.** On the **Events** tab, select **On Load** > **+ Event Handler**, enter
   `GenPageLab.syncCompanyPane` in **Function**, select **Pass execution context as first
   parameter**, and select **Done**. Then select the **Company Name** column, its **Events**
   tab, **On Change** > **+ Event Handler**, and add the same function the same way. **Save**
   and **Publish** the form.
7. **Command.** In the app designer, select **...** next to the Contacts view > **Edit command
   bar** > **Main form** > **Edit**. Select **New** > **Command**, set **Label** to
   `Pick company`, **Action** to **Run JavaScript**, **Library** to your web resource (**Add
   library** if it isn't listed), **Function name** to `GenPageLab.pickCompany`, and under
   **Add Parameters** set **Parameter 1** to `PrimaryControl`. **Save and Publish**.
8. **Test.** Open a contact whose Company Name is an account: the **Company summary** pane
   opens. Select **Pick company**, pick a different account and select **Select**: Company Name
   changes and the pane follows. Do it again and select **Cancel**: nothing changes.

---

## Tests

```
node --test
```

Fourteen tests load the real `genpagelab.js` into a sandbox with a mocked `Xrm` and check which
dialog results the script accepts, that it applies a valid one and fires OnChange, that it
creates the side pane once and reuses it, that it strips the braces from the lookup ID, and that
it closes the pane when there's no account. The suite was sabotage-checked: breaking the shape
guard, the pane reuse or the brace stripping each turns the matching tests red.

What the tests **cannot** prove is how the platform behaves; a mock agrees with whatever its
author believed. That part is step 8, in a real app.

---

## Notes

- `Xrm.App.sidePanes.getPane` is documented as returning `null` in one article and `undefined`
  in another. The script treats both as "no pane", and a test covers each.
- **Company Name** is a customer lookup, so it can hold a contact. The script closes the pane in
  that case rather than navigating an account page to a contact ID.
