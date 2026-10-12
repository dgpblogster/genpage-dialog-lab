// The two handlers the account picker page needs, adapted from the docs:
// https://learn.microsoft.com/power-apps/developer/model-driven-apps/clientapi/navigate-to-generative-page-examples
//
// After the agent generates the picker, open the Code tab and check that its Select and Cancel
// buttons do exactly this. If they don't, select Edit and paste these in, then Save.
// `dataApi` is the object generated pages already use for Dataverse calls.
declare const dataApi: { setPageOutput(value: unknown): void };

// Select: store the value FIRST, then close. setPageOutput doesn't close the dialog by itself,
// and the calling script receives the most recently stored value when the dialog closes.
export async function handleSelection(accountId: string, accountName: string): Promise<void> {
    dataApi.setPageOutput({
        action: "selected",
        accountId,
        accountName
    });

    const xrm = (window as any).Xrm;
    await xrm.Navigation.navigateBack();
}

// Cancel: close WITHOUT setting an output. The calling script then receives an undefined
// returnValue, which the form script treats as "leave the form alone".
export async function handleCancel(): Promise<void> {
    const xrm = (window as any).Xrm;
    await xrm.Navigation.navigateBack();
}
