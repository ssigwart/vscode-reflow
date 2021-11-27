import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext)
{
	context.subscriptions.push(getReflowCommand());
}

export function deactivate() {}

/**
 * Get prefix length after replacing tabs
 *
 * @param {string} prefix Prefix
 * @param {number} tabSize Tab size
 *
 * @return {number} Length
 */
function getPrefixLength(prefix: string, tabSize: number): number
{
	let rtn = prefix.length;
	let pos = 0;
	while ((pos = prefix.indexOf("\t", pos)) !== -1)
	{
		pos++;
		rtn += tabSize - 1;
	}
	return rtn;
}

/**
 * Get reflow command
 *
 * @return {vscode.Disposable}
 */
function getReflowCommand(): vscode.Disposable
{
	return vscode.commands.registerCommand('reflow-paragraph.reflow', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor !== undefined)
		{
			const doc = editor.document;
			// Check for selection
			let selection = editor.selection;
			if (selection.isEmpty)
			{
				let line = selection.start.line;
				let docLine = doc.lineAt(line);
				selection = new vscode.Selection(line, 0, line, docLine.range.end.character);

				// Should we extend backwards and forwards?
				if (!/\s*\/[*].*[*]\//.test(docLine.text))
				{
					let extendingPrefixMatch = /\s*([*]|\/\/)?\s*/.exec(docLine.text);
					if (extendingPrefixMatch !== null)
					{
						const extendingPrefix = extendingPrefixMatch[0];
						let acceptLine = function(line: number) {
							const docLine = doc.lineAt(line);
							return !docLine.isEmptyOrWhitespace && docLine.text.startsWith(extendingPrefix);
						};
						// Go back
						for (let backLine = line - 1; backLine > 0 && acceptLine(backLine); backLine--)
							selection = new vscode.Selection(backLine, 0, line, docLine.range.end.character);
						// Go forwards
						for (let nextLine = line + 1; nextLine < doc.lineCount && acceptLine(nextLine); nextLine++)
							selection = new vscode.Selection(selection.start.line, 0, nextLine, doc.lineAt(nextLine).range.end.character);
					}
				}
			}
			else
			{
				// Make sure we're looking at full lines
				const endChar = doc.lineAt(selection.end.line).range.end.character;
				if (selection.start.character !== 0 || selection.end.character !== endChar)
					selection = new vscode.Selection(selection.start.line, 0, selection.end.line, endChar);
			}

			// Get text
			let text = doc.getText(selection);

			// Reformat single line block statements
			let finalTextPrefix = "";
			let finalTextSuffix = "";
			if (selection.isSingleLine)
			{
				const match = /^(\s*)(\/[*]{1,2})\s+(.*)\s+([*]+\/)$/.exec(text);
				if (match)
				{
					const indent = match[1];
					text = indent + " * " + match[3];
					finalTextPrefix = indent + match[2] + "\n";
					finalTextSuffix = "\n" + indent + " " + match[4];
				}
			}

			// Check for initial text
			let initialTextMatch = /^\s*(\/[*\/]|\*)/.exec(text);
			if (initialTextMatch === null)
				initialTextMatch = /^\s+/.exec(text);
			let prefix = "";
			if (initialTextMatch !== null)
			{
				prefix = initialTextMatch[0];
				if (!/\s$/.test(prefix))
					prefix += " ";
			}
			let startPos = prefix.length;
			const tabSize = <number>(editor.options.tabSize ?? 4);
			const prefixLength = getPrefixLength(prefix, tabSize);

			// Replace leading prefixes on lines
			if (prefix !== "")
			{
				if (/^\s*\/?\*/.test(prefix))
					text = prefix + text.substring(prefix.length).replace(/^\s*[*]\s/mg, '');
				else if (/^\s*\/\//.test(prefix))
					text = prefix + text.substring(prefix.length).replace(/^\s*\/\/\s/mg, '');
			}

			// Build new text
			let newText = prefix;
			let allowedLen = 80 - prefixLength;
			let remainingLen = allowedLen;
			let words = text.substring(startPos).split(/\s+/);
			for (const word of words)
			{
				const wordLen = word.length;
				if (allowedLen === remainingLen)
				{
					newText += word;
					remainingLen -= wordLen;
				}
				else if (wordLen <= remainingLen)
				{
					newText += " " + word;
					remainingLen -= wordLen + 1;
				}
				else
				{
					newText += "\n" + prefix + word;
					remainingLen = allowedLen - prefixLength - wordLen;
				}
			}

			editor.edit((editBuilder: vscode.TextEditorEdit): void => {
				editBuilder.replace(selection, finalTextPrefix + newText + finalTextSuffix);
			});
		}
	});
}
