"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const language_server_1 = require("../language-server");
const objects_1 = require("../parser/objects");
async function handleCompletion(params) {
    await language_server_1.initialization;
    const completions = [];
    const document = language_server_1.documents.get(params.textDocument.uri);
    if (document) {
        const range = vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(params.position.line, 0), vscode_languageserver_1.Position.create(params.position.line + 1, 0));
        const line = document.getText(range);
        let match = line.match(/^(\s*)-*\s*(.*)/);
        if (match) {
            completions.push({
                label: "Block comment",
                commitCharacters: ['-'],
                insertText: '-'.repeat(80 - match[1].length) + '\n-- ' + match[2] + '${1}\n' + '-'.repeat(80 - match[1].length),
                insertTextFormat: vscode_languageserver_1.InsertTextFormat.Snippet,
                preselect: true,
                kind: vscode_languageserver_1.CompletionItemKind.Snippet
            });
        }
    }
    const linter = language_server_1.linters.get(params.textDocument.uri);
    if (typeof linter === 'undefined') {
        return completions;
    }
    if (typeof linter.tree === 'undefined') {
        return completions;
    }
    if (document) {
        const line = document.getText(vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(params.position.line, 0), vscode_languageserver_1.Position.create(params.position.line + 1, 0)));
        const match = line.match(/^\s*use\s+/i);
        if (match) {
            for (const pkg of language_server_1.projectParser.getPackages()) {
                completions.push({ label: pkg.name });
                pkg.library && completions.push({ label: pkg.library });
            }
        }
        completions.push({ label: 'all' });
        completions.push({ label: 'work' });
    }
    let startI = linter.getIFromPosition(params.position);
    const candidates = linter.tree.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i);
    candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
    const obj = candidates[0];
    if (!obj) {
        return completions;
    }
    let parent = obj.parent;
    let counter = 100;
    while ((parent instanceof objects_1.OFile) === false) {
        // console.log(parent instanceof OFile, parent);
        if (parent instanceof objects_1.OArchitecture) {
            for (const signal of parent.signals) {
                completions.push({ label: signal.name.text, kind: vscode_languageserver_1.CompletionItemKind.Variable });
            }
            for (const type of parent.types) {
                completions.push({ label: type.name.text, kind: vscode_languageserver_1.CompletionItemKind.TypeParameter });
                if (type instanceof objects_1.OEnum) {
                    completions.push(...type.states.map(state => {
                        return {
                            label: state.name.text,
                            kind: vscode_languageserver_1.CompletionItemKind.EnumMember
                        };
                    }));
                }
            }
        }
        parent = parent.parent;
        counter--;
        if (counter === 0) {
            //        console.log(parent, parent.parent);
            throw new Error('Infinite Loop?');
        }
    }
    if (parent instanceof objects_1.OFileWithEntity) {
        for (const port of parent.entity.ports) {
            completions.push({ label: port.name.text, kind: vscode_languageserver_1.CompletionItemKind.Field });
        }
        for (const port of parent.entity.generics) {
            completions.push({ label: port.name.text, kind: vscode_languageserver_1.CompletionItemKind.Constant });
        }
    }
    for (const pkg of linter.packages) {
        const ieee = pkg.parent.file.match(/ieee/i) !== null;
        for (const obj of pkg.getRoot().objectList) {
            if (obj.name) {
                const text = obj.name instanceof objects_1.OName ? obj.name.text : obj.name;
                completions.push({
                    label: ieee ? text.toLowerCase() : text,
                    kind: vscode_languageserver_1.CompletionItemKind.Text
                });
            }
        }
    }
    const completionsUnique = completions.filter((completion, completionI) => completions.slice(0, completionI).findIndex(completionFind => completion.label.toLowerCase() === completionFind.label.toLowerCase()) === -1);
    return completionsUnique;
}
exports.handleCompletion = handleCompletion;
//# sourceMappingURL=completion.js.map