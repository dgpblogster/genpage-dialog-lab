// Runs webresources/genpagelab.js against a mocked Xrm. No dependencies: node --test tests/
// What this proves: the script's own logic (which values it accepts, when it creates versus reuses
// the pane, what it navigates to). What it cannot prove: how the real platform behaves. That part
// is the live test in the README.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../webresources/genpagelab.js", import.meta.url), "utf8");

// Build a fresh sandbox: a mocked Xrm, then load the real web resource into it.
function load({ dialogResult, getPaneReturnsUndefined = false } = {}) {
    const calls = { navigateTo: [], createPane: [], panes: {} };
    const Xrm = {
        Navigation: {
            navigateTo: async (pageInput, options) => {
                calls.navigateTo.push({ pageInput, options });
                return dialogResult;
            }
        },
        App: {
            sidePanes: {
                getPane: (id) => calls.panes[id] ?? (getPaneReturnsUndefined ? undefined : null),
                createPane: async (options) => {
                    calls.createPane.push(options);
                    const pane = {
                        options,
                        navigations: [],
                        closed: false,
                        navigate: async (input) => { pane.navigations.push(input); },
                        close: () => { pane.closed = true; delete calls.panes[options.paneId]; }
                    };
                    calls.panes[options.paneId] = pane;
                    return pane;
                }
            }
        }
    };
    const context = { Xrm, console };
    context.window = context;
    vm.createContext(context);
    vm.runInContext(source, context);
    return { lab: context.GenPageLab, calls };
}

// A form with a Company Name (parentcustomerid) lookup.
function form(initialValue = null) {
    const attribute = {
        value: initialValue,
        setCalls: [],
        onChangeFired: 0,
        getValue() { return this.value; },
        setValue(v) { this.value = v; this.setCalls.push(v); },
        fireOnChange() { this.onChangeFired++; }
    };
    const formContext = { getAttribute: (name) => (name === "parentcustomerid" ? attribute : null) };
    return { formContext, attribute, executionContext: { getFormContext: () => formContext } };
}

const ACCOUNT_ID = "00aa00aa-bb11-cc22-dd33-44ee44ee44ee";

// Objects built inside the vm sandbox come from another realm (a different Object prototype), so
// deepStrictEqual rejects them even when every field matches. Compare plain JSON copies instead.
const plain = (value) => JSON.parse(JSON.stringify(value));

test("pickCompany opens the picker as a centered dialog", async () => {
    const { lab, calls } = load({ dialogResult: undefined });
    await lab.pickCompany(form().formContext);
    assert.equal(calls.navigateTo.length, 1);
    assert.equal(calls.navigateTo[0].pageInput.pageType, "generative");
    assert.equal(calls.navigateTo[0].options.target, 2);
    assert.equal(calls.navigateTo[0].options.position, 1);
});

test("a valid selection sets Company Name and fires OnChange", async () => {
    const { lab } = load({ dialogResult: { returnValue: { action: "selected", accountId: ACCOUNT_ID, accountName: "Fourth Coffee" } } });
    const f = form();
    assert.equal(await lab.pickCompany(f.formContext), true);
    assert.deepEqual(plain(f.attribute.setCalls), [[{ id: ACCOUNT_ID, name: "Fourth Coffee", entityType: "account" }]]);
    assert.equal(f.attribute.onChangeFired, 1);
});

test("cancel (undefined returnValue) leaves the form alone", async () => {
    const { lab } = load({ dialogResult: { returnValue: undefined } });
    const f = form();
    assert.equal(await lab.pickCompany(f.formContext), false);
    assert.equal(f.attribute.setCalls.length, 0);
    assert.equal(f.attribute.onChangeFired, 0);
});

test("a dialog that resolves with no result object leaves the form alone", async () => {
    const { lab } = load({ dialogResult: undefined });
    const f = form();
    assert.equal(await lab.pickCompany(f.formContext), false);
    assert.equal(f.attribute.setCalls.length, 0);
});

for (const [label, returnValue] of [
    ["wrong action", { action: "cancelled", accountId: ACCOUNT_ID, accountName: "Fourth Coffee" }],
    ["missing accountName", { action: "selected", accountId: ACCOUNT_ID }],
    ["non-string accountId", { action: "selected", accountId: 42, accountName: "Fourth Coffee" }],
    ["a bare string", "selected"],
    ["null", null]
]) {
    test(`an unexpected shape (${label}) leaves the form alone`, async () => {
        const { lab } = load({ dialogResult: { returnValue } });
        const f = form();
        assert.equal(await lab.pickCompany(f.formContext), false);
        assert.equal(f.attribute.setCalls.length, 0);
    });
}

test("syncCompanyPane creates the pane once and navigates with the account, braces stripped", async () => {
    const { lab, calls } = load();
    const f = form([{ id: `{${ACCOUNT_ID}}`, name: "Fourth Coffee", entityType: "account" }]);
    assert.equal(await lab.syncCompanyPane(f.executionContext), "navigated");
    assert.equal(calls.createPane.length, 1);
    const pane = Object.values(calls.panes)[0];
    assert.deepEqual(plain(pane.navigations[0]), { pageType: "generative", pageId: "<account-summary-page-id>", entityName: "account", recordId: ACCOUNT_ID });
});

test("a second sync reuses the pane and navigates again with the new company", async () => {
    const { lab, calls } = load();
    await lab.syncCompanyPane(form([{ id: ACCOUNT_ID, name: "Fourth Coffee", entityType: "account" }]).executionContext);
    const second = "11bb11bb-cc22-dd33-ee44-55ff55ff55ff";
    await lab.syncCompanyPane(form([{ id: second, name: "Litware", entityType: "account" }]).executionContext);
    assert.equal(calls.createPane.length, 1, "createPane must not run twice");
    const pane = Object.values(calls.panes)[0];
    assert.equal(pane.navigations.length, 2);
    assert.equal(pane.navigations[1].recordId, second);
});

test("getPane returning undefined instead of null is handled the same way", async () => {
    const { lab, calls } = load({ getPaneReturnsUndefined: true });
    assert.equal(await lab.syncCompanyPane(form([{ id: ACCOUNT_ID, name: "Fourth Coffee", entityType: "account" }]).executionContext), "navigated");
    assert.equal(calls.createPane.length, 1);
});

test("a contact as the company closes the pane and navigates nowhere", async () => {
    const { lab, calls } = load();
    await lab.syncCompanyPane(form([{ id: ACCOUNT_ID, name: "Fourth Coffee", entityType: "account" }]).executionContext);
    const pane = Object.values(calls.panes)[0];
    assert.equal(await lab.syncCompanyPane(form([{ id: ACCOUNT_ID, name: "Some Person", entityType: "contact" }]).executionContext), "closed");
    assert.equal(pane.closed, true);
    assert.equal(pane.navigations.length, 1);
});

test("an empty Company Name closes the pane (and does not fail when there is none)", async () => {
    const { lab, calls } = load();
    assert.equal(await lab.syncCompanyPane(form(null).executionContext), "closed");
    assert.equal(calls.createPane.length, 0);
});
