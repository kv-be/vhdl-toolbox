"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const language_server_1 = require("../language-server");
async function handleExecuteCommand(params) {
    await language_server_1.initialization;
    if (!params.arguments) {
        return;
    }
    //console.log(params);
    const textDocumentUri = params.arguments[0];
    const linter = language_server_1.linters.get(textDocumentUri);
    if (typeof linter === 'undefined') {
        return;
    }
    const callback = linter.commandCallbackRegistry[parseInt(params.arguments[1], 10)];
    const edits = [];
    if (typeof callback === 'function') {
        edits.push(...callback(textDocumentUri));
    }
    const document = language_server_1.documents.get(textDocumentUri);
    if (!document) {
        return;
    }
    await language_server_1.connection.workspace.applyEdit({
        edit: {
            changes: {
                [textDocumentUri]: edits
            }
        }
    });
}
exports.handleExecuteCommand = handleExecuteCommand;
//# sourceMappingURL=executeCommand.js.map