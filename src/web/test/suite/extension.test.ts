import * as assert from 'assert';
import * as vscode from 'vscode';

async function testReflow(initialText: string, expectedText: string, selection: vscode.Selection): Promise<void>
{
	await vscode.workspace.openTextDocument({
		language: "text"
	}).then(async (doc: vscode.TextDocument) => {
		return vscode.window.showTextDocument(doc).then((editor: vscode.TextEditor) => {
			return editor.edit((editBuilder: vscode.TextEditorEdit): void => {
				editBuilder.insert(new vscode.Position(0, 0), initialText);
			}).then((success: boolean) => {
				assert.strictEqual(true, success);
				editor.selection = selection;
				return vscode.commands.executeCommand("reflow-paragraph.reflow");
			}).then(() => {
				assert.strictEqual(expectedText, doc.getText());
			});
		});
	});
	vscode.commands.executeCommand('workbench.action.closeActiveEditor');
}

suite('Web Extension Test Suite', () => {

	test('Test plain text', async function () {
		const initialText = [
			"This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
		].join("\n");
		const expectedText = [
			"This is a line of test that should get wrapped after 80 characters. Part of this",
			"sentence should move to line 2.",
		].join("\n");
		testReflow(initialText, expectedText, new vscode.Selection(0, 0, 0, 0));
	});

	test('Test plain text multi-line', async function () {
		const initialText = [
			"This is a line of test that should get",
			"wrapped after 80 characters. Part of this sentence should move to line 2.",
		].join("\n");
		const expectedText = [
			"This is a line of test that should get wrapped after 80 characters. Part of this",
			"sentence should move to line 2.",
		].join("\n");
		testReflow(initialText, expectedText, new vscode.Selection(0, 0, 0, 0));
	});

	test('Single line comment not extending to next line', async function () {
		const initialText = [
			"// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
			"	// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
		].join("\n");
		const expectedText = [
			"// This is a line of test that should get wrapped after 80 characters. Part of",
			"// this sentence should move to line 2.",
			"	// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2."
		].join("\n");
		testReflow(initialText, expectedText, new vscode.Selection(0, 0, 0, 0));
	});

	test('Single line comment not extending to previous line', async function () {
		const initialText = [
			"// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
			"	// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
		].join("\n");
		const expectedText = [
			"// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
			"	// This is a line of test that should get wrapped after 80 characters. Part of",
			"	// this sentence should move to line 2."
		].join("\n");
		testReflow(initialText, expectedText, new vscode.Selection(1, 0, 1, 0));
	});

	test('Single line comment select explicit', async function () {
		const initialText = [
			"// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
			"// This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2.",
			"// This is a line won't be selected.",
		].join("\n");
		const expectedText = [
			"// This is a line of test that should get wrapped after 80 characters. Part of",
			"// this sentence should move to line 2. This is a line of test that should get",
			"// wrapped after 80 characters. Part of",
			"// This is a line won't be selected."
		].join("\n");
		testReflow(initialText, expectedText, new vscode.Selection(1, 0, 2, 123));
	});

	test('Block comment', async function () {
		const initialText = [
			"/** This is a line of test that should get wrapped after 80 characters. Part of this sentence should move to line 2. */",
		].join("\n");
		const expectedText = [
			"/**",
			" * This is a line of test that should get wrapped after 80 characters. Part of",
			" * this sentence should move to line 2.",
			" */"
		].join("\n");
		testReflow(initialText, expectedText, new vscode.Selection(1, 0, 1, 0));
	});

	test('Block comment multiple sections', async function () {
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
		testReflow(initialText, expectedText, new vscode.Selection(2, 10, 2, 10));
	});

	// Close editors
	vscode.commands.executeCommand('workbench.action.closeAllEditors');
});
