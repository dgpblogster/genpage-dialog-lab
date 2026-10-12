// Generative page navigation lab: a dialog that returns a value, and a side pane that follows the record.
// Upload as a JavaScript (JS) web resource, for example new_genpagelab.js (use your publisher prefix).
// Docs: https://learn.microsoft.com/power-apps/developer/model-driven-apps/clientapi/navigate-to-generative-page-examples

// Define a unique namespace for the lab library.
window.GenPageLab ??= {};

(() => {
    // Replace with the IDs of your two published generative pages.
    // App designer > select the page in the pages list > copy the GUID in the Generative page field.
    const PICKER_PAGE_ID = "<account-picker-page-id>";
    const SUMMARY_PAGE_ID = "<account-summary-page-id>";
    const SUMMARY_PANE_ID = "GenPageLabCompany";

    // returnValue is whatever the page last passed to dataApi.setPageOutput, or undefined when the
    // user cancels. Accept only the exact shape the picker page is built to return.
    const isSelection = (output) =>
        output !== null &&
        typeof output === "object" &&
        output.action === "selected" &&
        typeof output.accountId === "string" &&
        typeof output.accountName === "string";

    // Contact main form command bar: Action = Run JavaScript, Parameter 1 = PrimaryControl.
    // PrimaryControl passes the form context directly.
    window.GenPageLab.pickCompany = async (primaryControl) => {
        const formContext = primaryControl;

        const result = await Xrm.Navigation.navigateTo(
            { pageType: "generative", pageId: PICKER_PAGE_ID },
            {
                target: 2,
                position: 1,
                width: { value: 60, unit: "%" },
                height: { value: 70, unit: "%" },
                title: "Pick a company"
            }
        );

        const output = result?.returnValue;
        if (!isSelection(output)) {
            return false; // Cancel, the close button, or an unexpected shape: leave the form alone.
        }

        // Closing the dialog changes nothing by itself; the script applies the value explicitly.
        const company = formContext.getAttribute("parentcustomerid");
        company.setValue([{ id: output.accountId, name: output.accountName, entityType: "account" }]);
        company.fireOnChange(); // Lets the OnChange handler below re-point the side pane immediately.
        return true;
    };

    // Register on the Contact main form OnLoad AND on the Company Name (parentcustomerid) column
    // OnChange, with "Pass execution context as first parameter" selected.
    // Keeps one side pane showing a summary of the contact's company.
    window.GenPageLab.syncCompanyPane = async (executionContext) => {
        const formContext = executionContext.getFormContext();
        const account = formContext.getAttribute("parentcustomerid")?.getValue()?.[0];

        // getPane is documented as returning null in one article and undefined in another; treat both as "no pane".
        let pane = Xrm.App.sidePanes.getPane(SUMMARY_PANE_ID);

        if (!account || account.entityType !== "account") {
            pane?.close(); // No company, or the company is a contact: nothing to summarize.
            return "closed";
        }

        if (!pane) {
            pane = await Xrm.App.sidePanes.createPane({
                title: "Company summary",
                paneId: SUMMARY_PANE_ID,
                canClose: true,
                width: 400
            });
        }

        // The page captures its inputs when navigate is called and does not follow the form afterward,
        // so navigate again every time the company changes.
        await pane.navigate({
            pageType: "generative",
            pageId: SUMMARY_PAGE_ID,
            entityName: "account",
            recordId: account.id.replace(/[{}]/g, "")
        });
        return "navigated";
    };
})();
