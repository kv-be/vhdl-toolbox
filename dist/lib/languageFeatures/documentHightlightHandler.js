"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const language_server_1 = require("../language-server");
const objects_1 = require("../parser/objects");
async function documentHighlightHandler(params) {
    var _a, _b;
    await language_server_1.initialization;
    const linter = language_server_1.linters.get(params.textDocument.uri);
    if (!linter) {
        return null;
    }
    let startI = linter.getIFromPosition(params.position);
    const candidates = (_b = (_a = linter.tree) === null || _a === void 0 ? void 0 : _a.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i)) !== null && _b !== void 0 ? _b : [];
    candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
    const candidate = candidates[0];
    if (!candidate || !(candidate instanceof objects_1.OToken)) {
        return null;
    }
    return linter.tree.objectList.filter(object => object instanceof objects_1.OToken && object.text.toLowerCase() === candidate.text.toLowerCase())
        .map(object => ({
        range: object.range,
        kind: object instanceof objects_1.OWrite ? vscode_languageserver_1.DocumentHighlightKind.Write : vscode_languageserver_1.DocumentHighlightKind.Read
    }));
}
exports.documentHighlightHandler = documentHighlightHandler;
//# sourceMappingURL=documentHightlightHandler.js.map