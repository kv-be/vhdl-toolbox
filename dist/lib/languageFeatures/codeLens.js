"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const language_server_1 = require("../language-server");
async function handleCodeLens(params) {
    await language_server_1.initialization;
    const linter = language_server_1.linters.get(params.textDocument.uri);
    if (typeof linter === 'undefined') {
        return [];
    }
    if (typeof linter.tree === 'undefined') {
        return [];
    }
    return linter.getCodeLens(params.textDocument.uri);
}
exports.handleCodeLens = handleCodeLens;
//# sourceMappingURL=codeLens.js.map