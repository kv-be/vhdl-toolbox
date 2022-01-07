"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const language_server_1 = require("../language-server");
const objects_1 = require("../parser/objects");
async function handleReferences(params) {
    await language_server_1.initialization;
    const linter = language_server_1.linters.get(params.textDocument.uri);
    if (typeof linter === 'undefined') {
        return [];
    }
    if (typeof linter.tree === 'undefined') {
        return [];
    }
    let startI = linter.getIFromPosition(params.position);
    const candidates = linter.tree.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i);
    candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
    const candidate = candidates[0];
    if (!candidate) {
        return [];
    }
    if (candidate instanceof objects_1.OToken) {
        return linter.tree.objectList.filter(obj => obj instanceof objects_1.OToken && obj.text.toLowerCase() === candidate.text.toLowerCase() && obj !== candidate).map(obj => vscode_languageserver_1.Location.create(params.textDocument.uri, obj.range));
    }
    return [];
}
exports.handleReferences = handleReferences;
//# sourceMappingURL=references.js.map