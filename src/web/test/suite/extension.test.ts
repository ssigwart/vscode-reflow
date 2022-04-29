import * as assert from 'assert';
import * as vscode from 'vscode';

let uriChangeResolvers: Map<vscode.Uri, () => any> = new Map();

async function testReflow(initialText: string, expectedText: string, selection: vscode.Selection): Promise<void>
{
	await vscode.workspace.openTextDocument({
		language: "text",
		content: initialText
	}).then(async (doc: vscode.TextDocument) => {
		let changedPromise = new Promise((resolve: (value: any) => any) => {
			uriChangeResolvers.set(doc.uri, function() { resolve(true); });
		});
		return vscode.window.showTextDocument(doc).then((editor: vscode.TextEditor) => {
			editor.options.tabSize = 2;
			editor.selection = selection;
			return vscode.commands.executeCommand("reflow-paragraph.reflow");
		}).then(() => {
			return changedPromise;
		}).then(() => {
			assert.strictEqual(doc.getText(), expectedText);
		});
	});
	await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
}

suite('Web Extension Test Suite', () => {
	const disposable = vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent): void => {
		const func = uriChangeResolvers.get(e.document.uri);
		if (func !== undefined)
			func.apply(this);
	});

	test('Test plain text', async function () {
		this.timeout(3000);
		const initialText = [
			"This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
		].join("\n");
		const expectedText = [
			"This is a line of test that should get wrapped after 80 characters. Part of this",
			"sentence should move to line 2.",
		].join("\n");
		await testReflow(initialText, expectedText, new vscode.Selection(0, 0, 0, 0));
	});

	test('Test plain text multi-line', async function () {
		this.timeout(3000);
		const initialText = [
			"This is a line of test that should get",
			"wrapped after 80 characters. Part of this sentence should move to line 2.",
		].join("\n");
		const expectedText = [
			"This is a line of test that should get wrapped after 80 characters. Part of this",
			"sentence should move to line 2.",
		].join("\n");
		await testReflow(initialText, expectedText, new vscode.Selection(0, 0, 0, 0));
	});

	test('Single line comment not extending to next line', async function () {
		this.timeout(3000);
		const initialText = [
			"// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
			"	// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
		].join("\n");
		const expectedText = [
			"// This is a line of test that should get wrapped after 80 characters. Part of",
			"// this sentence should move to line 2.",
			"	// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2."
		].join("\n");
		await testReflow(initialText, expectedText, new vscode.Selection(0, 0, 0, 0));
	});

	test('Single line comment not extending to previous line', async function () {
		this.timeout(3000);
		const initialText = [
			"// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
			"	// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
		].join("\n");
		const expectedText = [
			"// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
			"	// This is a line of test that should get wrapped after 80 characters. Part of",
			"	// this sentence should move to line 2."
		].join("\n");
		await testReflow(initialText, expectedText, new vscode.Selection(1, 0, 1, 0));
	});

	test('Single line comment select explicit', async function () {
		this.timeout(3000);
		const initialText = [
			"// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
			"// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
			"// This is a line won't be selected.",
		].join("\n");
		const expectedText = [
			"// This is a line of test that should get wrapped after 80 characters. Part of",
			"// this sentence should move to line 2. This is a line of test that should get",
			"// wrapped after 80 characters. Part of this sentence should move to line 2.",
			"// This is a line won't be selected."
		].join("\n");
		await testReflow(initialText, expectedText, new vscode.Selection(0, 0, 1, 115));
	});

	test('Block comment', async function () {
		this.timeout(3000);
		const initialText = [
			"/** This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2. */",
			"class A"
		].join("\n");
		const expectedText = [
			"/**",
			" * This is a line of test that should get wrapped after 80 characters. Part of",
			" * this sentence should move to line 2.",
			" */",
			"class A"
		].join("\n");
		await testReflow(initialText, expectedText, new vscode.Selection(0, 0, 0, 0));
	});

	test('Block comment multiple sections', async function () {
		this.timeout(3000);
		const initialText = [
			"	/**",
			"	 * This is a line of test that",
			"	 * should get wrapped after 80 characters. Part of this sentence should move to line 2.",
			"	 *",
			"	 * This is a line of test that",
			"	 * should get wrapped after 80 characters. Part of this sentence should move to line 2.",
			"	 */"
		].join("\n");
		const expectedText = [
			"	/**",
			"	 * This is a line of test that should get wrapped after 80 characters. Part of",
			"	 * this sentence should move to line 2.",
			"	 *",
			"	 * This is a line of test that",
			"	 * should get wrapped after 80 characters. Part of this sentence should move to line 2.",
			"	 */"
		].join("\n");
		await testReflow(initialText, expectedText, new vscode.Selection(2, 10, 2, 10));
	});

	test('Issue #1: Line 1', async function () {
		this.timeout(3000);
		const initialText = [
			"// test1",
			"//test2",
			"// test3",
			"// test4"
		].join("\n");
		const expectedText = [
			"// test1",
			"//test2",
			"// test3",
			"// test4"
		].join("\n");
		await testReflow(initialText, expectedText, new vscode.Selection(0, 0, 0, 0));
	});
	test('Issue #1: Line 2', async function () {
		this.timeout(3000);
		const initialText = [
			"// test1",
			"//test2",
			"// test3",
			"// test4"
		].join("\n");
		const expectedText = [
			"// test1",
			"// test2 test3 test4"
		].join("\n");
		await testReflow(initialText, expectedText, new vscode.Selection(1, 0, 1, 0));
	});
	test('Issue #1: Line 2 selected', async function () {
		this.timeout(3000);
		const initialText = [
			"// test1",
			"//test2",
			"// test3",
			"// test4"
		].join("\n");
		const expectedText = [
			"// test1",
			"// test2",
			"// test3",
			"// test4"
		].join("\n");
		await testReflow(initialText, expectedText, new vscode.Selection(1, 0, 1, 6));
	});
	test('Issue #1: Line 3', async function () {
		this.timeout(3000);
		const initialText = [
			"// test1",
			"//test2",
			"// test3",
			"// test4"
		].join("\n");
		const expectedText = [
			"// test1",
			"//test2",
			"// test3 test4"
		].join("\n");
		await testReflow(initialText, expectedText, new vscode.Selection(2, 0, 2, 0));
	});
	test('Issue #1: Lines 1 - 4 selected', async function () {
		this.timeout(3000);
		const initialText = [
			"// test1",
			"//test2",
			"// test3",
			"// test4"
		].join("\n");
		const expectedText = [
			"// test1 test2 test3 test4"
		].join("\n");
		await testReflow(initialText, expectedText, new vscode.Selection(0, 0, 3, 6));
	});

	// Close editors
	vscode.commands.executeCommand('workbench.action.closeAllEditors');
});
